<script lang="ts">
  import { onMount } from 'svelte';
  import { showAlert, loading } from '$lib/stores';
  import { fly, fade, slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { workplacesApi, jobsApi, clientsApi } from '$lib/api';
  import { t } from '$lib/i18n';

  let workplaces = [];
  let isAddingWorkplace = false;
  let isEditingWorkplace = false;
  let isEditingJob = false;
  let newWorkplaceName = '';
  let selectedWorkplace = null;
  let selectedJob = null;
  let isAddingJob = false;
  let newJobName = '';
  let expandedWorkplaces = new Set();
  
  // New features
  let viewMode = 'list'; // list, analytics, comparison
  let searchQuery = '';
  let clients = [];
  let analytics = {
    totalWorkplaces: 0,
    totalJobs: 0,
    totalClientsAssigned: 0,
    averageJobsPerWorkplace: 0,
    mostPopularWorkplace: null,
    workplacesWithoutJobs: 0,
    recentlyAddedWorkplaces: 0
  };
  let workplaceStats = [];
  let selectedComparison = [];
  let sortBy = 'clients'; // clients, jobs, name

  onMount(async () => {
    await loadWorkplaces();
    await loadClients();
    // Final analytics generation after both loads
    generateAnalytics();
    generateWorkplaceStats();
  });

  async function loadClients() {
    try {
      const response = await clientsApi.getAll();
      if (response && Array.isArray(response)) {
        clients = response;
        // Regenerate analytics when clients are loaded
        generateAnalytics();
        generateWorkplaceStats();
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }

  async function loadWorkplaces() {
    $loading = true;
    try {
      const response = await workplacesApi.getAll();
      if (response && Array.isArray(response)) {
        workplaces = response.map(workplace => ({
          ...workplace,
          jobs: workplace.jobs || []
        }));
        // Don't generate stats here - wait for clients to load first
      }
    } catch (error) {
      showAlert(error.message || $t('workplaces.error_loading'), 'error');
    } finally {
      $loading = false;
    }
  }
  
  // Generate comprehensive analytics
  function generateAnalytics() {
    const totalWorkplaces = workplaces.length;
    const totalJobs = workplaces.reduce((sum, w) => sum + (w.jobs?.length || 0), 0);
    
    // Count clients that have workplace information (either workplaceId or workplaceName)
    const totalClientsAssigned = clients.filter(c => c.workplaceId || c.workplaceName).length;
    const averageJobsPerWorkplace = totalWorkplaces > 0 ? (totalJobs / totalWorkplaces).toFixed(1) : 0;
    
    // Find most popular workplace by name
    const workplaceClientCounts = {};
    clients.forEach(client => {
      if (client.workplaceName) {
        const name = client.workplaceName.trim();
        workplaceClientCounts[name] = (workplaceClientCounts[name] || 0) + 1;
      }
    });
    
    const mostPopular = Object.entries(workplaceClientCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    const workplacesWithoutJobs = workplaces.filter(w => !w.jobs || w.jobs.length === 0).length;
    
    // Recently added workplaces (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentlyAddedWorkplaces = workplaces.filter(w => {
      if (w.createdAt) {
        return new Date(w.createdAt) >= thirtyDaysAgo;
      }
      return false;
    }).length;
    
    analytics = {
      totalWorkplaces,
      totalJobs,
      totalClientsAssigned,
      averageJobsPerWorkplace,
      mostPopularWorkplace: mostPopular ? { name: mostPopular[0], count: mostPopular[1] } : null,
      workplacesWithoutJobs,
      recentlyAddedWorkplaces
    };
  }
  
  // Generate detailed workplace statistics
  function generateWorkplaceStats() {
    workplaceStats = workplaces.map(workplace => {
      // Match clients by workplace name OR workplaceId
      const clientCount = clients.filter(c => {
        // Try matching by workplaceId first (UUID match)
        if (c.workplaceId && workplace.id && c.workplaceId === workplace.id) {
          return true;
        }
        // Fall back to matching by workplaceName (string match)
        if (c.workplaceName && workplace.name) {
          return c.workplaceName.trim() === workplace.name.trim();
        }
        return false;
      }).length;
      
      const jobCount = workplace.jobs?.length || 0;
      
      // Calculate job diversity score (0-100)
      const jobDiversityScore = jobCount > 0 ? Math.min(100, (jobCount / 20) * 100) : 0;
      
      // Calculate efficiency score based on clients per job
      const efficiencyScore = jobCount > 0 ? Math.min(100, (clientCount / jobCount) * 10) : 0;
      
      return {
        ...workplace,
        clientCount,
        jobCount,
        jobDiversityScore: jobDiversityScore.toFixed(1),
        efficiencyScore: efficiencyScore.toFixed(1),
        clientsPerJob: jobCount > 0 ? (clientCount / jobCount).toFixed(1) : 0
      };
    }).sort((a, b) => {
      if (sortBy === 'clients') return b.clientCount - a.clientCount;
      if (sortBy === 'jobs') return b.jobCount - a.jobCount;
      return a.name.localeCompare(b.name);
    });
  }
  
  // Filtered workplaces based on search
  $: filteredWorkplaces = workplaces.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.jobs?.some(j => j.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Reactive: Regenerate stats when workplaces, clients, or sortBy changes (but only if both are loaded)
  $: if (workplaces.length > 0 && clients.length >= 0 && (workplaces || clients || sortBy)) {
    // Use a small delay to batch multiple updates
    if (typeof window !== 'undefined') {
      clearTimeout(window.__workplaceStatsTimeout);
      window.__workplaceStatsTimeout = setTimeout(() => {
        generateAnalytics();
        generateWorkplaceStats();
      }, 100);
    }
  }
  
  // Toggle workplace for comparison
  function toggleComparison(workplaceId) {
    if (selectedComparison.includes(workplaceId)) {
      selectedComparison = selectedComparison.filter(id => id !== workplaceId);
    } else if (selectedComparison.length < 3) {
      selectedComparison = [...selectedComparison, workplaceId];
    } else {
      showAlert($t('workplaces.max_comparison_reached'), 'warning');
    }
  }
  
  // Get comparison data
  function getComparisonData() {
    return selectedComparison.map(id => {
      const workplace = workplaces.find(w => w.id === id);
      const stats = workplaceStats.find(ws => ws.id === id);
      return { ...workplace, ...stats };
    });
  }

  function toggleWorkplaceExpansion(workplaceId) {
    expandedWorkplaces.has(workplaceId) 
      ? expandedWorkplaces.delete(workplaceId)
      : expandedWorkplaces.add(workplaceId);
    expandedWorkplaces = expandedWorkplaces;
  }

  function startEditingWorkplace(workplace) {
    selectedWorkplace = { ...workplace };
    isEditingWorkplace = true;
    newWorkplaceName = workplace.name;
  }

  function startEditingJob(workplace, job) {
    selectedWorkplace = workplace;
    selectedJob = { ...job };
    isEditingJob = true;
    newJobName = job.name;
  }

  async function handleAddWorkplace() {
    if (!newWorkplaceName.trim()) {
      showAlert($t('common.required_field'), 'error');
      return;
    }

    $loading = true;
    try {
      const result = await workplacesApi.create({ name: newWorkplaceName });
      if (result.success) {
        workplaces = [...workplaces, result.data];
        newWorkplaceName = '';
        isAddingWorkplace = false;
        showAlert($t('workplaces.workplace_created'), 'success');
        generateAnalytics();
        generateWorkplaceStats();
      }
    } catch (error) {
      showAlert(error.message || $t('workplaces.error_creating'), 'error');
    } finally {
      $loading = false;
    }
  }

  async function handleUpdateWorkplace() {
    if (!selectedWorkplace || !newWorkplaceName.trim()) {
      showAlert($t('common.required_field'), 'error');
      return;
    }

    $loading = true;
    try {
      const result = await workplacesApi.update(selectedWorkplace.id, { name: newWorkplaceName });
      if (result.success) {
        workplaces = workplaces.map(w => 
          w.id === selectedWorkplace.id ? { ...w, name: newWorkplaceName } : w
        );
        cancelEdit();
        showAlert($t('workplaces.workplace_updated'), 'success');
      }
    } catch (error) {
      showAlert(error.message || $t('workplaces.error_updating'), 'error');
    } finally {
      $loading = false;
    }
  }

  async function handleAddJob() {
    if (!selectedWorkplace || !newJobName.trim()) {
      showAlert($t('common.required_field'), 'error');
      return;
    }

    $loading = true;
    try {
      const result = await jobsApi.create({
        name: newJobName,
        workplaceId: selectedWorkplace.id
      });
      
      if (result.success) {
        workplaces = workplaces.map(w => 
          w.id === selectedWorkplace.id 
            ? { ...w, jobs: [...w.jobs, result.data] } 
            : w
        );
        newJobName = '';
        isAddingJob = false;
        showAlert($t('workplaces.job_created'), 'success');
      }
    } catch (error) {
      showAlert(error.message || $t('workplaces.error_creating'), 'error');
    } finally {
      $loading = false;
    }
  }

  async function handleUpdateJob() {
    if (!selectedWorkplace || !selectedJob || !newJobName.trim()) {
      showAlert($t('common.required_field'), 'error');
      return;
    }

    $loading = true;
    try {
      const result = await jobsApi.update(selectedJob.id, { name: newJobName });
      if (result.success) {
        workplaces = workplaces.map(w => 
          w.id === selectedWorkplace.id
            ? { 
                ...w, 
                jobs: w.jobs.map(j => 
                  j.id === selectedJob.id ? { ...j, name: newJobName } : j
                )
              }
            : w
        );
        cancelEdit();
        showAlert($t('workplaces.job_updated'), 'success');
      }
    } catch (error) {
      showAlert(error.message || $t('workplaces.error_updating'), 'error');
    } finally {
      $loading = false;
    }
  }

  async function handleDeleteWorkplace(workplace) {
    if (!confirm('Are you sure you want to delete this workplace and all its jobs?')) return;

    $loading = true;
    try {
      const result = await workplacesApi.delete(workplace.id);
      if (result.success) {
        workplaces = workplaces.filter(w => w.id !== workplace.id);
        showAlert($t('workplaces.workplace_deleted'), 'success');
      }
    } catch (error) {
      showAlert(error.message || $t('workplaces.error_deleting'), 'error');
    } finally {
      $loading = false;
    }
  }

  async function handleDeleteJob(workplace, job) {
    if (!confirm('Are you sure you want to delete this job?')) return;

    $loading = true;
    try {
      const result = await jobsApi.delete(job.id);
      if (result.success) {
        workplaces = workplaces.map(w => 
          w.id === workplace.id
            ? { ...w, jobs: w.jobs.filter(j => j.id !== job.id) }
            : w
        );
        showAlert($t('workplaces.job_deleted'), 'success');
      }
    } catch (error) {
      showAlert(error.message || $t('workplaces.error_deleting'), 'error');
    } finally {
      $loading = false;
    }
  }

  function cancelEdit() {
    isAddingWorkplace = false;
    isEditingWorkplace = false;
    isEditingJob = false;
    isAddingJob = false;
    selectedWorkplace = null;
    selectedJob = null;
    newWorkplaceName = '';
    newJobName = '';
  }
</script>

<svelte:head>
  <title>Workplaces & Jobs | Cession Management</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
  <!-- Glassmorphism Header -->
  <div class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {$t('workplaces.title')}
              </h1>
              <p class="text-sm text-gray-500 font-medium">{$t('workplaces.subtitle')}</p>
            </div>
          </div>
        </div>
        
        <!-- View Mode Switcher -->
        <div class="flex items-center space-x-3">
          <div class="bg-white/60 backdrop-blur-sm rounded-xl p-1 shadow-sm flex space-x-1">
            <button
              on:click={() => viewMode = 'list'}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === 'list' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-white/80'}`}
            >
              <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
              List
            </button>
            <button
              on:click={() => viewMode = 'analytics'}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === 'analytics' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-white/80'}`}
            >
              <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              Analytics
            </button>
            <button
              on:click={() => viewMode = 'comparison'}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === 'comparison' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-white/80'}`}
            >
              <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/>
              </svg>
              Compare
            </button>
          </div>
        </div>
      </div>
      
      <!-- Search Bar -->
      {#if viewMode === 'list'}
        <div class="mt-4">
          <div class="relative">
            <svg class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Search workplaces and jobs..."
              class="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-white/20 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
            />
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="max-w-7xl mx-auto mt-8 space-y-6">
    
    <!-- Analytics Dashboard View -->
    {#if viewMode === 'analytics'}
      <div class="space-y-6" transition:fade={{ duration: 300 }}>
        <!-- Statistics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Total Workplaces -->
          <div class="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-purple-100 text-sm font-medium mb-1">Total Workplaces</p>
                <p class="text-4xl font-bold">{analytics.totalWorkplaces}</p>
                {#if analytics.recentlyAddedWorkplaces > 0}
                  <p class="text-purple-100 text-xs mt-2">+{analytics.recentlyAddedWorkplaces} this month</p>
                {/if}
              </div>
              <div class="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Total Jobs -->
          <div class="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-blue-100 text-sm font-medium mb-1">Total Job Positions</p>
                <p class="text-4xl font-bold">{analytics.totalJobs}</p>
                <p class="text-blue-100 text-xs mt-2">Avg {analytics.averageJobsPerWorkplace} per workplace</p>
              </div>
              <div class="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Total Clients -->
          <div class="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-emerald-100 text-sm font-medium mb-1">Clients Assigned</p>
                <p class="text-4xl font-bold">{analytics.totalClientsAssigned}</p>
                <p class="text-emerald-100 text-xs mt-2">Across all workplaces</p>
              </div>
              <div class="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Workplaces Without Jobs -->
          <div class="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-orange-100 text-sm font-medium mb-1">Need Attention</p>
                <p class="text-4xl font-bold">{analytics.workplacesWithoutJobs}</p>
                <p class="text-orange-100 text-xs mt-2">Workplaces without jobs</p>
              </div>
              <div class="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Most Popular Workplace -->
        {#if analytics.mostPopularWorkplace}
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">🏆 Most Popular Workplace</h3>
            <div class="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border-2 border-yellow-300">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  #1
                </div>
                <div>
                  <p class="font-bold text-gray-900 text-xl">{analytics.mostPopularWorkplace.name}</p>
                  <p class="text-gray-600 text-sm">Leading workplace by client count</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-3xl font-bold text-amber-600">{analytics.mostPopularWorkplace.count}</p>
                <p class="text-gray-600 text-sm">Clients</p>
              </div>
            </div>
          </div>
        {/if}

        <!-- Workplace Performance Leaderboard -->
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900">📊 Workplace Performance Leaderboard</h3>
            <select 
              bind:value={sortBy}
              on:change={generateWorkplaceStats}
              class="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
            >
              <option value="clients">Sort by Clients</option>
              <option value="jobs">Sort by Jobs</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
          
          <div class="space-y-3">
            {#each workplaceStats.slice(0, 10) as workplace, index}
              <div class="flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors duration-200" transition:slide={{ duration: 300, delay: index * 50 }}>
                <div class={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' : index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 'bg-gradient-to-r from-purple-500 to-indigo-600'}`}>
                  {index + 1}
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-2">
                    <p class="font-semibold text-gray-900">{workplace.name}</p>
                    <div class="flex items-center space-x-4 text-sm">
                      <span class="flex items-center space-x-1">
                        <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <span class="font-medium text-gray-700">{workplace.clientCount} clients</span>
                      </span>
                      <span class="flex items-center space-x-1">
                        <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                        <span class="font-medium text-gray-700">{workplace.jobCount} jobs</span>
                      </span>
                    </div>
                  </div>
                  
                  <!-- Performance Metrics -->
                  <div class="grid grid-cols-3 gap-3">
                    <div class="bg-white p-2 rounded-lg">
                      <p class="text-xs text-gray-500">Diversity Score</p>
                      <div class="flex items-center space-x-2 mt-1">
                        <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div class="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500" style="width: {workplace.jobDiversityScore}%"></div>
                        </div>
                        <span class="text-xs font-semibold text-gray-700">{workplace.jobDiversityScore}%</span>
                      </div>
                    </div>
                    <div class="bg-white p-2 rounded-lg">
                      <p class="text-xs text-gray-500">Efficiency</p>
                      <div class="flex items-center space-x-2 mt-1">
                        <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" style="width: {workplace.efficiencyScore}%"></div>
                        </div>
                        <span class="text-xs font-semibold text-gray-700">{workplace.efficiencyScore}%</span>
                      </div>
                    </div>
                    <div class="bg-white p-2 rounded-lg">
                      <p class="text-xs text-gray-500">Clients/Job</p>
                      <p class="text-sm font-semibold text-gray-900 mt-1">{workplace.clientsPerJob}</p>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Distribution Charts -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Client Distribution -->
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">👥 Client Distribution</h3>
            <div class="space-y-3">
              {#each workplaceStats.slice(0, 5) as workplace}
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium text-gray-700">{workplace.name}</span>
                    <span class="text-sm font-semibold text-gray-900">{workplace.clientCount}</span>
                  </div>
                  <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-1000"
                      style="width: {analytics.totalClientsAssigned > 0 ? (workplace.clientCount / analytics.totalClientsAssigned * 100) : 0}%"
                    ></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Job Distribution -->
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">💼 Job Distribution</h3>
            <div class="space-y-3">
              {#each workplaceStats.slice(0, 5) as workplace}
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium text-gray-700">{workplace.name}</span>
                    <span class="text-sm font-semibold text-gray-900">{workplace.jobCount}</span>
                  </div>
                  <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000"
                      style="width: {analytics.totalJobs > 0 ? (workplace.jobCount / analytics.totalJobs * 100) : 0}%"
                    ></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <!-- Insights Panel -->
        <div class="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
          <h3 class="text-xl font-bold mb-4 flex items-center">
            <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
            Key Insights
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p class="text-indigo-100 text-sm mb-1">Average Efficiency</p>
              <p class="text-2xl font-bold">{workplaceStats.length > 0 ? (workplaceStats.reduce((sum, w) => sum + parseFloat(w.efficiencyScore), 0) / workplaceStats.length).toFixed(1) : 0}%</p>
              <p class="text-indigo-100 text-xs mt-2">Across all workplaces</p>
            </div>
            <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p class="text-indigo-100 text-sm mb-1">Job Diversity Index</p>
              <p class="text-2xl font-bold">{workplaceStats.length > 0 ? (workplaceStats.reduce((sum, w) => sum + parseFloat(w.jobDiversityScore), 0) / workplaceStats.length).toFixed(1) : 0}%</p>
              <p class="text-indigo-100 text-xs mt-2">Overall workplace diversity</p>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Comparison View -->
    {#if viewMode === 'comparison'}
      <div class="space-y-6" transition:fade={{ duration: 300 }}>
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Select Workplaces to Compare (Max 3)</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {#each workplaces as workplace}
              <button
                on:click={() => toggleComparison(workplace.id)}
                class={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${selectedComparison.includes(workplace.id) ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-semibold text-gray-900">{workplace.name}</p>
                    <p class="text-sm text-gray-500">{workplace.jobs?.length || 0} jobs</p>
                  </div>
                  {#if selectedComparison.includes(workplace.id)}
                    <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                  {/if}
                </div>
              </button>
            {/each}
          </div>

          {#if selectedComparison.length > 0}
            <div class="space-y-6">
              <!-- Comparison Table -->
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b-2 border-gray-200">
                      <th class="text-left p-3 text-gray-600 font-semibold">Metric</th>
                      {#each getComparisonData() as workplace}
                        <th class="text-center p-3 text-gray-900 font-semibold">{workplace.name}</th>
                      {/each}
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="border-b border-gray-100 hover:bg-gray-50">
                      <td class="p-3 font-medium text-gray-700">Total Clients</td>
                      {#each getComparisonData() as workplace}
                        <td class="text-center p-3">
                          <span class="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl font-bold">
                            {workplace.clientCount || 0}
                          </span>
                        </td>
                      {/each}
                    </tr>
                    <tr class="border-b border-gray-100 hover:bg-gray-50">
                      <td class="p-3 font-medium text-gray-700">Total Jobs</td>
                      {#each getComparisonData() as workplace}
                        <td class="text-center p-3">
                          <span class="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-700 rounded-xl font-bold">
                            {workplace.jobCount || 0}
                          </span>
                        </td>
                      {/each}
                    </tr>
                    <tr class="border-b border-gray-100 hover:bg-gray-50">
                      <td class="p-3 font-medium text-gray-700">Clients per Job</td>
                      {#each getComparisonData() as workplace}
                        <td class="text-center p-3">
                          <span class="inline-flex items-center justify-center px-3 py-1 bg-purple-100 text-purple-700 rounded-lg font-semibold">
                            {workplace.clientsPerJob || 0}
                          </span>
                        </td>
                      {/each}
                    </tr>
                    <tr class="border-b border-gray-100 hover:bg-gray-50">
                      <td class="p-3 font-medium text-gray-700">Diversity Score</td>
                      {#each getComparisonData() as workplace}
                        <td class="text-center p-3">
                          <div class="flex items-center justify-center space-x-2">
                            <div class="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div class="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style="width: {workplace.jobDiversityScore}%"></div>
                            </div>
                            <span class="text-sm font-semibold text-gray-700">{workplace.jobDiversityScore}%</span>
                          </div>
                        </td>
                      {/each}
                    </tr>
                    <tr class="hover:bg-gray-50">
                      <td class="p-3 font-medium text-gray-700">Efficiency Score</td>
                      {#each getComparisonData() as workplace}
                        <td class="text-center p-3">
                          <div class="flex items-center justify-center space-x-2">
                            <div class="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style="width: {workplace.efficiencyScore}%"></div>
                            </div>
                            <span class="text-sm font-semibold text-gray-700">{workplace.efficiencyScore}%</span>
                          </div>
                        </td>
                      {/each}
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Winner Badges -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                {#each ['clientCount', 'jobCount', 'efficiencyScore'] as metric}
                  {@const winner = getComparisonData().reduce((best, current) => 
                    (parseFloat(current[metric]) || 0) > (parseFloat(best[metric]) || 0) ? current : best
                  )}
                  <div class="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-4 text-center">
                    <div class="text-3xl mb-2">🏆</div>
                    <p class="text-sm text-gray-600 mb-1">
                      {metric === 'clientCount' ? 'Most Clients' : metric === 'jobCount' ? 'Most Jobs' : 'Best Efficiency'}
                    </p>
                    <p class="font-bold text-gray-900">{winner.name}</p>
                    <p class="text-2xl font-bold text-amber-600 mt-1">
                      {metric === 'efficiencyScore' ? `${winner[metric]}%` : winner[metric]}
                    </p>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <div class="text-center py-12">
              <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <p class="text-gray-600">Select workplaces above to start comparing</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- List View (Original Content) -->
    {#if viewMode === 'list'}
    <!-- Add/Edit Workplace Card -->
    <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden" transition:fly={{ y: 20, duration: 300, easing: cubicOut }}>
      <div class="p-6 border-b border-gray-200/50 flex justify-between items-center">
        <h3 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          {isAddingWorkplace ? $t('workplaces.add_workplace') : isEditingWorkplace ? $t('workplaces.edit_workplace') : $t('workplaces.title')}
        </h3>
        <button
          on:click={() => isAddingWorkplace ? cancelEdit() : (isAddingWorkplace = true)}
          class="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
        >
          {#if isAddingWorkplace || isEditingWorkplace}
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            {$t('common.cancel')}
          {:else}
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            {$t('workplaces.add_workplace')}
          {/if}
        </button>
      </div>

      {#if isAddingWorkplace || isEditingWorkplace}
        <div class="p-6">
          <form on:submit|preventDefault={isEditingWorkplace ? handleUpdateWorkplace : handleAddWorkplace} class="space-y-4">
            <div>
              <label for="workplaceName" class="block text-sm font-medium text-purple-600 mb-2">{$t('workplaces.workplace_name')}</label>
              <input
                type="text"
                id="workplaceName"
                bind:value={newWorkplaceName}
                class="w-full pl-4 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
                placeholder={$t('workplaces.enter_workplace_name')}
                required
              />
            </div>
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                on:click={cancelEdit}
                class="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                {$t('common.cancel')}
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
              >
                {isEditingWorkplace ? $t('common.update') : $t('workplaces.add_workplace')}
              </button>
            </div>
          </form>
        </div>
      {/if}
    </div>

    <!-- Workplaces List -->
    <div class="space-y-4">
{#each filteredWorkplaces as workplace, index (workplace.id)}
  <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden" transition:fly={{ y: 20, duration: 300, delay: 50 * index, easing: cubicOut }}>
          <!-- Workplace Header -->
          <div class="p-6 border-b border-gray-200/50 flex justify-between items-center cursor-pointer" on:click={() => toggleWorkplaceExpansion(workplace.id)} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleWorkplaceExpansion(workplace.id); } }} role="button" tabindex="0">
            <div class="flex items-center space-x-4">
              <div class={`transform transition-transform ${expandedWorkplaces.has(workplace.id) ? 'rotate-90' : ''}`}>
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-medium text-gray-900">{workplace.name}</h3>
                <p class="text-sm text-gray-500">{workplace.jobs.length} {workplace.jobs.length === 1 ? 'job' : 'jobs'}</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button
                on:click|stopPropagation={() => startEditingWorkplace(workplace)}
                class="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                title={$t('workplaces.edit_workplace')}
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button
                on:click|stopPropagation={() => handleDeleteWorkplace(workplace)}
                class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                title={$t('workplaces.delete_workplace')}
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>

          {#if expandedWorkplaces.has(workplace.id)}
            <div class="p-6 space-y-4">
              <!-- Add Job Section -->
              <div class="flex justify-between items-center">
                <h4 class="text-md font-medium text-gray-700">{$t('workplaces.jobs_list')}</h4>
                <button
                  on:click={() => {
                    selectedWorkplace = workplace;
                    isAddingJob = !isAddingJob;
                  }}
                  class="flex items-center px-3 py-1.5 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                >
                  {#if isAddingJob && selectedWorkplace?.id === workplace.id}
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    {$t('common.cancel')}
                  {:else}
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    {$t('workplaces.add_job')}
                  {/if}
                </button>
              </div>

              {#if isAddingJob && selectedWorkplace?.id === workplace.id}
                <div class="bg-gray-50 p-4 rounded-xl">
                  <form on:submit|preventDefault={handleAddJob} class="space-y-4">
                    <div>
                      <label for="jobName" class="block text-sm font-medium text-purple-600 mb-2">{$t('workplaces.job_name')}</label>
                      <input
                        type="text"
                        id="jobName"
                        bind:value={newJobName}
                        class="w-full pl-4 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
                        placeholder={$t('workplaces.enter_job_name')}
                        required
                      />
                    </div>
                    <div class="flex justify-end space-x-3">
                      <button
                        type="button"
                        on:click={() => isAddingJob = false}
                        class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm"
                      >
                        {$t('common.cancel')}
                      </button>
                      <button
                        type="submit"
                        class="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                      >
                        {$t('workplaces.add_job')}
                      </button>
                    </div>
                  </form>
                </div>
              {/if}

              {#if isEditingJob && selectedWorkplace?.id === workplace.id}
                <div class="bg-gray-50 p-4 rounded-xl">
                  <form on:submit|preventDefault={handleUpdateJob} class="space-y-4">
                    <div>
                      <label for="editJobName" class="block text-sm font-medium text-purple-600 mb-2">{$t('workplaces.job_name')}</label>
                      <input
                        type="text"
                        id="editJobName"
                        bind:value={newJobName}
                        class="w-full pl-4 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
                        placeholder={$t('workplaces.enter_job_name')}
                        required
                      />
                    </div>
                    <div class="flex justify-end space-x-3">
                      <button
                        type="button"
                        on:click={cancelEdit}
                        class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm"
                      >
                        {$t('common.cancel')}
                      </button>
                      <button
                        type="submit"
                        class="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                      >
                        {$t('common.update')}
                      </button>
                    </div>
                  </form>
                </div>
              {/if}

              <!-- Jobs List -->
              {#if workplace.jobs.length > 0}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {#each workplace.jobs as job (job.id)}
                    <div class="bg-gray-50/50 hover:bg-gray-100/50 rounded-xl p-4 flex justify-between items-center transition-colors">
                      <span class="font-medium text-gray-900">{job.name}</span>
                      <div class="flex space-x-2">
                        <button
                          on:click={() => startEditingJob(workplace, job)}
                          class="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title={$t('workplaces.edit_job')}
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button
                          on:click={() => handleDeleteJob(workplace, job)}
                          class="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title={$t('workplaces.delete_job')}
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="text-center py-6 bg-gray-50/50 rounded-xl">
                  <svg class="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <p class="mt-2 text-sm text-gray-500">{$t('workplaces.no_jobs')}</p>
                  <button
                    on:click={() => {
                      selectedWorkplace = workplace;
                      isAddingJob = true;
                    }}
                    class="mt-3 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                  >
                    {$t('workplaces.add_job')}
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {:else}
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 text-center">
          <svg class="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900">{$t('workplaces.no_workplaces')}</h3>
          <p class="mt-2 text-gray-500">{$t('workplaces.no_workplaces_desc')}</p>
          <button
            on:click={() => isAddingWorkplace = true}
            class="mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            {$t('workplaces.add_workplace')}
          </button>
        </div>
      {/each}
    </div>
    {/if}
  </div>
</div>