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
  import { emojiSupport } from '$lib/utils/emojiSupport';

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
  let filteredJobs = [];
  let workplaces = [];
  let workplacesMap = {};
  let filteredWorkplaces = [];
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
  let dataQualityMetrics = {
    duplicateCINs: [],
    duplicateWorkerNumbers: [],
    missingData: { phone: 0, email: 0, address: 0 }
  };
  let geographicalDistribution = [];
  let clientActivityMetrics = [];
  let predictiveInsights = [];
  let clientSegments = [];
  
  // UI state for job distribution
  let showAllJobs = false;

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
    sortOrder: 'asc',
    selectedWorkplace: null, // Single workplace selection
    selectedJobs: [],
    activeOnly: false,
    hasCessions: false,
    searchQuery: ''
  };

  // Reactive statement for active filters count
  $: activeFiltersCount = (filters.activeOnly ? 1 : 0) + (filters.hasCessions ? 1 : 0) + (filters.searchQuery ? 1 : 0);

  // Sync searchQuery with filters.searchQuery
  $: if (searchQuery !== filters.searchQuery) {
    filters.searchQuery = searchQuery;
  }

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
  // ⌨️ Keyboard Shortcuts Handler
  function handleKeydown(event) {
    // Close details on Escape
    if (event.key === 'Escape' && isClientDetailsVisible) {
      event.preventDefault();
      closeClientDetails();
      return;
    }
    
    // Don't trigger if user is typing in an input field
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target.isContentEditable) {
      return;
    }
    
    // Check for Ctrl (or Cmd on Mac)
    const modifier = event.ctrlKey || event.metaKey;
    
    if (modifier) {
      switch(event.key) {
        case 'n':
        case 'N':
          event.preventDefault();
          goto('/clients/new');
          break;
        case 'g':
        case 'G':
          event.preventDefault();
          viewMode = 'grid';
          break;
        case 'l':
        case 'L':
          event.preventDefault();
          viewMode = 'list';
          break;
        case 'd':
        case 'D':
          event.preventDefault();
          goto('/clients/analytics');
          break;
        case 'e':
        case 'E':
          event.preventDefault();
          showAlert('Export functionality coming soon', 'info');
          break;
        case '/':
          event.preventDefault();
          document.querySelector('input[placeholder*="search" i]')?.focus();
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          loadClients(true);
          break;
      }
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
      filteredWorkplaces = [...workplaces];
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
      filteredJobs = [...jobs];
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
      const hasQuery = searchQuery || searchCIN || searchWorkerNumber || searchClientNumber || 
                      filters.selectedWorkplace || filters.selectedJobs.length > 0 ||
                      filters.activeOnly || filters.hasCessions;
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

          // Workplace filter (single selection)
          if (filters.selectedWorkplace && filters.selectedWorkplace !== client.workplaceId) {
            return false;
          }

          // Job filter
          if (filters.selectedJobs.length > 0 && !filters.selectedJobs.includes(client.jobId)) {
            return false;
          }

          // Active only filter
          if (filters.activeOnly && !hasActiveCessions(client.id)) {
            return false;
          }

          // Has cessions filter
          if (filters.hasCessions && (!cessionsByClient[client.id?.toString()] || cessionsByClient[client.id?.toString()].length === 0)) {
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

  // New filter toggle functions
  function toggleFilter(filterType) {
    if (filterType === 'activeOnly') {
      filters.activeOnly = !filters.activeOnly;
    } else if (filterType === 'hasCessions') {
      filters.hasCessions = !filters.hasCessions;
    }
    performSearch();
  }

  function toggleAdvancedSearch() {
    isSearchVisible = !isSearchVisible;
  }

  // FIXED: Clear all filters function
  function clearAllFilters() {
    cleanup(); // Clear any pending searches
    
    searchQuery = '';
    searchCIN = '';
    searchWorkerNumber = '';
    searchClientNumber = '';
    filters.selectedWorkplace = null;
    filters.selectedJobs = [];
    filters.activeOnly = false;
    filters.hasCessions = false;
    filters.searchQuery = '';
    hasSearchQuery = false;
    
    // Immediate update without debounce
    filteredClients = [...clients];
    applySorting();
  }

  // Workplace Filter Functions
  function toggleWorkplaceFilter(workplaceId) {
    // Single selection for workplace
    if (filters.selectedWorkplace === workplaceId) {
      filters.selectedWorkplace = null; // Deselect if already selected
      // Clear selected jobs when workplace is deselected
      filters.selectedJobs = [];
    } else {
      filters.selectedWorkplace = workplaceId; // Select new workplace
      // Clear selected jobs when workplace changes
      filters.selectedJobs = [];
    }
    performSearch();
  }

  // Job Filter Functions
  function toggleJobFilter(jobId) {
    const index = filters.selectedJobs.indexOf(jobId);
    if (index > -1) {
      filters.selectedJobs.splice(index, 1);
    } else {
      filters.selectedJobs.push(jobId);
    }
    filters.selectedJobs = [...filters.selectedJobs];
    performSearch();
  }

  // Filter jobs by selected workplace
  function filterJobsByWorkplace() {
    // This function is called when workplace changes in the compact filter
    // No longer needed to maintain filteredJobs array since we use direct filtering
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
      minimumFractionDigits: 3
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

  function countActiveCessions(clientId) {
    const clientCessions = cessionsByClient[clientId?.toString()];
    if (!clientCessions || clientCessions.length === 0) {
      return 0;
    }
    return clientCessions.filter(cession => {
      const status = cession.status?.toLowerCase();
      return status === 'active' || status === 'pending' || !status;
    }).length;
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
    
    console.log('📈 Generating Client Creation Trends');
    console.log('Total clients:', clients.length);
    console.log('Sample client createdAt values:', clients.slice(0, 5).map(c => ({ 
      id: c.id?.substring(0, 8), 
      createdAt: c.createdAt,
      parsed: c.createdAt ? new Date(c.createdAt).toISOString() : 'N/A'
    })));

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
      
      const cumulative = clients.filter(client => {
        if (!client.createdAt) return false;
        return new Date(client.createdAt) <= nextMonthDate;
      }).length;

      trends.push({
        month: monthDate.toLocaleString('default', { month: 'short' }),
        year: monthDate.getFullYear(),
        count: monthClients.length,
        cumulative: cumulative
      });
      
      console.log(`${monthDate.toLocaleString('default', { month: 'short' })} ${monthDate.getFullYear()}: ${monthClients.length} clients (cumulative: ${cumulative})`);
    }

    clientCreationTrends = trends;
    console.log('Final trends:', clientCreationTrends);
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

          <!-- Real-time Stats Pills -->
          <div class="hidden lg:flex items-center space-x-3 ml-8" class:space-x-reverse={isRTL}>
            <div class="flex items-center px-3 py-1.5 bg-purple-100 rounded-full">
              <div class="w-2 h-2 bg-purple-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'} animate-pulse"></div>
              <span class="text-xs font-semibold text-purple-800">{clients.length} {$t('clients.stats.total')}</span>
            </div>
            <div class="flex items-center px-3 py-1.5 bg-green-100 rounded-full">
              <div class="w-2 h-2 bg-green-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'}"></div>
              <span class="text-xs font-semibold text-green-800">{analytics.activeClients} {$t('clients.stats.active')}</span>
            </div>
            <div class="flex items-center px-3 py-1.5 bg-blue-100 rounded-full">
              <div class="w-2 h-2 bg-blue-500 rounded-full {isRTL ? 'ml-2' : 'mr-2'}"></div>
              <span class="text-xs font-semibold text-blue-800">{analytics.newClientsThisMonth} {$t('clients.stats.new')}</span>
            </div>
          </div>
        </div>

        <!-- Action Center -->
        <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
          <!-- View Mode Toggle -->
          <div class="flex bg-gray-100 rounded-xl p-1">
            <button
              on:click={() => viewMode = 'grid'}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
            </button>
            <button
              on:click={() => viewMode = 'list'}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
            </button>
            <button
              on:click={() => viewMode = 'analytics'}
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 {viewMode === 'analytics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </button>
          </div>

          <!-- Quick Actions -->
          <button
            on:click={toggleSearch}
            class="flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-200 font-medium text-gray-700"
          >
            <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
            </svg>
            {$t('clients.filters.title')}
          </button>

          <a
            href="/clients/new"
            class="flex items-center px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            <svg class="w-4 h-4 {isRTL ? 'ml-2' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            {$t('clients.new')}
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- Search and Filters Section -->
  <div class="bg-white/50 backdrop-blur-sm border-b border-white/20">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex flex-col space-y-4">
        <!-- Active Filters Display -->
        {#if activeFiltersCount > 0}
          <div class="flex items-center space-x-2" class:space-x-reverse={isRTL}>
            <span class="text-sm font-medium text-gray-600">{$t('clients.filters.active')}:</span>
            <div class="flex flex-wrap gap-2">
              {#if filters.activeOnly}
                <div class="flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                  <span>{$t('clients.filters.activeOnly')}</span>
                  <button on:click={() => toggleFilter('activeOnly')} class="ml-2 hover:bg-purple-200 rounded-full p-0.5">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              {/if}
              {#if filters.hasCessions}
                <div class="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  <span>{$t('clients.filters.hasCessions')}</span>
                  <button on:click={() => toggleFilter('hasCessions')} class="ml-2 hover:bg-blue-200 rounded-full p-0.5">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              {/if}
              {#if filters.searchQuery}
                <div class="flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                  <span>"{filters.searchQuery}"</span>
                  <button on:click={() => { searchQuery = ''; filters.searchQuery = ''; }} class="ml-2 hover:bg-gray-200 rounded-full p-0.5">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              {/if}
            </div>
            <button
              on:click={clearAllFilters}
              class="text-sm text-gray-500 hover:text-gray-700 font-medium underline"
            >
              {$t('clients.filters.clearAll')}
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="max-w-7xl mx-auto px-6 py-8">

    <!-- Enhanced Advanced Search Panel -->
    {#if isSearchVisible}
      <div class="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 mb-8 overflow-hidden" transition:fly={{ y: -20, duration: 400, easing: cubicOut }}>
        <!-- Header with Enhanced Design -->
        <div class="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{$t('clients.search.advanced_search')}</h3>
              <p class="text-sm text-gray-500 mt-1">{$t('clients.search.advanced_search_description')}</p>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <!-- Search Tips -->
            <div class="hidden md:block relative group">
              <button class="w-8 h-8 text-gray-400 hover:text-purple-600 transition-colors rounded-lg hover:bg-purple-50 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </button>
              <div class="absolute right-0 top-10 w-64 p-4 bg-gray-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-xl">
                <div class="font-semibold mb-2">{$t('clients.search.tips.title')}</div>
                <ul class="space-y-1 text-gray-300">
                  <li>• {$t('clients.search.tips.partial_names')}</li>
                  <li>• {$t('clients.search.tips.combine_criteria')}</li>
                  <li>• {$t('clients.search.tips.select_workplace')}</li>
                  <li>• {$t('clients.search.tips.press_enter')}</li>
                </ul>
              </div>
            </div>
            <button
              on:click={toggleSearch}
              class="w-10 h-10 text-gray-400 hover:text-gray-600 transition-all duration-200 rounded-xl hover:bg-gray-100 flex items-center justify-center"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Quick Search Bar -->
        <div class="mb-8">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <input
              type="text"
              bind:value={searchQuery}
              on:input={handleSearchInput}
              on:keydown={(e) => {
                if (e.key === 'Enter') {
                  performSearch();
                }
              }}
              placeholder="{$t('clients.search.quick_search_placeholder')}"
              class="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 bg-white/80 backdrop-blur-sm text-gray-900 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 shadow-sm hover:shadow-md"
            />
            {#if searchQuery}
              <button
                on:click={() => { searchQuery = ''; performSearch(); }}
                class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            {/if}
          </div>
        </div>

        <!-- Search Criteria Cards -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <!-- Identity Search Card -->
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100/50">
            <div class="flex items-center mb-4">
              <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
                </svg>
              </div>
              <h4 class="text-lg font-semibold text-gray-900">{$t('clients.search.identity_search')}</h4>
            </div>
            <div class="space-y-4">
              <!-- CIN Search -->
              <div class="relative">
                <label for="cinSearch" class="block text-sm font-medium text-gray-700 mb-2">{$t('clients.search.cin_label')}</label>
                <div class="relative">
                  <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
                  </svg>
                  <input
                    type="text"
                    id="cinSearch"
                    bind:value={searchCIN}
                    on:input={handleSearchInput}
                    on:keydown={(e) => {
                      if (e.key === 'Enter') {
                        performSearch();
                      }
                    }}
                    placeholder="{$t('clients.search.cin_placeholder')}"
                    class="w-full pl-10 pr-4 py-3 border border-gray-200 bg-white/80 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                  />
                </div>
              </div>

              <!-- Worker Number Search -->
              <div class="relative">
                <label for="workerNumberSearch" class="block text-sm font-medium text-gray-700 mb-2">{$t('clients.search.worker_number_label')}</label>
                <div class="relative">
                  <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                  </svg>
                  <input
                    type="text"
                    id="workerNumberSearch"
                    bind:value={searchWorkerNumber}
                    on:input={handleSearchInput}
                    on:keydown={(e) => {
                      if (e.key === 'Enter') {
                        performSearch();
                      }
                    }}
                    placeholder="{$t('clients.search.worker_number_placeholder')}"
                    class="w-full pl-10 pr-4 py-3 border border-gray-200 bg-white/80 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                  />
                </div>
              </div>

              <!-- Client Number Search -->
              <div class="relative">
                <label for="clientNumberSearch" class="block text-sm font-medium text-gray-700 mb-2">{$t('clients.search.client_number_label')}</label>
                <div class="relative">
                  <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                  <input
                    type="text"
                    id="clientNumberSearch"
                    bind:value={searchClientNumber}
                    on:input={handleSearchInput}
                    on:keydown={(e) => {
                      if (e.key === 'Enter') {
                        performSearch();
                      }
                    }}
                    placeholder="{$t('clients.search.client_number_placeholder')}"
                    class="w-full pl-10 pr-4 py-3 border border-gray-200 bg-white/80 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Organization Filters Card -->
          <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100/50">
            <div class="flex items-center mb-4">
              <div class="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center mr-3">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-9 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
              </div>
              <h4 class="text-lg font-semibold text-gray-900">{$t('clients.search.organization_filters')}</h4>
            </div>
            <div class="space-y-4">
              <!-- Workplace Filter -->
              <div class="relative">
                <label class="block text-sm font-medium text-gray-700 mb-2">{$t('clients.search.workplace_label')}</label>
                <div class="relative">
                  <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                  <select
                    bind:value={filters.selectedWorkplace}
                    on:change={() => {
                      if (filters.selectedWorkplace) {
                        filters.selectedJobs = [];
                        filterJobsByWorkplace();
                      }
                      performSearch();
                    }}
                    class="w-full pl-10 pr-10 py-3 border border-gray-200 bg-white/80 text-gray-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 shadow-sm appearance-none"
                  >
                    <option value={null}>{$t('clients.search.all_workplaces')}</option>
                    {#each workplaces as workplace (workplace.id)}
                      <option value={workplace.id}>{workplace.name}</option>
                    {/each}
                  </select>
                  <svg class="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
                {#if filters.selectedWorkplace}
                  <div class="flex items-center justify-between mt-2">
                    <span class="text-xs text-emerald-600 font-medium">
                      {clients.filter(c => c.workplaceId === filters.selectedWorkplace).length} {$t('clients.search.clients_in_workplace')}
                    </span>
                    <button
                      on:click={() => {
                        filters.selectedWorkplace = null;
                        filters.selectedJobs = [];
                        performSearch();
                      }}
                      class="text-xs text-gray-500 hover:text-red-500 underline transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                {/if}
              </div>

              <!-- Job Filter -->
              <div class="relative">
                <label class="block text-sm font-medium text-gray-700 mb-2">{$t('clients.search.job_title_label')}</label>
                <div class="relative">
                  <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V2m0 4V2m0 4v2a2 2 0 01-2 2H8a2 2 0 01-2-2V6m8 0H8m8 12v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2m8 0v2H8v-2"/>
                  </svg>
                  <select
                    multiple
                    bind:value={filters.selectedJobs}
                    on:change={performSearch}
                    class="w-full pl-10 pr-4 py-3 border border-gray-200 bg-white/80 text-gray-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 shadow-sm min-h-[48px] max-h-32 overflow-y-auto"
                    disabled={!filters.selectedWorkplace}
                  >
                    {#each (filters.selectedWorkplace ? jobs.filter(job => job.workplaceId === filters.selectedWorkplace) : jobs) as job (job.id)}
                      <option value={job.id}>{job.name || job.title || `Job ${job.id}`}</option>
                    {/each}
                  </select>
                </div>
                {#if filters.selectedJobs.length > 0}
                  <div class="flex items-center justify-between mt-2">
                    <span class="text-xs text-emerald-600 font-medium">
                      {filters.selectedJobs.length} job title{filters.selectedJobs.length > 1 ? 's' : ''} selected
                    </span>
                    <button
                      on:click={() => {
                        filters.selectedJobs = [];
                        performSearch();
                      }}
                      class="text-xs text-gray-500 hover:text-red-500 underline transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                {/if}
                {#if !filters.selectedWorkplace}
                  <p class="text-xs text-gray-500 italic mt-2">{$t('clients.search.select_workplace_first')}</p>
                {/if}
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Filter Pills -->
        <div class="mb-8">
          <h4 class="text-sm font-semibold text-gray-700 mb-3">{$t('clients.search.quick_filters')}</h4>
          <div class="flex flex-wrap gap-3">
            <button
              on:click={() => toggleFilter('activeOnly')}
              class="flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 {filters.activeOnly ? 'bg-purple-100 text-purple-800 border-2 border-purple-300' : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'}"
            >
              <div class="w-2 h-2 rounded-full {filters.activeOnly ? 'bg-purple-500' : 'bg-gray-400'} mr-2"></div>
              Active Clients Only
            </button>
            <button
              on:click={() => toggleFilter('hasCessions')}
              class="flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 {filters.hasCessions ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'}"
            >
              <div class="w-2 h-2 rounded-full {filters.hasCessions ? 'bg-blue-500' : 'bg-gray-400'} mr-2"></div>
              {$t('clients.search.has_cessions')}
            </button>
          </div>
        </div>

        <!-- Search Actions & Results -->
        <div class="flex items-center justify-between pt-6 border-t border-gray-100">
          <div class="flex items-center space-x-4">
            <div class="text-sm text-gray-600">
              {#if isSearching}
                <div class="flex items-center space-x-2">
                  <div class="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>{$t('clients.search.searching')}</span>
                </div>
              {:else}
                <span class="font-medium text-gray-900">{filteredClients.length}</span>
                <span>{$t('common.of')}</span>
                <span class="font-medium text-gray-900">{clients.length}</span>
                <span>{$t('clients.search.clients_found')}</span>
              {/if}
            </div>
            {#if filteredClients.length > 0 && filteredClients.length < clients.length}
              <div class="text-xs text-green-600 font-medium">
                {((filteredClients.length / clients.length) * 100).toFixed(1)}% of total
              </div>
            {/if}
          </div>
          <div class="flex items-center space-x-3">
            <button
              on:click={performSearch}
              class="flex items-center px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              {$t('clients.search.search_now')}
            </button>
            <button
              on:click={clearAllFilters}
              class="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors shadow-sm"
            >
              {$t('clients.search.clear_all')}
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Active Filters Display -->
    {#if filters.selectedWorkplace || filters.selectedJobs.length > 0}
      <div class="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 mb-8 border border-purple-200/50" transition:fly={{ y: -10, duration: 300 }}>
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <h4 class="text-sm font-semibold text-gray-700">{$t('clients.search.active_filters')}:</h4>
            <div class="flex flex-wrap gap-2">
              {#if filters.selectedWorkplace}
                {@const workplace = workplaces.find(w => w.id === filters.selectedWorkplace)}
                {#if workplace}
                  <span class="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    🏢 {workplace.name}
                    <button
                      on:click={() => toggleWorkplaceFilter(filters.selectedWorkplace)}
                      class="ml-2 w-4 h-4 bg-purple-200 hover:bg-purple-300 rounded-full flex items-center justify-center transition-colors"
                    >
                      <svg class="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </span>
                {/if}
              {/if}
              {#each filters.selectedJobs as jobId}
                {@const job = jobs.find(j => j.id === jobId)}
                {#if job}
                  <span class="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                    💼 {job.name}
                    <button
                      on:click={() => toggleJobFilter(jobId)}
                      class="ml-2 w-4 h-4 bg-indigo-200 hover:bg-indigo-300 rounded-full flex items-center justify-center transition-colors"
                    >
                      <svg class="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </span>
                {/if}
              {/each}
            </div>
          </div>
          <button
            on:click={clearAllFilters}
            class="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
          >
            {$t('clients.search.clear_all')}
          </button>
        </div>
      </div>
    {/if}

    <!-- Client Grid/List Section -->
    <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
      <!-- Header with Client Count -->
      <div class="p-6 border-b border-gray-100">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{$t('clients.title')}</h2>
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
            <h3 class="text-lg font-semibold text-gray-900 mb-2">{$t('clients.loading.title')}</h3>
            <p class="text-gray-600">{$t('clients.loading.message')}</p>
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
            <h3 class="text-lg font-semibold text-gray-900 mb-2">{$t('clients.empty.title')}</h3>
            <p class="text-gray-600 mb-4">
              {hasSearchQuery ? $t('clients.empty.no_results') : $t('clients.empty.no_clients')}
            </p>
            {#if !hasSearchQuery}
              <a
                href="/clients/new"
                class="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 font-medium"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                {$t('clients.empty.add_first')}
              </a>
            {:else}
              <button
                on:click={clearAllFilters}
                class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
              >
              {$t('clients.search.clear_filters')}
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
              <h2 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{$t('clients.analytics.title')}</h2>
              <p class="text-gray-600 mt-1">{$t('clients.analytics.subtitle')}</p>
            </div>
            <div class="flex items-center space-x-3" class:space-x-reverse={isRTL}>
              <!-- Analytics View Selector -->
              <select
                bind:value={analyticsView}
                class="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-medium"
              >
                <option value="overview">{$t('clients.analytics.views.overview')}</option>
                <option value="demographics">{$t('clients.analytics.views.demographics')}</option>
                <option value="workplace">{$t('clients.analytics.views.workplace')}</option>
                <option value="activity">{$t('clients.analytics.views.activity')}</option>
                <option value="trends">{$t('clients.analytics.views.trends')}</option>
              </select>
              <!-- Time Range Selector -->
              <select
                bind:value={timeRange}
                class="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-medium"
              >
                <option value="week">{$t('clients.analytics.time_ranges.week')}</option>
                <option value="month">{$t('clients.analytics.time_ranges.month')}</option>
                <option value="quarter">{$t('clients.analytics.time_ranges.quarter')}</option>
                <option value="year">{$t('clients.analytics.time_ranges.year')}</option>
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
                      <p class="text-purple-100 text-sm font-medium">{$t('clients.analytics.metrics.total_clients')}</p>
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
                      <p class="text-green-100 text-sm font-medium">{$t('clients.analytics.metrics.active_clients')}</p>
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
                      <p class="text-blue-100 text-sm font-medium">{$t('clients.analytics.metrics.new_this_month')}</p>
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
                      <p class="text-orange-100 text-sm font-medium">{$t('clients.analytics.metrics.growth_rate')}</p>
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
                  <h3 class="text-lg font-semibold text-gray-900">📈 {$t('clients.analytics.charts.client_creation_trends.title')}</h3>
                  <span class="text-sm text-gray-500">{$t('clients.analytics.charts.client_creation_trends.subtitle')}</span>
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
                    <span class="font-semibold">{$t('clients.analytics.charts.insight_label')}:</span> {$t('clients.analytics.charts.client_creation_trends.insight')}
                  </p>
                </div>
              </div>

              <!-- 2. Distribution by Job Category - Pie Chart Style -->
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="text-lg font-semibold text-gray-900">📊 {$t('clients.analytics.charts.job_distribution.title')}</h3>
                  <span class="text-sm text-gray-500">{$t('clients.analytics.charts.job_distribution.subtitle')}</span>
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
                          <div class="text-xs text-gray-600">{$t('clients.analytics.charts.job_distribution.total_clients')}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Legend and Stats -->
                  <div class="space-y-3">
                    {#each (showAllJobs ? jobDistribution : jobDistribution.slice(0, 8)) as job, index}
                      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div class="flex items-center space-x-3">
                          <div class="w-4 h-4 rounded-full" style="background: {['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#06B6D4', '#8B5A2B', '#2D7D32', '#C2185B', '#7B1FA2', '#303F9F', '#0288D1', '#0097A7', '#00796B'][index % 16]};"></div>
                          <span class="font-medium text-gray-900 text-sm">{job.jobName}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                          <span class="text-sm font-bold text-gray-700">{job.count}</span>
                          <span class="text-xs text-gray-500">({job.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                    {/each}
                    {#if jobDistribution.length > 8}
                      <div class="flex items-center justify-center pt-3">
                        <button 
                          on:click={() => showAllJobs = !showAllJobs}
                          class="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          <span>
                            {showAllJobs ? $t('clients.analytics.charts.job_distribution.show_less') : $t('clients.analytics.charts.job_distribution.show_more', { count: jobDistribution.length - 8 })}
                          </span>
                          <svg 
                            class="w-4 h-4 transform transition-transform duration-200 {showAllJobs ? 'rotate-180' : ''}" 
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
                    <span class="font-semibold">{$t('clients.analytics.charts.insight_label')}:</span> {$t('clients.analytics.charts.job_distribution.insight')}
                  </p>
                </div>
              </div>

              <!-- 3. Distribution by Workplace - Bar Chart -->
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="text-lg font-semibold text-gray-900">📊 {$t('clients.analytics.charts.top_workplaces.title')}</h3>
                  <span class="text-sm text-gray-500">{$t('clients.analytics.charts.top_workplaces.subtitle')}</span>
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
                    <div class="text-xs text-emerald-600">{$t('clients.analytics.charts.top_workplaces.total_workplaces')}</div>
                  </div>
                  <div class="text-center p-3 bg-emerald-50 rounded-lg">
                    <div class="text-lg font-bold text-emerald-700">{analytics.topWorkplace || 'N/A'}</div>
                    <div class="text-xs text-emerald-600">{$t('clients.analytics.charts.top_workplaces.top_partner')}</div>
                  </div>
                  <div class="text-center p-3 bg-emerald-50 rounded-lg">
                    <div class="text-lg font-bold text-emerald-700">{workplaceDistribution[0]?.percentage.toFixed(1) || 0}%</div>
                    <div class="text-xs text-emerald-600">{$t('clients.analytics.charts.top_workplaces.market_share')}</div>
                  </div>
                </div>
                <div class="mt-4 p-3 bg-emerald-50 rounded-lg">
                  <p class="text-sm text-emerald-800">
                    <span class="font-semibold">{$t('clients.analytics.charts.insight_label')}:</span> {$t('clients.analytics.charts.top_workplaces.insight')}
                  </p>
                </div>
              </div>

              <!-- Client Segments -->
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">{$t('clients.analytics.charts.client_segments.title')}</h3>
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
                  <h3 class="text-lg font-semibold text-gray-900 mb-6">{$t('clients.analytics.charts.predictive_insights.title')}</h3>
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
                            {$t('clients.analytics.charts.predictive_insights.confidence')}: {insight.confidence}%
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
                <h3 class="text-lg font-semibold text-gray-900 mb-6">{$t('clients.analytics.charts.job_distribution.title')}</h3>
                <div class="space-y-4">
                  {#each (showAllJobs ? jobDistribution : jobDistribution.slice(0, 8)) as job, index}
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-3">
                        <div class="w-4 h-4 rounded-full" style="background: {['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#06B6D4', '#8B5A2B', '#2D7D32', '#C2185B', '#7B1FA2', '#303F9F', '#0288D1', '#0097A7', '#00796B'][index % 16]};"></div>
                        <span class="font-medium text-gray-900">{job.jobName}</span>
                      </div>
                      <div class="flex items-center space-x-3">
                        <div class="w-32 bg-gray-200 rounded-full h-2">
                          <div class="h-2 rounded-full transition-all duration-500" style="width: {job.percentage}%; background: {['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#06B6D4', '#8B5A2B', '#2D7D32', '#C2185B', '#7B1FA2', '#303F9F', '#0288D1', '#0097A7', '#00796B'][index % 16]};"></div>
                        </div>
                        <span class="text-sm font-medium text-gray-600 w-12 text-right">{job.count}</span>
                        <span class="text-sm text-gray-500 w-12 text-right">{job.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  {/each}
                  {#if jobDistribution.length > 8}
                    <div class="flex items-center justify-center pt-4">
                      <button 
                        on:click={() => showAllJobs = !showAllJobs}
                        class="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        <span>
                          {showAllJobs ? $t('clients.analytics.charts.job_distribution.show_less') : $t('clients.analytics.charts.job_distribution.show_more', { count: jobDistribution.length - 8 })}
                        </span>
                        <svg 
                          class="w-4 h-4 transform transition-transform duration-200 {showAllJobs ? 'rotate-180' : ''}" 
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

              <!-- Phone Availability -->
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">{$t('clients.analytics.charts.contact_completeness.title')}</h3>
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
                    <h4 class="font-semibold text-gray-900">{$t('clients.analytics.charts.contact_completeness.phone_numbers')}</h4>
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
                    <h4 class="font-semibold text-gray-900">{$t('clients.analytics.charts.contact_completeness.email_addresses')}</h4>
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
                    <h4 class="font-semibold text-gray-900">{$t('clients.analytics.charts.contact_completeness.addresses')}</h4>
                    <p class="text-sm text-gray-600">{clients.length - dataQualityMetrics.missingData.address} of {clients.length} clients</p>
                  </div>
                </div>
              </div>

              <!-- Geographical Distribution -->
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">{$t('clients.analytics.charts.geographical_distribution.title')}</h3>
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
                <h3 class="text-lg font-semibold text-gray-900 mb-6">{$t('clients.analytics.charts.top_workplaces.title')}</h3>
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
                  <h3 class="text-lg font-semibold text-gray-900 mb-4">{$t('clients.analytics.charts.workplace_diversity.title')}</h3>
                  <div class="text-center">
                    <div class="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                      {workplaceDistribution.length}
                    </div>
                    <p class="text-gray-600">{$t('clients.analytics.charts.workplace_diversity.description')}</p>
                  </div>
                </div>

                <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-4">{$t('clients.analytics.charts.top_workplace.title')}</h3>
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
                <h3 class="text-lg font-semibold text-gray-900 mb-6">{$t('clients.analytics.charts.activity_levels.title')}</h3>
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
                  <h4 class="text-lg font-semibold mb-2">{$t('clients.analytics.charts.kpis.retention_rate.title')}</h4>
                  <div class="text-3xl font-bold mb-1">{analytics.retentionRate.toFixed(1)}%</div>
                  <p class="text-green-100 text-sm">{$t('clients.analytics.charts.kpis.retention_rate.description')}</p>
                </div>

                <div class="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 text-white">
                  <h4 class="text-lg font-semibold mb-2">{$t('clients.analytics.charts.kpis.avg_cessions.title')}</h4>
                  <div class="text-3xl font-bold mb-1">{analytics.avgCessionsPerClient.toFixed(1)}</div>
                  <p class="text-blue-100 text-sm">{$t('clients.analytics.charts.kpis.avg_cessions.description')}</p>
                </div>

                <div class="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
                  <h4 class="text-lg font-semibold mb-2">{$t('clients.analytics.charts.kpis.completion_rate.title')}</h4>
                  <div class="text-3xl font-bold mb-1">{analytics.completionRate.toFixed(1)}%</div>
                  <p class="text-purple-100 text-sm">{$t('clients.analytics.charts.kpis.completion_rate.description')}</p>
                </div>
              </div>
            </div>

          {:else if analyticsView === 'trends'}
            <!-- Trends Analytics -->
            <div class="space-y-8">
              <!-- Growth Trend Chart -->
              <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-6">{$t('clients.analytics.charts.growth_trends.title')}</h3>
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
                    <span>{$t('clients.analytics.charts.growth_trends.new_clients')}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 bg-blue-600 rounded"></div>
                    <span>{$t('clients.analytics.charts.growth_trends.cumulative_total')}</span>
                  </div>
                </div>
              </div>

              <!-- Data Quality Issues -->
              {#if dataQualityMetrics.duplicateCINs.length > 0 || dataQualityMetrics.duplicateWorkerNumbers.length > 0}
                <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-6">{$t('clients.analytics.charts.data_quality.title')}</h3>
                  <div class="space-y-4">
                    {#if dataQualityMetrics.duplicateCINs.length > 0}
                      <div class="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <h4 class="font-semibold text-red-900 mb-2">{$t('clients.analytics.charts.data_quality.duplicate_cin.title')}</h4>
                        <p class="text-red-700 text-sm mb-3">{$t('clients.analytics.charts.data_quality.duplicate_cin.description', { count: dataQualityMetrics.duplicateCINs.length })}</p>
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
                        <h4 class="font-semibold text-orange-900 mb-2">{$t('clients.analytics.charts.data_quality.duplicate_worker.title')}</h4>
                        <p class="text-orange-700 text-sm mb-3">{$t('clients.analytics.charts.data_quality.duplicate_worker.description', { count: dataQualityMetrics.duplicateWorkerNumbers.length })}</p>
                        <div class="space-y-2">
                          {#each dataQualityMetrics.duplicateWorkerNumbers.slice(0, 5) as duplicate}
                            <div class="flex items-center justify-between text-sm">
                              <span class="font-medium text-orange-800">{$t('common.worker_label')}: {duplicate.workerNumber}</span>
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
          <p class="text-gray-600 font-medium">{$t('clients.loading')}</p>
        </div>
      {:else if filteredClients.length === 0}
        <div class="text-center py-16">
          <div class="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">{$t('clients.count.no_clients_found')}</h3>
          <p class="text-gray-500 mb-6">
            {#if searchQuery || searchCIN || searchWorkerNumber || searchClientNumber}
              {$t('clients.count.try_adjusting_criteria')}
            {:else}
              {$t('clients.count.get_started')}
            {/if}
          </p>
          {#if !searchQuery && !searchCIN && !searchWorkerNumber && !searchClientNumber}
            <a
              href="/clients/new"
              class="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              {$t('clients.count.add_first_client')}
            </a>
          {:else}
            <button
              on:click={clearAllFilters}
              class="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
            >
              {$t('clients.search.clear_search')}
            </button>
          {/if}
        </div>
      {:else}
        <!-- Client Grid/List -->
        <div class="p-6">
          {#if viewMode === 'grid'}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              {#each filteredClients as client, index (client.id)}
                <div 
                  class="group bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer"
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
                      <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
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
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {emojiSupport.getStatusIndicator(true)} {$t('clients.status.active')}
                    </span>
                  </div>

                  <!-- Client Details -->
                  <div class="space-y-3 mb-6">
                    <div class="flex items-center text-sm text-gray-600">
                      <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
                      </svg>
                      <span class="font-medium">{$t('common.id_label')}:</span>
                      <span class="ml-1">{client.cin || $t('common.not_available')}</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-600">
                      <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                      </svg>
                      <span class="font-medium">{$t('common.worker_label')}:</span>
                      <span class="ml-1">{client.workerNumber || $t('common.not_available')}</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-600">
                      <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-9 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                      </svg>
                      <span class="font-medium">{$t('clients.details.workplace')}:</span>
                      <span class="ml-1 truncate">{client.workplaceName || $t('common.not_available')}</span>
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex space-x-2">
                    <button
                      on:click|stopPropagation={() => viewFullDetails(client.id)}
                      class="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      {$t('clients.details.cessions.table.view_details')}
                    </button>
                    <button
                      on:click|stopPropagation={() => createCession(client.id)}
                      class="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 text-sm font-medium"
                    >
                      {$t('clients.create_cession')}
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
                  class="group bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer"
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
                      <div class="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
                        {client.fullName ? client.fullName.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <h3 class="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                          {client.fullName}
                        </h3>
                        <div class="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{$t('common.id_label')}: {client.cin || $t('common.not_available')}</span>
                          <span>{$t('common.worker_label')}: {client.workerNumber || $t('common.not_available')}</span>
                          <span>{$t('common.client_label')}: {formatClientNumber(client.clientNumber)}</span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center space-x-3">
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {emojiSupport.getStatusIndicator(true)} {$t('clients.status.active')}
                      </span>
                      <div class="flex space-x-2">
                        <button
                          on:click|stopPropagation={() => viewFullDetails(client.id)}
                          class="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          {$t('clients.details.cessions.table.view_details')}
                        </button>
                        <button
                          on:click|stopPropagation={() => createCession(client.id)}
                          class="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 text-sm font-medium"
                        >
                          {$t('clients.create_cession')}
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

  <!-- Client Details Modal -->
  {#if isClientDetailsVisible && selectedClient}
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50" transition:fade>
      <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" transition:scale={{ duration: 300 }}>
        <div class="p-8">
          <div class="flex justify-between items-start mb-8">
            <div>
              <h2 class="text-3xl font-bold text-gray-900">{$t('clients.details.title')}</h2>
              <p class="text-gray-500 mt-1">{$t('clients.details.subtitle')}</p>
            </div>
            <button
              on:click|stopPropagation={(e) => {
                e.preventDefault();
                closeClientDetails();
              }}
              class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="Close modal"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Client Information -->
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
              <h3 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg class="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                {$t('clients.details.personal_info.title')}
              </h3>
              <div class="space-y-4">
                <div class="flex justify-between items-center py-3 border-b border-blue-100">
                  <span class="text-gray-600 font-medium">{$t('clients.details.personal_info.full_name')}</span>
                  <span class="text-gray-900 font-semibold">{selectedClient.fullName}</span>
                </div>
                <div class="flex justify-between items-center py-3 border-b border-blue-100">
                  <span class="text-gray-600 font-medium">{$t('clients.details.cin')}</span>
                  <span class="text-gray-900 font-semibold">{selectedClient.cin || $t('common.not_available')}</span>
                </div>
                <div class="flex justify-between items-center py-3 border-b border-blue-100">
                  <span class="text-gray-600 font-medium">{$t('clients.details.worker_number')}</span>
                  <span class="text-gray-900 font-semibold">{selectedClient.workerNumber || $t('common.not_available')}</span>
                </div>
                <div class="flex justify-between items-center py-3 border-b border-blue-100">
                  <span class="text-gray-600 font-medium">{$t('common.client_number')}</span>
                  <span class="text-gray-900 font-semibold">{formatClientNumber(selectedClient.clientNumber)}</span>
                </div>
                <div class="flex justify-between items-center py-3">
                  <span class="text-gray-600 font-medium">{$t('clients.details.personal_info.phone')}</span>
                  <span class="text-gray-900 font-semibold">{selectedClient.phone || $t('common.not_available')}</span>
                </div>
              </div>
            </div>
            
            <!-- Additional Information -->
            <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
              <h3 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg class="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                {$t('clients.details.work_info.title')}
              </h3>
              <div class="space-y-4">
                <div class="flex justify-between items-center py-3 border-b border-purple-100">
                  <span class="text-gray-600 font-medium">{$t('clients.details.personal_info.address')}</span>
                  <span class="text-gray-900 font-semibold">{selectedClient.address || $t('common.not_available')}</span>
                </div>
                <div class="flex justify-between items-center py-3 border-b border-purple-100">
                  <span class="text-gray-600 font-medium">{$t('clients.details.workplace')}</span>
                  <span class="text-gray-900 font-semibold">{workplaceDetails?.name || selectedClient.workplaceName || $t('common.not_available')}</span>
                </div>
                <div class="flex justify-between items-center py-3 border-b border-purple-100">
                  <span class="text-gray-600 font-medium">{$t('common.status')}</span>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {emojiSupport.getStatusIndicator(true)} {$t('clients.status.active')}
                  </span>
                </div>
                <div class="flex justify-between items-center py-3">
                  <span class="text-gray-600 font-medium">{$t('clients.details.cessions.active_cessions')}</span>
                  <span class="text-2xl font-bold text-purple-600">{countActiveCessions(selectedClient.id)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="mt-8 flex flex-col sm:flex-row justify-end gap-3" class:space-x-reverse={isRTL}>
            <div class="flex gap-3 order-2 sm:order-1">
              <button
                on:click|stopPropagation={async (e) => {
                  e.preventDefault();
                  closeClientDetails();
                }}
                class="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                {$t('common.actions.close')}
              </button>
              <button
                on:click|stopPropagation={async (e) => {
                  e.preventDefault();
                  await viewFullDetails(selectedClient.id);
                }}
                class="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
              >
                <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                {$t('common.details.view_full_details')}
              </button>
            </div>
            <button
              on:click|stopPropagation={async (e) => {
                e.preventDefault();
                await createCession(selectedClient.id);
              }}
              class="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium order-1 sm:order-2"
            >
              <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              {$t('clients.create_cession')}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <style>
    /* Custom Scrollbar for Futuristic Filters */
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border-radius: 10px;
      border: 2px solid rgba(255, 255, 255, 0.1);
    }

    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
    }

    /* Firefox */
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #8b5cf6 rgba(255, 255, 255, 0.1);
    }

    /* Enhanced Backdrop Blur Support */
    @supports (backdrop-filter: blur(20px)) {
      .backdrop-blur-xl {
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      }
    }

    /* Animated Gradient Background */
    @keyframes gradient-shift {
      0%, 100% { 
        background-position: 0% 50%;
      }
      50% { 
        background-position: 100% 50%;
      }
    }

    /* Floating Animation */
    @keyframes float {
      0%, 100% { 
        transform: translateY(0px);
      }
      50% { 
        transform: translateY(-10px);
      }
    }

    /* Pulse Glow Effect */
    @keyframes pulse-glow {
      0%, 100% { 
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
      }
      50% { 
        box-shadow: 0 0 30px rgba(139, 92, 246, 0.6);
      }
    }

    /* Custom animations for filter containers */
    .filter-container {
      animation: float 6s ease-in-out infinite;
    }

    .filter-container:nth-child(odd) {
      animation-delay: -3s;
    }

    /* Glassmorphism enhancement */
    .glass-effect {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    /* Interactive hover effects */
    .interactive-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    }

    /* Smooth transitions for all interactive elements */
    * {
      transition-property: transform, box-shadow, background-color, border-color;
      transition-duration: 0.3s;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    }
  </style>
</div>