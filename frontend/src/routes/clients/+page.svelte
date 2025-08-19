<script lang="ts">
  import { clientsApi, jobsApi, workplacesApi, cessionsApi } from '$lib/api';
  import { onMount, onDestroy, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { showAlert } from '$lib/stores';
  import { clientsLoading, clientsLoadingManager } from '$lib/stores/pageLoading';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { t, currentLanguage } from '$lib/i18n';
  import { browser } from '$app/environment';

  // Cleanup timeouts and intervals on component destroy
  onDestroy(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    if (analyticsTimeout) clearTimeout(analyticsTimeout);
    if (refreshInterval) clearInterval(refreshInterval);
  });

  // Core data
  let clients = [];
  let filteredClients = [];
  let jobs = [];
  let jobsMap = {};
  let workplaces = [];
  let workplacesMap = {};
  let cessions = [];
  let cessionsByClient = {};

  // Search state - simplified and stable
  let searchQuery = '';
  let searchCIN = '';
  let searchWorkerNumber = '';
  let searchClientNumber = '';
  let isSearchVisible = false;

  // UI state
  let selectedClient = null;
  let isClientDetailsVisible = false;
  let viewMode = 'grid'; // grid, list, analytics
  let jobDetails = null;
  let workplaceDetails = null;

  // Analytics state
  let analyticsView = 'overview'; // overview, demographics, workplace, activity, trends
  let timeRange = 'month'; // week, month, quarter, year
  let analytics = {
    totalClients: 0,
    activeClients: 0,
    newClientsThisMonth: 0,
    clientGrowthRate: 0,
    avgCessionsPerClient: 0,
    topWorkplace: null,
    completionRate: 0,
    retentionRate: 0
  };

  // Analytics data
  let clientCreationTrends = [];
  let jobDistribution = [];
  let workplaceDistribution = [];
  let phoneAvailability = { withPhone: 0, withoutPhone: 0 };
  let showAllJobCategories = false; // State for showing all job categories
  let dataQualityMetrics = {
    duplicateCINs: [],
    duplicateWorkerNumbers: [],
    missingData: { phone: 0, email: 0, address: 0 }
  };
  let geographicalDistribution = [];
  let clientActivityMetrics = [];
  let predictiveInsights = [];
  let clientSegments = [];

  // Performance optimization
  let isLoadingClients = false;
  let lastClientsLoadTime = 0;
  let stableClients = [];
  const CLIENTS_CACHE_DURATION = 300000; // 5 minutes

  // Search optimization with proper debouncing
  let searchTimeout;
  let analyticsTimeout;
  let refreshInterval;
  let isSearching = false;
  let searchId = 0; // Prevent race conditions
  let hasSearchQuery = false; // Track if we have active search
  
  // Filters
  let filters = {
    sortBy: 'fullName',
    sortOrder: 'asc'
  };

  // Cleanup function
  function cleanup() {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }
  }

  onMount(async () => {
    try {
      await Promise.all([
        loadClients(),
        loadJobs(),
        loadWorkplaces(),
        loadCessions()
      ]);
      computeClientExtras();
      generateClientAnalytics();
      await tick();
    } catch (error) {
      console.error('Error during mount:', error);
      showAlert('Failed to load data', 'error');
    }
  });

  onDestroy(() => {
    cleanup();
  });

  // Handle keyboard events for modal
  function handleKeydown(event) {
    if (event.key === 'Escape' && isClientDetailsVisible) {
      event.preventDefault();
      closeClientDetails();
    }
  }

  // Stable loading with anti-flickering system
  async function loadClients(forceRefresh = false) {
    const now = Date.now();
    
    if (isLoadingClients) return;
    
    if (!forceRefresh && clients.length > 0 && (now - lastClientsLoadTime) < CLIENTS_CACHE_DURATION) {
      performSearch();
      return;
    }

    isLoadingClients = true;
    if (clients.length === 0) {
      clientsLoadingManager.start();
    }
    
    try {
      const response = await clientsApi.getAll();
      if (response && Array.isArray(response)) {
        const dataChanged = JSON.stringify(response) !== JSON.stringify(clients);
        if (dataChanged) {
          clients = response;
          stableClients = [...response];
          lastClientsLoadTime = now;
          performSearch();
        }
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      if (clients.length === 0) {
        showAlert(error.message || 'Failed to load clients', 'error');
      }
    } finally {
      clientsLoadingManager.stop();
      isLoadingClients = false;
    }
  }

  async function loadWorkplaces() {
    try {
      workplaces = await workplacesApi.getAll();
      workplacesMap = {};
      for (const w of workplaces) {
        workplacesMap[w.id] = w.name;
      }
    } catch (error) {
      console.error('Error loading workplaces:', error);
    }
  }

  async function loadJobs() {
    try {
      jobs = await jobsApi.getAll();
      jobsMap = {};
      for (const j of jobs) {
        jobsMap[j.id] = j.name || j.title || `Job ${j.id}`;
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  }

  async function loadCessions() {
    try {
      cessions = await cessionsApi.getAll();
      cessionsByClient = {};
      for (const cession of cessions) {
        const cid = cession.clientId?.toString();
        if (!cessionsByClient[cid]) {
          cessionsByClient[cid] = [];
        }
        cessionsByClient[cid].push(cession);
      }
    } catch (error) {
      console.error('Error loading cessions:', error);
    }
  }

  function computeClientExtras() {
    try {
      const updatedClients = clients.map(client => ({
        ...client,
        workplaceName: client.workplaceId ? workplacesMap[client.workplaceId] || 'N/A' : 'N/A'
      }));
      clients = updatedClients;
      performSearch();
    } catch (error) {
      console.error('Error computing client extras:', error);
    }
  }

  // FIXED: Instant search for better UX
  function handleSearchInput() {
    cleanup(); // Clear any existing timeout
    
    const currentSearchId = ++searchId;
    
    // For search operations, use shorter debounce for instant feel
    searchTimeout = setTimeout(() => {
      if (currentSearchId === searchId) { // Prevent race conditions
        performSearch();
      }
    }, 150); // Shorter delay for instant search feel
  }

  // FIXED: Optimized search function with instant results
  function performSearch() {
    try {
      isSearching = true;
      
      // Check if we have any search terms
      const hasQuery = searchQuery || searchCIN || searchWorkerNumber || searchClientNumber;
      hasSearchQuery = hasQuery;
      
      // Early return for no filters
      if (!hasQuery) {
        filteredClients = [...clients];
        applySorting();
        isSearching = false;
        return;
      }

      // Normalize search terms once
      const normalizedQuery = searchQuery.toLowerCase().trim();
      const normalizedCIN = searchCIN.trim();
      const normalizedWorkerNumber = searchWorkerNumber.trim();
      const normalizedClientNumber = searchClientNumber.trim();

      // Efficient filtering with priority scoring for better UX
      const results = clients.filter(client => {
        try {
          // Name search
          if (normalizedQuery && !client.fullName?.toLowerCase().includes(normalizedQuery)) {
            return false;
          }

          // CIN search - exact match for better performance
          if (normalizedCIN && !client.cin?.toString().includes(normalizedCIN)) {
            return false;
          }

          // Worker number search
          if (normalizedWorkerNumber && !client.workerNumber?.toString().includes(normalizedWorkerNumber)) {
            return false;
          }

          // Client number search
          if (normalizedClientNumber && !client.clientNumber?.toString().includes(normalizedClientNumber)) {
            return false;
          }

          return true;
        } catch (error) {
          console.error('Error filtering client:', client, error);
          return false; // Exclude problematic clients
        }
      }).map(client => {
        // Add priority score for better ordering
        let priority = 0;
        
        // Exact matches get highest priority
        if (normalizedCIN && client.cin?.toString() === normalizedCIN) priority += 1000;
        if (normalizedWorkerNumber && client.workerNumber?.toString() === normalizedWorkerNumber) priority += 1000;
        if (normalizedClientNumber && client.clientNumber?.toString() === normalizedClientNumber) priority += 1000;
        
        // Starts with matches get medium priority
        if (normalizedQuery && client.fullName?.toLowerCase().startsWith(normalizedQuery)) priority += 100;
        if (normalizedCIN && client.cin?.toString().startsWith(normalizedCIN)) priority += 100;
        
        return { ...client, _priority: priority };
      });

      // Sort by priority first, then by regular sorting
      if (results.length > 0) {
        results.sort((a, b) => {
          try {
            // First sort by priority (higher priority first)
            if (a._priority !== b._priority) {
              return b._priority - a._priority;
            }
            
            // Then by regular sorting criteria
            if (filters.sortBy) {
              const aValue = a[filters.sortBy]?.toString().toLowerCase() || '';
              const bValue = b[filters.sortBy]?.toString().toLowerCase() || '';
              
              const comparison = aValue.localeCompare(bValue, undefined, { numeric: true });
              return filters.sortOrder === 'asc' ? comparison : -comparison;
            }
            
            return 0;
          } catch (error) {
            console.error('Sorting error:', error);
            return 0;
          }
        });
      }

      // Remove priority field and update filtered clients instantly
      filteredClients = results.map(({ _priority, ...client }) => client);
      
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to show all clients
      filteredClients = [...clients];
    } finally {
      isSearching = false;
    }
  }

  // FIXED: Separate sorting function for better performance
  function applySorting() {
    try {
      if (!filters.sortBy || !filteredClients.length) return;

      filteredClients.sort((a, b) => {
        try {
          const aValue = a[filters.sortBy]?.toString().toLowerCase() || '';
          const bValue = b[filters.sortBy]?.toString().toLowerCase() || '';
          
          const comparison = aValue.localeCompare(bValue, undefined, { numeric: true });
          return filters.sortOrder === 'asc' ? comparison : -comparison;
        } catch (error) {
          console.error('Sorting error:', error);
          return 0;
        }
      });
    } catch (error) {
      console.error('Apply sorting error:', error);
    }
  }

  // FIXED: Simplified toggle functions
  function toggleSearch() {
    isSearchVisible = !isSearchVisible;
    if (!isSearchVisible) {
      clearAllFilters();
    }
  }

  function toggleViewMode() {
    if (viewMode === 'grid') {
      viewMode = 'list';
    } else if (viewMode === 'list') {
      viewMode = 'analytics';
    } else {
      viewMode = 'grid';
    }
  }

  // FIXED: Clear all filters function
  function clearAllFilters() {
    cleanup(); // Clear any pending searches
    
    searchQuery = '';
    searchCIN = '';
    searchWorkerNumber = '';
    searchClientNumber = '';
    hasSearchQuery = false;
    
    // Immediate update without debounce
    filteredClients = [...clients];
    applySorting();
  }

  // Client details functions with improved error handling
  let isLoadingClientDetails = false;
  
  async function showClientDetails(client) {
    if (!client || !client.id) {
      showAlert('Invalid client data', 'error');
      return;
    }

    // Prevent multiple modal openings
    if (isLoadingClientDetails || isClientDetailsVisible) {
      return;
    }

    isLoadingClientDetails = true;

    try {
      const freshClient = await clientsApi.getById(client.id);
      if (!freshClient || !freshClient.success) {
        throw new Error('Client not found');
      }

      selectedClient = freshClient.data;
      isClientDetailsVisible = true;

      // Load additional details in parallel
      const detailPromises = [];
      
      if (freshClient.data.jobId) {
        detailPromises.push(
          jobsApi.getAll()
            .then(jobs => {
              jobDetails = jobs.find(job => job.id === freshClient.data.jobId);
            })
            .catch(error => {
              console.error('Error loading job details:', error);
              jobDetails = null;
            })
        );
      }

      if (freshClient.data.workplaceId) {
        detailPromises.push(
          workplacesApi.getAll()
            .then(workplaces => {
              workplaceDetails = workplaces.find(workplace => workplace.id === freshClient.data.workplaceId);
            })
            .catch(error => {
              console.error('Error loading workplace details:', error);
              workplaceDetails = null;
            })
        );
      }

      // Wait for all detail loading to complete
      if (detailPromises.length > 0) {
        await Promise.allSettled(detailPromises);
      }

    } catch (error) {
      console.error('Error loading client details:', error);
      showAlert('Failed to load client details', 'error');
      
      // Reset modal state on error
      isClientDetailsVisible = false;
      selectedClient = null;
    } finally {
      isLoadingClientDetails = false;
    }
  }

  function closeClientDetails() {
    try {
      isClientDetailsVisible = false;
      selectedClient = null;
      jobDetails = null;
      workplaceDetails = null;
      isLoadingClientDetails = false;
    } catch (error) {
      console.error('Error closing client details:', error);
      // Force close the modal even if there's an error
      isClientDetailsVisible = false;
      selectedClient = null;
      isLoadingClientDetails = false;
    }
  }

  async function viewFullDetails(clientId) {
    if (!clientId) {
      showAlert('Invalid client ID', 'error');
      return;
    }
    
    try {
      // Close modal first to prevent UI freezing
      closeClientDetails();
      
      // Add a small delay to ensure modal closes properly
      await tick();
      
      // Navigate to client details
      await goto(`/clients/${clientId}`);
    } catch (error) {
      console.error('Error navigating to client details:', error);
      showAlert('Failed to navigate to client details', 'error');
      
      // Fallback navigation
      if (browser) {
        try {
          window.location.href = `/clients/${clientId}`;
        } catch (fallbackError) {
          console.error('Fallback navigation failed:', fallbackError);
        }
      }
    }
  }

  async function createCession(clientId) {
    if (!clientId) {
      showAlert('Invalid client ID', 'error');
      return;
    }
    
    try {
      // Close modal first to prevent UI freezing
      closeClientDetails();
      
      // Add a small delay to ensure modal closes properly
      await tick();
      
      // Navigate to cession creation
      await goto(`/cessions/new?clientId=${clientId}`);
    } catch (error) {
      console.error('Error navigating to cession creation:', error);
      showAlert('Failed to navigate to cession creation', 'error');
      
      // Fallback navigation
      if (browser) {
        try {
          window.location.href = `/cessions/new?clientId=${clientId}`;
        } catch (fallbackError) {
          console.error('Fallback navigation failed:', fallbackError);
        }
      }
    }
  }

  // Utility functions
  function formatClientNumber(number) {
    return `#${number}`;
  }

  function formatClientCount(count) {
    if (count === 0) {
      return $t('clients.count.zero');
    } else if (count === 1) {
      return $t('clients.count.one', { count });
    } else {
      return $t('clients.count.other', { count });
    }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  function hasActiveCessions(clientId) {
    const clientCessions = cessionsByClient[clientId?.toString()];
    if (!clientCessions || clientCessions.length === 0) {
      return false;
    }
    return clientCessions.some(cession => {
      const status = cession.status?.toLowerCase();
      return status === 'active' || status === 'pending' || !status;
    });
  }

  // RTL support
  $: isRTL = $currentLanguage === 'ar';

  // OPTIMIZED: Use debounced reactive statements to prevent excessive re-rendering
  let lastClientsHash = '';
  let analyticsCache = null;
  let analyticsCacheTime = 0;
  const ANALYTICS_CACHE_DURATION = 30000; // 30 seconds

  $: {
    // Only trigger when clients data actually changes (not just length)
    const currentHash = JSON.stringify(clients.map(c => c.id + c.updatedAt)).slice(0, 100);
    if (currentHash !== lastClientsHash && clients.length > 0) {
      lastClientsHash = currentHash;
      // Debounce the expensive operations
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        performSearch();
        generateClientAnalyticsOptimized();
      }, 300);
    }
  }

  // 📊 OPTIMIZED: Generate Comprehensive Client Analytics with Caching
  function generateClientAnalyticsOptimized() {
    if (!clients.length) return;

    // Check cache first
    const now = Date.now();
    if (analyticsCache && (now - analyticsCacheTime) < ANALYTICS_CACHE_DURATION) {
      return analyticsCache;
    }

    generateClientAnalytics();
    analyticsCacheTime = now;
  }

  // 📊 Generate Comprehensive Client Analytics
  function generateClientAnalytics() {
    if (!clients.length) return;

    const now = new Date();
    
    // Basic metrics
    const totalClients = clients.length;
    const activeClients = clients.filter(client => hasActiveCessions(client.id)).length;
    
    // New clients this month
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newClientsThisMonth = clients.filter(client => {
      if (!client.createdAt) return false;
      const createdDate = new Date(client.createdAt);
      return createdDate >= currentMonth;
    }).length;

    // Growth rate calculation
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const newClientsLastMonth = clients.filter(client => {
      if (!client.createdAt) return false;
      const createdDate = new Date(client.createdAt);
      return createdDate >= lastMonth && createdDate < currentMonth;
    }).length;
    
    const clientGrowthRate = newClientsLastMonth > 0 
      ? ((newClientsThisMonth - newClientsLastMonth) / newClientsLastMonth) * 100
      : newClientsThisMonth > 0 ? 100 : 0;

    // Average cessions per client
    const totalCessions = Object.values(cessionsByClient).reduce((sum, cessions) => sum + cessions.length, 0);
    const avgCessionsPerClient = totalClients > 0 ? totalCessions / totalClients : 0;

    // Top workplace
    const workplaceCounts = {};
    clients.forEach(client => {
      const workplace = client.workplaceName || 'Unknown';
      workplaceCounts[workplace] = (workplaceCounts[workplace] || 0) + 1;
    });
    const topWorkplace = Object.entries(workplaceCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    // Completion rate (clients with finished cessions)
    const clientsWithFinishedCessions = clients.filter(client => {
      const clientCessions = cessionsByClient[client.id?.toString()] || [];
      return clientCessions.some(cession => cession.status?.toUpperCase() === 'FINISHED');
    }).length;
    const completionRate = totalClients > 0 ? (clientsWithFinishedCessions / totalClients) * 100 : 0;

    // Retention rate (clients with multiple cessions)
    const clientsWithMultipleCessions = clients.filter(client => {
      const clientCessions = cessionsByClient[client.id?.toString()] || [];
      return clientCessions.length > 1;
    }).length;
    const retentionRate = totalClients > 0 ? (clientsWithMultipleCessions / totalClients) * 100 : 0;

    analytics = {
      totalClients,
      activeClients,
      newClientsThisMonth,
      clientGrowthRate,
      avgCessionsPerClient,
      topWorkplace,
      completionRate,
      retentionRate
    };

    // Generate detailed analytics
    generateClientCreationTrends();
    generateJobDistribution();
    generateWorkplaceDistribution();
    generatePhoneAvailability();
    generateDataQualityMetrics();
    generateGeographicalDistribution();
    generateClientActivityMetrics();
    generatePredictiveInsights();
    generateClientSegments();
  }

  // 📈 Client Creation Trends - Real data only
  function generateClientCreationTrends() {
    const now = new Date();
    const trends = [];

    // Generate monthly data for the past 12 months
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      // Filter clients with actual creation dates
      const monthClients = clients.filter(client => {
        if (!client.createdAt) return false;
        const createdDate = new Date(client.createdAt);
        return createdDate >= monthDate && createdDate < nextMonthDate;
      });

      trends.push({
        month: monthDate.toLocaleString('default', { month: 'short' }),
        year: monthDate.getFullYear(),
        count: monthClients.length,
        cumulative: clients.filter(client => {
          if (!client.createdAt) return false;
          return new Date(client.createdAt) <= nextMonthDate;
        }).length
      });
    }

    clientCreationTrends = trends;
  }

  // 👥 Job Distribution - Real data only
  function generateJobDistribution() {
    const jobCounts = {};
    
    clients.forEach(client => {
      const jobId = client.jobId;
      if (jobId) {
        jobCounts[jobId] = (jobCounts[jobId] || 0) + 1;
      } else {
        // Group clients without job assignment
        jobCounts['unassigned'] = (jobCounts['unassigned'] || 0) + 1;
      }
    });

    jobDistribution = Object.entries(jobCounts).map(([jobId, count]) => ({
      jobId,
      jobName: jobId === 'unassigned' ? 'Unassigned' : (jobsMap[jobId] || 'Unknown Job'),
      count,
      percentage: (count / clients.length) * 100
    })).sort((a, b) => b.count - a.count);
  }

  // 🏢 Workplace Distribution
  function generateWorkplaceDistribution() {
    const workplaceCounts = {};
    
    clients.forEach(client => {
      const workplace = client.workplaceName || 'Unknown';
      workplaceCounts[workplace] = (workplaceCounts[workplace] || 0) + 1;
    });

    workplaceDistribution = Object.entries(workplaceCounts)
      .map(([workplace, count]) => ({
        workplace,
        count,
        percentage: (count / clients.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 workplaces
  }

  // 📱 Phone Availability - Check both phone and phoneNumber fields
  function generatePhoneAvailability() {
    const withPhone = clients.filter(client => 
      (client.phone && client.phone.trim()) || 
      (client.phoneNumber && client.phoneNumber.trim())
    ).length;
    const withoutPhone = clients.length - withPhone;

    phoneAvailability = {
      withPhone,
      withoutPhone,
      withPhonePercentage: clients.length > 0 ? (withPhone / clients.length) * 100 : 0,
      withoutPhonePercentage: clients.length > 0 ? (withoutPhone / clients.length) * 100 : 0
    };
  }

  // ⚠️ Data Quality Metrics
  function generateDataQualityMetrics() {
    // Check for duplicate CINs
    const cinCounts = {};
    const duplicateCINs = [];
    
    clients.forEach(client => {
      if (client.cin) {
        cinCounts[client.cin] = (cinCounts[client.cin] || 0) + 1;
      }
    });
    
    Object.entries(cinCounts).forEach(([cin, count]) => {
      if (count > 1) {
        duplicateCINs.push({ cin, count });
      }
    });

    // Check for duplicate worker numbers
    const workerNumberCounts = {};
    const duplicateWorkerNumbers = [];
    
    clients.forEach(client => {
      if (client.workerNumber) {
        workerNumberCounts[client.workerNumber] = (workerNumberCounts[client.workerNumber] || 0) + 1;
      }
    });
    
    Object.entries(workerNumberCounts).forEach(([workerNumber, count]) => {
      if (count > 1) {
        duplicateWorkerNumbers.push({ workerNumber, count });
      }
    });

    // Missing data counts - Check both phone and phoneNumber fields
    const missingPhone = clients.filter(client => 
      (!client.phone || !client.phone.trim()) && 
      (!client.phoneNumber || !client.phoneNumber.trim())
    ).length;
    const missingEmail = clients.filter(client => !client.email || !client.email.trim()).length;
    const missingAddress = clients.filter(client => !client.address || !client.address.trim()).length;

    dataQualityMetrics = {
      duplicateCINs,
      duplicateWorkerNumbers,
      missingData: {
        phone: missingPhone,
        email: missingEmail,
        address: missingAddress
      },
      dataCompleteness: {
        phone: clients.length > 0 ? ((clients.length - missingPhone) / clients.length) * 100 : 0,
        email: clients.length > 0 ? ((clients.length - missingEmail) / clients.length) * 100 : 0,
        address: clients.length > 0 ? ((clients.length - missingAddress) / clients.length) * 100 : 0
      }
    };
  }

  // 🗺️ Geographical Distribution
  function generateGeographicalDistribution() {
    const locationCounts = {};
    
    clients.forEach(client => {
      if (client.address) {
        // Simple location extraction - you can enhance this with proper address parsing
        const location = client.address.split(',')[0]?.trim() || 'Unknown';
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      } else {
        locationCounts['Unknown'] = (locationCounts['Unknown'] || 0) + 1;
      }
    });

    geographicalDistribution = Object.entries(locationCounts)
      .map(([location, count]) => ({
        location,
        count,
        percentage: (count / clients.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 locations
  }

  // 📊 Client Activity Metrics
  function generateClientActivityMetrics() {
    const activityLevels = {
      'High Activity': 0,    // 3+ cessions
      'Medium Activity': 0,  // 2 cessions
      'Low Activity': 0,     // 1 cession
      'No Activity': 0       // 0 cessions
    };

    clients.forEach(client => {
      const clientCessions = cessionsByClient[client.id?.toString()] || [];
      const cessionCount = clientCessions.length;
      
      if (cessionCount >= 3) {
        activityLevels['High Activity']++;
      } else if (cessionCount === 2) {
        activityLevels['Medium Activity']++;
      } else if (cessionCount === 1) {
        activityLevels['Low Activity']++;
      } else {
        activityLevels['No Activity']++;
      }
    });

    clientActivityMetrics = Object.entries(activityLevels).map(([level, count]) => ({
      level,
      count,
      percentage: clients.length > 0 ? (count / clients.length) * 100 : 0
    }));
  }

  // 🔮 Predictive Insights - Based on real data only
  function generatePredictiveInsights() {
    const insights = [];

    // Only show insights if we have clients
    if (clients.length === 0) {
      predictiveInsights = insights;
      return;
    }

    // Growth trend insight (only if we have trend data)
    const recentMonths = clientCreationTrends.slice(-3); // Last 3 months
    const hasRecentData = recentMonths.some(month => month.count > 0);
    
    if (hasRecentData) {
      if (analytics.clientGrowthRate > 10) {
        insights.push({
          type: 'growth',
          title: 'Strong Client Growth',
          description: `Client base is growing at ${analytics.clientGrowthRate.toFixed(1)}% monthly. Consider scaling operations.`,
          impact: 'positive',
          confidence: 85
        });
      } else if (analytics.clientGrowthRate < -5) {
        insights.push({
          type: 'growth',
          title: 'Declining Client Acquisition',
          description: `Client growth is declining by ${Math.abs(analytics.clientGrowthRate).toFixed(1)}% monthly. Review marketing strategies.`,
          impact: 'negative',
          confidence: 80
        });
      }
    }

    // Data quality insight
    const totalDuplicates = dataQualityMetrics.duplicateCINs.length + dataQualityMetrics.duplicateWorkerNumbers.length;
    if (totalDuplicates > 0) {
      insights.push({
        type: 'data_quality',
        title: 'Data Quality Issues Detected',
        description: `Found ${totalDuplicates} duplicate records. Clean data to improve accuracy.`,
        impact: 'negative',
        confidence: 95
      });
    }

    // Retention insight (only if we have cession data)
    if (Object.keys(cessionsByClient).length > 0) {
      if (analytics.retentionRate > 60) {
        insights.push({
          type: 'retention',
          title: 'Excellent Client Retention',
          description: `${analytics.retentionRate.toFixed(1)}% of clients have multiple cessions. Strong relationship building.`,
          impact: 'positive',
          confidence: 90
        });
      } else if (analytics.retentionRate < 30) {
        insights.push({
          type: 'retention',
          title: 'Low Client Retention',
          description: `Only ${analytics.retentionRate.toFixed(1)}% of clients return. Focus on client satisfaction.`,
          impact: 'negative',
          confidence: 85
        });
      }
    }

    // Contact completeness insight (only show if significant percentage missing)
    if (phoneAvailability.withoutPhonePercentage > 50) {
      insights.push({
        type: 'contact',
        title: 'Incomplete Contact Information',
        description: `${phoneAvailability.withoutPhonePercentage.toFixed(1)}% of clients lack phone numbers. Improve data collection.`,
        impact: 'negative',
        confidence: 95
      });
    }

    // Workplace concentration insight
    if (workplaceDistribution.length > 0 && workplaceDistribution[0].percentage > 70) {
      insights.push({
        type: 'diversification',
        title: 'High Workplace Concentration',
        description: `${workplaceDistribution[0].percentage.toFixed(1)}% of clients come from ${workplaceDistribution[0].workplace}. Consider diversifying client sources.`,
        impact: 'negative',
        confidence: 80
      });
    }

    predictiveInsights = insights;
  }

  // 🎯 Client Segments
  function generateClientSegments() {
    const segments = [
      {
        name: 'VIP Clients',
        description: 'High-value clients with multiple active cessions',
        clients: clients.filter(client => {
          const clientCessions = cessionsByClient[client.id?.toString()] || [];
          const activeCessions = clientCessions.filter(c => c.status?.toUpperCase() === 'ACTIVE');
          return activeCessions.length >= 2;
        }),
        color: 'from-purple-600 to-indigo-600'
      },
      {
        name: 'Active Clients',
        description: 'Clients with current active cessions',
        clients: clients.filter(client => hasActiveCessions(client.id)),
        color: 'from-green-600 to-emerald-600'
      },
      {
        name: 'Returning Clients',
        description: 'Clients with completed cessions who may return',
        clients: clients.filter(client => {
          const clientCessions = cessionsByClient[client.id?.toString()] || [];
          return clientCessions.some(c => c.status?.toUpperCase() === 'FINISHED') && 
                 !clientCessions.some(c => c.status?.toUpperCase() === 'ACTIVE');
        }),
        color: 'from-blue-600 to-cyan-600'
      },
      {
        name: 'New Clients',
        description: 'Recently acquired clients',
        clients: clients.filter(client => {
          if (!client.createdAt) return false;
          const createdDate = new Date(client.createdAt);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return createdDate >= thirtyDaysAgo;
        }),
        color: 'from-orange-600 to-red-600'
      },
      {
        name: 'Inactive Clients',
        description: 'Clients with no recent activity',
        clients: clients.filter(client => {
          const clientCessions = cessionsByClient[client.id?.toString()] || [];
          return clientCessions.length === 0 || 
                 !clientCessions.some(c => c.status?.toUpperCase() === 'ACTIVE');
        }),
        color: 'from-gray-600 to-slate-600'
      }
    ];

    clientSegments = segments.map(segment => ({
      ...segment,
      count: segment.clients.length,
      percentage: clients.length > 0 ? (segment.clients.length / clients.length) * 100 : 0
    }));
  }
</script>

<svelte:head>
  <title>{$t('clients.title')} | {$t('common.app.title')}</title>
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" class:rtl={isRTL} dir={isRTL ? 'rtl' : 'ltr'}>
  <!-- Modern Header with Glassmorphism -->
  <div class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4" class:space-x-reverse={isRTL}>
          <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
            <div class="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {$t('clients.title')}
              </h1>
              <p class="text-sm text-gray-500 font-medium">{$t('clients.subtitle')}</p>
            </div>
          </div>
        </div>
        <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
          <!-- Quick Stats -->
          <div class="hidden md:flex items-center space-x-4 px-4 py-2 bg-white/80 rounded-xl backdrop-blur-sm shadow-sm" class:space-x-reverse={isRTL}>
            <div class="text-center">
              <div class="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">{clients.length}</div>
              <div class="text-xs text-gray-500">Total</div>
            </div>
            <div class="w-px h-8 bg-gray-300"></div>
            <div class="text-center">
              <div class="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">{filteredClients.length}</div>
              <div class="text-xs text-gray-500">Filtered</div>
            </div>
          </div>
          <!-- Add Client Button -->
          <a
            href="/clients/new"
            class="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            {$t('clients.new')}
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="max-w-7xl mx-auto px-6 py-8">
    <!-- Enhanced Search and Filters -->
    <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <!-- Search Bar -->
        <div class="flex-1 max-w-md">
          <div class="relative">
            <svg class="absolute {isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              bind:value={searchQuery}
              on:input={handleSearchInput}
              placeholder={$t('clients.search.name_placeholder')}
              class="w-full {isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
            />
            {#if isSearching}
              <div class="absolute {isRTL ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2">
                <div class="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            {:else if hasSearchQuery && filteredClients.length > 0}
              <div class="absolute {isRTL ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2">
                <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            {/if}
          </div>
        </div>
        <!-- View Toggle and Filters -->
        <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
          <!-- Advanced Search Toggle -->
          <button
            on:click={toggleSearch}
            class="px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-2 shadow-sm {isSearchVisible ? 'bg-purple-50 border-purple-200 text-purple-700' : ''}" class:space-x-reverse={isRTL}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
            </svg>
            <span>Filters</span>
          </button>
          <!-- View Mode Toggle -->
          <button
            on:click={toggleViewMode}
            class="px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-2 shadow-sm" class:space-x-reverse={isRTL}
          >
            {#if viewMode === 'grid'}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
              <span>List</span>
            {:else if viewMode === 'list'}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              <span>Analytics</span>
            {:else}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
              <span>Grid</span>
            {/if}
          </button>
        </div>
      </div>
    </div>

    <!-- Advanced Search Panel -->
    {#if isSearchVisible}
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8" transition:fly={{ y: -20, duration: 300 }}>
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Advanced Search</h3>
          <button
            on:click={toggleSearch}
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Name Search -->
          <div class="space-y-2">
            <label for="nameSearch" class="block text-sm font-medium text-gray-700">
              {$t('clients.search.name')}
            </label>
            <div class="relative">
              <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              <input
                type="text"
                id="nameSearch"
                bind:value={searchQuery}
                on:input={handleSearchInput}
                placeholder={$t('clients.search.name_placeholder')}
                class="w-full pl-10 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
              />
            </div>
          </div>
          <!-- CIN Search -->
          <div class="space-y-2">
            <label for="cinSearch" class="block text-sm font-medium text-gray-700">
              {$t('clients.search.cin')}
            </label>
            <div class="relative">
              <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
              </svg>
              <input
                type="text"
                id="cinSearch"
                bind:value={searchCIN}
                on:input={handleSearchInput}
                placeholder={$t('clients.search.cin_placeholder')}
                class="w-full pl-10 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
              />
            </div>
          </div>
          <!-- Worker Number Search -->
          <div class="space-y-2">
            <label for="workerNumberSearch" class="block text-sm font-medium text-gray-700">
              {$t('clients.search.worker_number')}
            </label>
            <div class="relative">
              <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
              </svg>
              <input
                type="text"
                id="workerNumberSearch"
                bind:value={searchWorkerNumber}
                on:input={handleSearchInput}
                placeholder={$t('clients.search.worker_number_placeholder')}
                class="w-full pl-10 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
              />
            </div>
          </div>
          <!-- Client Number Search -->
          <div class="space-y-2">
            <label for="clientNumberSearch" class="block text-sm font-medium text-gray-700">
              {$t('clients.search.client_number')}
            </label>
            <div class="relative">
              <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <input
                type="text"
                id="clientNumberSearch"
                bind:value={searchClientNumber}
                on:input={handleSearchInput}
                placeholder={$t('clients.search.client_number_placeholder')}
                class="w-full pl-10 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
              />
            </div>
          </div>
        </div>
        <!-- Search Actions -->
        <div class="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
          <div class="text-sm text-gray-500">
            {filteredClients.length} of {clients.length} clients found
          </div>
          <button
            type="button"
            on:click={clearAllFilters}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors shadow-sm"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    {/if}

    <!-- Client Grid/List Section -->
    <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
      <!-- Header with Client Count -->
      <div class="p-6 border-b border-gray-100">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Clients</h2>
          <div class="text-sm text-gray-500">
            {formatClientCount(filteredClients.length)}
          </div>
        </div>
      </div>

      <!-- Client Content -->
      {#if $clientsLoading}
        <div class="flex flex-col items-center justify-center h-96 space-y-4">
          <div class="relative">
            <div class="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
          <div class="text-center">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Loading Clients</h3>
            <p class="text-gray-600">Please wait while we fetch your client data...</p>
          </div>
        </div>
      {:else if filteredClients.length === 0}
        <div class="flex flex-col items-center justify-center h-96 space-y-4">
          <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
            <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <div class="text-center">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">No Clients Found</h3>
            <p class="text-gray-600 mb-4">
              {hasSearchQuery ? 'No clients match your search criteria.' : 'You haven\'t added any clients yet.'}
            </p>
            {#if !hasSearchQuery}
              <a
                href="/clients/new"
                class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 font-medium"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                Add Your First Client
              </a>
            {:else}
              <button
                on:click={clearAllFilters}
                class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Clear Search Filters
              </button>
            {/if}
          </div>
        </div>
      {:else if viewMode === 'analytics'}
        <!-- Analytics View -->
        <div class="p-6">
          <!-- Analytics Header -->
          <div class="flex items-center justify-between mb-8">
            <div>
              <h2 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Client Analytics</h2>
              <p class="text-gray-600 mt-1">Comprehensive insights into your client portfolio</p>
            </div>
            <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
              <!-- Analytics View Selector -->
              <select
                bind:value={analyticsView}
                class="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-medium"
              >
                <option value="overview">Overview</option>
                <option value="demographics">Demographics</option>
                <option value="workplace">Workplace Analysis</option>
                <option value="activity">Activity Metrics</option>
                <option value="trends">Growth Trends</option>
              </select>
              <!-- Time Range Selector -->
              <select
                bind:value={timeRange}
                class="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-medium"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>

          {#if analyticsView === 'overview'}
            <!-- Overview Analytics -->
            <div class="space-y-8">
              <!-- Key Metrics Cards -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-purple-100 text-sm font-medium">Total Clients</p>
                      <p class="text-3xl font-bold">{analytics.totalClients}</p>
                    </div>
                    <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div class="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-green-100 text-sm font-medium">Active Clients</p>
                      <p class="text-3xl font-bold">{analytics.activeClients}</p>
                    </div>
                    <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div class="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 text-white">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-blue-100 text-sm font-medium">New This Month</p>
                      <p class="text-3xl font-bold">{analytics.newClientsThisMonth}</p>
                    </div>
                    <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div class="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-6 text-white">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-orange-100 text-sm font-medium">Growth Rate</p>
                      <p class="text-3xl font-bold">{analytics.clientGrowthRate.toFixed(1)}%</p>
                    </div>
                    <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Three Essential Client Analytics Charts -->
              
              <!-- 1. Client Creation Trends Chart -->
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="text-lg font-semibold text-gray-900">📈 Client Creation Trends</h3>
                  <span class="text-sm text-gray-500">Number of new clients per month</span>
                </div>
                <div class="h-64 flex items-end justify-between space-x-1 bg-gradient-to-t from-gray-50 to-transparent rounded-lg p-4">
                  {#each clientCreationTrends as trend, index}
                    <div class="flex-1 flex flex-col items-center group">
                      <div 
                        class="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-700 hover:to-blue-500 shadow-sm hover:shadow-md cursor-pointer"
                        style="height: {Math.max(8, (trend.count / Math.max(...clientCreationTrends.map(t => t.count), 1)) * 180)}px"
                        title="{trend.count} new clients in {trend.month} {trend.year}"
                      ></div>
                      <div class="mt-2 text-xs text-gray-600 text-center transition-colors group-hover:text-blue-600">
                        <div class="font-medium">{trend.month}</div>
                        <div class="font-bold text-blue-600">{trend.count}</div>
                      </div>
                    </div>
                  {/each}
                </div>
                <div class="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p class="text-sm text-blue-800">
                    <span class="font-semibold">Insight:</span> Shows how fast your client base is growing month over month.
                  </p>
                </div>
              </div>

              <!-- 2. Distribution by Job Category - Pie Chart Style -->
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="text-lg font-semibold text-gray-900">📊 {$t('clients.analytics.job_distribution.title')}</h3>
                  <span class="text-sm text-gray-500">{$t('clients.analytics.job_distribution.subtitle')}</span>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <!-- Donut Chart Visualization -->
                  <div class="flex items-center justify-center">
                    <div class="relative w-48 h-48">
                      <!-- Simulated donut chart with segments -->
                      <svg class="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                        {#each jobDistribution.slice(0, 6) as job, index}
                          {@const startAngle = jobDistribution.slice(0, index).reduce((sum, j) => sum + (j.percentage * 3.6), 0)}
                          {@const endAngle = startAngle + (job.percentage * 3.6)}
                          {@const colors = ['from-purple-500 to-purple-700', 'from-blue-500 to-blue-700', 'from-green-500 to-green-700', 'from-yellow-500 to-yellow-700', 'from-red-500 to-red-700', 'from-indigo-500 to-indigo-700']}
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke="url(#gradient{index})"
                            stroke-width="12"
                            stroke-dasharray="{(job.percentage * 2.2)}"
                            stroke-dashoffset="{-startAngle * 0.62}"
                            class="transition-all duration-500 hover:stroke-width-14"
                            opacity="0.9"
                          />
                          <defs>
                            <linearGradient id="gradient{index}" gradientUnits="userSpaceOnUse">
                              <stop offset="0%" style="stop-color:{['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'][index]};stop-opacity:1" />
                              <stop offset="100%" style="stop-color:{['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#4F46E5'][index]};stop-opacity:1" />
                            </linearGradient>
                          </defs>
                        {/each}
                      </svg>
                      <div class="absolute inset-0 flex items-center justify-center">
                        <div class="text-center">
                          <div class="text-2xl font-bold text-gray-900">{clients.length}</div>
                          <div class="text-xs text-gray-600">{$t('clients.analytics.job_distribution.total_clients')}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Legend and Stats -->
                  <div class="space-y-3">
                    {#each (showAllJobCategories ? jobDistribution : jobDistribution.slice(0, 8)) as job, index}
                      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div class="flex items-center space-x-3">
                          <div class="w-4 h-4 rounded-full" style="background: {['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#06B6D4'][index % 8]};"></div>
                          <span class="font-medium text-gray-900 text-sm">{job.jobName}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                          <span class="text-sm font-bold text-gray-700">{job.count}</span>
                          <span class="text-xs text-gray-500">({job.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                    {/each}
                    {#if jobDistribution.length > 8}
                      <div class="flex justify-center pt-2">
                        <button 
                          class="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors duration-200"
                          on:click={() => showAllJobCategories = !showAllJobCategories}
                        >
                          <span>
                            {#if showAllJobCategories}
                              {$t('clients.analytics.job_distribution.show_less')}
                            {:else}
                              +{jobDistribution.length - 8} {$t('clients.analytics.job_distribution.more_categories')} - {$t('clients.analytics.job_distribution.show_more')}
                            {/if}
                          </span>
                          <svg 
                            class="w-4 h-4 transition-transform duration-200 {showAllJobCategories ? 'rotate-180' : ''}" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    {/if}
                  </div>
                </div>
                <div class="mt-4 p-3 bg-indigo-50 rounded-lg">
                  <p class="text-sm text-indigo-800">
                    <span class="font-semibold">{$t('clients.analytics.job_distribution.insight_label')}:</span> {$t('clients.analytics.job_distribution.insight')}.
                  </p>
                </div>
              </div>

              <!-- 3. Distribution by Workplace - Bar Chart -->
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="text-lg font-semibold text-gray-900">📊 Top Workplaces by Client Count</h3>
                  <span class="text-sm text-gray-500">Key partners bringing clients</span>
                </div>
                <div class="space-y-4">
                  {#each workplaceDistribution.slice(0, 10) as workplace, index}
                    <div class="relative">
                      <div class="flex items-center justify-between mb-1">
                        <div class="flex items-center space-x-3">
                          <div class="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                            {index + 1}
                          </div>
                          <span class="font-medium text-gray-900">{workplace.workplace}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                          <span class="text-sm font-bold text-gray-700">{workplace.count} clients</span>
                          <span class="text-xs text-gray-500">({workplace.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          class="bg-gradient-to-r from-emerald-500 to-teal-600 h-3 rounded-full transition-all duration-1000 ease-out shadow-sm"
                          style="width: {workplace.percentage}%"
                        ></div>
                      </div>
                    </div>
                  {/each}
                </div>
                <div class="mt-6 grid grid-cols-3 gap-4">
                  <div class="text-center p-3 bg-emerald-50 rounded-lg">
                    <div class="text-lg font-bold text-emerald-700">{workplaceDistribution.length}</div>
                    <div class="text-xs text-emerald-600">Total Workplaces</div>
                  </div>
                  <div class="text-center p-3 bg-emerald-50 rounded-lg">
                    <div class="text-lg font-bold text-emerald-700">{analytics.topWorkplace || 'N/A'}</div>
                    <div class="text-xs text-emerald-600">Top Partner</div>
                  </div>
                  <div class="text-center p-3 bg-emerald-50 rounded-lg">
                    <div class="text-lg font-bold text-emerald-700">{workplaceDistribution[0]?.percentage.toFixed(1) || 0}%</div>
                    <div class="text-xs text-emerald-600">Market Share</div>
                  </div>
                </div>
                <div class="mt-4 p-3 bg-emerald-50 rounded-lg">
                  <p class="text-sm text-emerald-800">
                    <span class="font-semibold">Insight:</span> Identify key partners/companies bringing you clients to strengthen relationships.
                  </p>
                </div>
              </div>

              <!-- Client Segments -->
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">Client Segments</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {#each clientSegments as segment}
                    <div class="bg-gradient-to-r {segment.color} rounded-xl p-4 text-white">
                      <div class="flex items-center justify-between mb-2">
                        <h4 class="font-semibold">{segment.name}</h4>
                        <span class="text-2xl font-bold">{segment.count}</span>
                      </div>
                      <p class="text-sm opacity-90 mb-2">{segment.description}</p>
                      <div class="text-sm font-medium">{segment.percentage.toFixed(1)}% of total</div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Predictive Insights -->
              {#if predictiveInsights.length > 0}
                <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-6">Predictive Insights</h3>
                  <div class="space-y-4">
                    {#each predictiveInsights as insight}
                      <div class="flex items-start space-x-4 p-4 rounded-xl {insight.impact === 'positive' ? 'bg-green-50 border border-green-200' : insight.impact === 'negative' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center {insight.impact === 'positive' ? 'bg-green-100 text-green-600' : insight.impact === 'negative' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}">
                          {#if insight.impact === 'positive'}
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                            </svg>
                          {:else if insight.impact === 'negative'}
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>
                            </svg>
                          {:else}
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                          {/if}
                        </div>
                        <div class="flex-1">
                          <h4 class="font-semibold {insight.impact === 'positive' ? 'text-green-900' : insight.impact === 'negative' ? 'text-red-900' : 'text-blue-900'}">{insight.title}</h4>
                          <p class="text-sm {insight.impact === 'positive' ? 'text-green-700' : insight.impact === 'negative' ? 'text-red-700' : 'text-blue-700'} mt-1">{insight.description}</p>
                          <div class="mt-2 text-xs {insight.impact === 'positive' ? 'text-green-600' : insight.impact === 'negative' ? 'text-red-600' : 'text-blue-600'}">
                            Confidence: {insight.confidence}%
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>

          {:else if analyticsView === 'demographics'}
            <!-- Demographics Analytics -->
            <div class="space-y-8">
              <!-- Job Distribution -->
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">Distribution by Job Category</h3>
                <div class="space-y-4">
                  {#each jobDistribution.slice(0, 8) as job}
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-3">
                        <div class="w-4 h-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full"></div>
                        <span class="font-medium text-gray-900">{job.jobName}</span>
                      </div>
                      <div class="flex items-center space-x-3">
                        <div class="w-32 bg-gray-200 rounded-full h-2">
                          <div class="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-500" style="width: {job.percentage}%"></div>
                        </div>
                        <span class="text-sm font-medium text-gray-600 w-12 text-right">{job.count}</span>
                        <span class="text-sm text-gray-500 w-12 text-right">{job.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Phone Availability -->
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">Contact Information Completeness</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div class="text-center">
                    <div class="w-24 h-24 mx-auto mb-4 relative">
                      <svg class="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="#e5e7eb" stroke-width="8" fill="none"/>
                        <circle cx="50" cy="50" r="40" stroke="#10b981" stroke-width="8" fill="none"
                          stroke-dasharray="{2 * Math.PI * 40}"
                          stroke-dashoffset="{2 * Math.PI * 40 * (1 - phoneAvailability.withPhonePercentage / 100)}"
                          class="transition-all duration-1000"/>
                      </svg>
                      <div class="absolute inset-0 flex items-center justify-center">
                        <span class="text-lg font-bold text-gray-900">{phoneAvailability.withPhonePercentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    <h4 class="font-semibold text-gray-900">Phone Numbers</h4>
                    <p class="text-sm text-gray-600">{phoneAvailability.withPhone} of {clients.length} clients</p>
                  </div>

                  <div class="text-center">
                    <div class="w-24 h-24 mx-auto mb-4 relative">
                      <svg class="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="#e5e7eb" stroke-width="8" fill="none"/>
                        <circle cx="50" cy="50" r="40" stroke="#3b82f6" stroke-width="8" fill="none"
                          stroke-dasharray="{2 * Math.PI * 40}"
                          stroke-dashoffset="{2 * Math.PI * 40 * (1 - dataQualityMetrics.dataCompleteness.email / 100)}"
                          class="transition-all duration-1000"/>
                      </svg>
                      <div class="absolute inset-0 flex items-center justify-center">
                        <span class="text-lg font-bold text-gray-900">{dataQualityMetrics.dataCompleteness.email.toFixed(0)}%</span>
                      </div>
                    </div>
                    <h4 class="font-semibold text-gray-900">Email Addresses</h4>
                    <p class="text-sm text-gray-600">{clients.length - dataQualityMetrics.missingData.email} of {clients.length} clients</p>
                  </div>

                  <div class="text-center">
                    <div class="w-24 h-24 mx-auto mb-4 relative">
                      <svg class="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="#e5e7eb" stroke-width="8" fill="none"/>
                        <circle cx="50" cy="50" r="40" stroke="#f59e0b" stroke-width="8" fill="none"
                          stroke-dasharray="{2 * Math.PI * 40}"
                          stroke-dashoffset="{2 * Math.PI * 40 * (1 - dataQualityMetrics.dataCompleteness.address / 100)}"
                          class="transition-all duration-1000"/>
                      </svg>
                      <div class="absolute inset-0 flex items-center justify-center">
                        <span class="text-lg font-bold text-gray-900">{dataQualityMetrics.dataCompleteness.address.toFixed(0)}%</span>
                      </div>
                    </div>
                    <h4 class="font-semibold text-gray-900">Addresses</h4>
                    <p class="text-sm text-gray-600">{clients.length - dataQualityMetrics.missingData.address} of {clients.length} clients</p>
                  </div>
                </div>
              </div>

              <!-- Geographical Distribution -->
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">Geographical Distribution</h3>
                <div class="space-y-3">
                  {#each geographicalDistribution as location}
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full"></div>
                        <span class="font-medium text-gray-900">{location.location}</span>
                      </div>
                      <div class="flex items-center space-x-3">
                        <span class="text-sm font-medium text-gray-600">{location.count} clients</span>
                        <span class="text-sm text-gray-500">({location.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>

          {:else if analyticsView === 'workplace'}
            <!-- Workplace Analytics -->
            <div class="space-y-8">
              <!-- Top Workplaces -->
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">Top Workplaces by Client Count</h3>
                <div class="space-y-4">
                  {#each workplaceDistribution as workplace, index}
                    <div class="flex items-center space-x-4">
                      <div class="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center justify-between mb-1">
                          <span class="font-medium text-gray-900">{workplace.workplace}</span>
                          <span class="text-sm font-medium text-gray-600">{workplace.count} clients</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                          <div class="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-500" style="width: {workplace.percentage}%"></div>
                        </div>
                      </div>
                      <span class="text-sm text-gray-500 w-12 text-right">{workplace.percentage.toFixed(1)}%</span>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Workplace Performance Metrics -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-4">Workplace Diversity</h3>
                  <div class="text-center">
                    <div class="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                      {workplaceDistribution.length}
                    </div>
                    <p class="text-gray-600">Different workplaces represented</p>
                  </div>
                </div>

                <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-4">Top Workplace</h3>
                  <div class="text-center">
                    <div class="text-lg font-bold text-gray-900 mb-1">
                      {analytics.topWorkplace}
                    </div>
                    <p class="text-gray-600">
                      {workplaceDistribution[0]?.count || 0} clients ({workplaceDistribution[0]?.percentage.toFixed(1) || 0}%)
                    </p>
                  </div>
                </div>
              </div>
            </div>

          {:else if analyticsView === 'activity'}
            <!-- Activity Analytics -->
            <div class="space-y-8">
              <!-- Client Activity Levels -->
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">Client Activity Levels</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {#each clientActivityMetrics as activity}
                    <div class="text-center p-4 bg-gray-50 rounded-xl">
                      <div class="text-2xl font-bold text-gray-900 mb-1">{activity.count}</div>
                      <div class="text-sm font-medium text-gray-700 mb-2">{activity.level}</div>
                      <div class="text-xs text-gray-500">{activity.percentage.toFixed(1)}%</div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Key Performance Indicators -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white">
                  <h4 class="text-lg font-semibold mb-2">Retention Rate</h4>
                  <div class="text-3xl font-bold mb-1">{analytics.retentionRate.toFixed(1)}%</div>
                  <p class="text-green-100 text-sm">Clients with multiple cessions</p>
                </div>

                <div class="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 text-white">
                  <h4 class="text-lg font-semibold mb-2">Avg Cessions</h4>
                  <div class="text-3xl font-bold mb-1">{analytics.avgCessionsPerClient.toFixed(1)}</div>
                  <p class="text-blue-100 text-sm">Per client</p>
                </div>

                <div class="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
                  <h4 class="text-lg font-semibold mb-2">Completion Rate</h4>
                  <div class="text-3xl font-bold mb-1">{analytics.completionRate.toFixed(1)}%</div>
                  <p class="text-purple-100 text-sm">Clients with finished cessions</p>
                </div>
              </div>
            </div>

          {:else if analyticsView === 'trends'}
            <!-- Trends Analytics -->
            <div class="space-y-8">
              <!-- Growth Trend Chart -->
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">Client Growth Trends</h3>
                <div class="h-80 flex items-end justify-between space-x-1">
                  {#each clientCreationTrends as trend, index}
                    <div class="flex-1 flex flex-col items-center">
                      <!-- Cumulative line -->
                      <div class="w-full relative mb-2">
                        <div 
                          class="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500"
                          style="height: {Math.max(4, (trend.cumulative / Math.max(...clientCreationTrends.map(t => t.cumulative))) * 120)}px"
                          title="Cumulative: {trend.cumulative} clients"
                        ></div>
                      </div>
                      <!-- Monthly additions -->
                      <div 
                        class="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-lg transition-all duration-500 hover:from-purple-700 hover:to-purple-500"
                        style="height: {Math.max(4, (trend.count / Math.max(...clientCreationTrends.map(t => t.count))) * 120)}px"
                        title="New: {trend.count} clients in {trend.month} {trend.year}"
                      ></div>
                      <div class="mt-2 text-xs text-gray-600 text-center">
                        <div class="font-medium">{trend.month}</div>
                        <div class="text-purple-600 font-medium">+{trend.count}</div>
                        <div class="text-blue-600 text-xs">{trend.cumulative}</div>
                      </div>
                    </div>
                  {/each}
                </div>
                <div class="mt-4 flex items-center justify-center space-x-6 text-sm">
                  <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 bg-purple-600 rounded"></div>
                    <span>New Clients</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 bg-blue-600 rounded"></div>
                    <span>Cumulative Total</span>
                  </div>
                </div>
              </div>

              <!-- Data Quality Issues -->
              {#if dataQualityMetrics.duplicateCINs.length > 0 || dataQualityMetrics.duplicateWorkerNumbers.length > 0}
                <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-6">Data Quality Issues</h3>
                  <div class="space-y-4">
                    {#if dataQualityMetrics.duplicateCINs.length > 0}
                      <div class="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <h4 class="font-semibold text-red-900 mb-2">Duplicate CIN Numbers</h4>
                        <p class="text-red-700 text-sm mb-3">Found {dataQualityMetrics.duplicateCINs.length} CIN numbers with duplicates</p>
                        <div class="space-y-2">
                          {#each dataQualityMetrics.duplicateCINs.slice(0, 5) as duplicate}
                            <div class="flex items-center justify-between text-sm">
                              <span class="font-medium text-red-800">CIN: {duplicate.cin}</span>
                              <span class="text-red-600">{duplicate.count} clients</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}

                    {#if dataQualityMetrics.duplicateWorkerNumbers.length > 0}
                      <div class="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                        <h4 class="font-semibold text-orange-900 mb-2">Duplicate Worker Numbers</h4>
                        <p class="text-orange-700 text-sm mb-3">Found {dataQualityMetrics.duplicateWorkerNumbers.length} worker numbers with duplicates</p>
                        <div class="space-y-2">
                          {#each dataQualityMetrics.duplicateWorkerNumbers.slice(0, 5) as duplicate}
                            <div class="flex items-center justify-between text-sm">
                              <span class="font-medium text-orange-800">Worker: {duplicate.workerNumber}</span>
                              <span class="text-orange-600">{duplicate.count} clients</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {:else}
        <!-- Grid/List View border-primary-200 rounded-full animate-spin"></div>
            <div class="absolute top-0 left-0 w-16 h-16 border-4 border-primary-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p class="text-gray-600 font-medium">Loading clients...</p>
        </div>
      {:else if filteredClients.length === 0}
        <div class="text-center py-16">
          <div class="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
          <p class="text-gray-500 mb-6">
            {#if searchQuery || searchCIN || searchWorkerNumber || searchClientNumber}
              Try adjusting your search criteria
            {:else}
              Get started by adding your first client
            {/if}
          </p>
          {#if !searchQuery && !searchCIN && !searchWorkerNumber && !searchClientNumber}
            <a
              href="/clients/new"
              class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              Add First Client
            </a>
          {:else}
            <button
              on:click={clearAllFilters}
              class="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
            >
              Clear Search
            </button>
          {/if}
        </div>
      {:else}
        <!-- Client Grid/List -->
        <div class="p-6">
          {#if viewMode === 'grid'}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {#each filteredClients as client, index (client.id)}
                <div 
                  class="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl hover:border-purple-200 transition-all duration-300 cursor-pointer"
                  in:fly={{ y: hasSearchQuery ? 0 : 20, delay: hasSearchQuery ? 0 : index * 30, duration: hasSearchQuery ? 0 : 200 }}
                  out:fly={{ y: hasSearchQuery ? 0 : -20, duration: hasSearchQuery ? 0 : 150 }}
                  on:click|stopPropagation={async (e) => {
                    e.preventDefault();
                    await showClientDetails(client);
                  }}
                  on:keydown|stopPropagation={async (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      await showClientDetails(client);
                    }
                  }}
                  role="button"
                  tabindex="0"
                  aria-label="View details for {client.fullName}"
                >
                  <!-- Client Avatar and Header -->
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center">
                      <div class="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg">
                        {client.fullName ? client.fullName.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div class="ml-3">
                        <h3 class="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                          {client.fullName}
                        </h3>
                        <p class="text-sm text-gray-500 font-medium">{formatClientNumber(client.clientNumber)}</p>
                      </div>
                    </div>
                    <!-- Status Indicator -->
                    <div class="w-3 h-3 rounded-full shadow-sm" class:bg-green-400={hasActiveCessions(client.id)} class:bg-red-400={!hasActiveCessions(client.id)}></div>
                  </div>

                  <!-- Client Details -->
                  <div class="space-y-3 mb-6">
                    <div class="flex items-center text-sm text-gray-600">
                      <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
                      </svg>
                      <span class="font-medium">ID:</span>
                      <span class="ml-1">{client.cin || 'N/A'}</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-600">
                      <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                      </svg>
                      <span class="font-medium">Worker:</span>
                      <span class="ml-1">{client.workerNumber || 'N/A'}</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-600">
                      <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                      </svg>
                      <span class="font-medium">Workplace:</span>
                      <span class="ml-1 truncate">{client.workplaceName || 'N/A'}</span>
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex space-x-2">
                    <button
                      on:click|stopPropagation={() => viewFullDetails(client.id)}
                      class="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      View Details
                    </button>
                    <button
                      on:click|stopPropagation={() => createCession(client.id)}
                      class="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 text-sm font-medium"
                    >
                      New Cession
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <!-- List View -->
            <div class="space-y-4">
              {#each filteredClients as client, index (client.id)}
                <div 
                  class="group bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 hover:shadow-xl hover:border-purple-200 transition-all duration-300 cursor-pointer"
                  in:fly={{ x: hasSearchQuery ? 0 : -20, delay: hasSearchQuery ? 0 : index * 20, duration: hasSearchQuery ? 0 : 200 }}
                  out:fly={{ x: hasSearchQuery ? 0 : 20, duration: hasSearchQuery ? 0 : 150 }}
                  on:click|stopPropagation={async (e) => {
                    e.preventDefault();
                    await showClientDetails(client);
                  }}
                  on:keydown|stopPropagation={async (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      await showClientDetails(client);
                    }
                  }}
                  role="button"
                  tabindex="0"
                  aria-label="View details for {client.fullName}"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                      <div class="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
                        {client.fullName ? client.fullName.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <h3 class="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                          {client.fullName}
                        </h3>
                        <div class="flex items-center space-x-4 text-sm text-gray-600">
                          <span>ID: {client.cin || 'N/A'}</span>
                          <span>Worker: {client.workerNumber || 'N/A'}</span>
                          <span>Client: {formatClientNumber(client.clientNumber)}</span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center space-x-3">
                      <div class="w-3 h-3 rounded-full shadow-sm" class:bg-green-400={hasActiveCessions(client.id)} class:bg-red-400={!hasActiveCessions(client.id)}></div>
                      <div class="flex space-x-2">
                        <button
                          on:click|stopPropagation={() => viewFullDetails(client.id)}
                          class="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          View
                        </button>
                        <button
                          on:click|stopPropagation={() => createCession(client.id)}
                          class="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 text-sm font-medium"
                        >
                          New Cession
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Client Details Modal -->
{#if isClientDetailsVisible && selectedClient}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" 
    transition:fade={{ duration: 200 }}
    on:click|self={(e) => {
      e.preventDefault();
      closeClientDetails();
    }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="client-modal-title"
  >
    <div 
      class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" 
      transition:scale={{ duration: 300 }}
      on:click|stopPropagation
    >
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h2 id="client-modal-title" class="text-2xl font-bold text-gray-900">Client Details</h2>
          <button
            on:click|stopPropagation={(e) => {
              e.preventDefault();
              closeClientDetails();
            }}
            class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close modal"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="p-6">
        <div class="space-y-6">
          <!-- Client Info -->
          <div class="flex items-center space-x-4">
            <div class="w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {selectedClient.fullName ? selectedClient.fullName.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <h3 class="text-xl font-semibold text-gray-900">{selectedClient.fullName}</h3>
              <p class="text-gray-600">{formatClientNumber(selectedClient.clientNumber)}</p>
            </div>
          </div>
          
          <!-- Details Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">CIN</label>
                <p class="text-gray-900">{selectedClient.cin || 'N/A'}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Worker Number</label>
                <p class="text-gray-900">{selectedClient.workerNumber || 'N/A'}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <p class="text-gray-900">{selectedClient.phoneNumber || selectedClient.phone || 'N/A'}</p>
              </div>
            </div>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Job</label>
                <p class="text-gray-900">{jobDetails?.name || jobsMap[selectedClient.jobId] || 'N/A'}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <p class="text-gray-900">{selectedClient.address || 'N/A'}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Workplace</label>
                <p class="text-gray-900">{workplaceDetails?.name || selectedClient.workplaceName || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="flex space-x-4 pt-6 border-t border-gray-200">
            <button
              on:click|stopPropagation={async (e) => {
                e.preventDefault();
                await viewFullDetails(selectedClient.id);
              }}
              class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedClient?.id}
            >
              View Full Details
            </button>
            <button
              on:click|stopPropagation={async (e) => {
                e.preventDefault();
                await createCession(selectedClient.id);
              }}
              class="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedClient?.id}
            >
              Create Cession
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}