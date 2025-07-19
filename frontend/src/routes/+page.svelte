<script>
  import { onMount } from 'svelte';
  import { clientsApi, cessionsApi } from '$lib/api';
  import { loading, showAlert } from '$lib/stores';
  import { format } from 'date-fns';
  import { t } from '$lib/i18n';
  
  let clients = [];
  let recentCessions = [];
  let activeCessionsCount = 0;
  let finishedCessionsCount = 0;
  let totalClients = 0;
  
  onMount(async () => {
    await loadDashboardData();
  });
  
  async function loadDashboardData() {
    $loading = true;
    try {
      // Load summary data
      await Promise.all([
        loadClients(),
        loadRecentCessions(),
        loadCessionStats()
      ]);
    } catch (error) {
      showAlert(error.message || 'Failed to load dashboard data', 'error');
    } finally {
      $loading = false;
    }
  }
  
  async function loadClients() {
    try {
      clients = await clientsApi.getAll();
      totalClients = clients.length;
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  }
  
  async function loadRecentCessions() {
    try {
      // Get all cessions and sort by creation date (newest first)
      const allCessions = await cessionsApi.getAll();
      recentCessions = allCessions
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5); // Get only the 5 most recent
    } catch (error) {
      console.error('Failed to load recent cessions:', error);
    }
  }
  
  async function loadCessionStats() {
    try {
      const allCessions = await cessionsApi.getAll();
      activeCessionsCount = allCessions.filter(c => c.status === 'ACTIVE').length;
      finishedCessionsCount = allCessions.filter(c => c.status === 'FINISHED').length;
    } catch (error) {
      console.error('Failed to load cession stats:', error);
    }
  }
  
  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(amount);
  }
  
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd/MM/yyyy');
  }
</script>

<svelte:head>
  <title>{$t('dashboard.title')} | {$t('common.app.title')}</title>
</svelte:head>

<div>
  <h1 class="text-2xl font-bold text-gray-800 mb-6">{$t('dashboard.title')}</h1>
  
  {#if $loading}
    <div class="text-center py-8">
      <p>{$t('common.loading')}</p>
    </div>
  {:else}
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="card bg-primary-50 border-l-4 border-primary-500">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-primary-100 text-primary-800 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-500">{$t('dashboard.stats.total_clients')}</p>
            <p class="text-xl font-bold">{totalClients}</p>
          </div>
        </div>
      </div>
      
      <div class="card bg-green-50 border-l-4 border-green-500">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-green-100 text-green-800 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-500">{$t('dashboard.stats.active_cessions')}</p>
            <p class="text-xl font-bold">{activeCessionsCount}</p>
          </div>
        </div>
      </div>
      
      <div class="card bg-blue-50 border-l-4 border-blue-500">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-blue-100 text-blue-800 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-500">{$t('dashboard.stats.finished_cessions')}</p>
            <p class="text-xl font-bold">{finishedCessionsCount}</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <a href="/clients/new" class="card bg-white hover:bg-gray-50 transition-colors cursor-pointer">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-primary-100 text-primary-800 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900">{$t('dashboard.actions.new_client')}</p>
            <p class="text-sm text-gray-500">{$t('dashboard.actions.new_client_desc')}</p>
          </div>
        </div>
      </a>

      <a href="/salary-cessions" class="card bg-white hover:bg-gray-50 transition-colors cursor-pointer">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-green-100 text-green-800 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900">{$t('dashboard.actions.salary_cessions')}</p>
            <p class="text-sm text-gray-500">{$t('dashboard.actions.salary_cessions_desc')}</p>
          </div>
        </div>
      </a>

      <a href="/workplaces" class="card bg-white hover:bg-gray-50 transition-colors cursor-pointer">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-blue-100 text-blue-800 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900">{$t('dashboard.actions.workplaces')}</p>
            <p class="text-sm text-gray-500">{$t('dashboard.actions.workplaces_desc')}</p>
          </div>
        </div>
      </a>

      <a href="/payments" class="card bg-white hover:bg-gray-50 transition-colors cursor-pointer">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-amber-100 text-amber-800 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900">{$t('dashboard.actions.payments')}</p>
            <p class="text-sm text-gray-500">{$t('dashboard.actions.payments_desc')}</p>
          </div>
        </div>
      </a>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Clients -->
      <div class="card">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold">{$t('dashboard.recent_clients.title')}</h2>
          <a href="/clients" class="text-primary-600 hover:text-primary-800 text-sm">{$t('common.view_all')}</a>
        </div>
        
        {#if clients.length === 0}
          <p class="text-gray-500">{$t('dashboard.recent_clients.empty')}</p>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('dashboard.recent_clients.columns.name')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('dashboard.recent_clients.columns.cin')}</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('dashboard.recent_clients.columns.action')}</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each clients.slice(0, 5) as client}
                  <tr>
                    <td class="px-4 py-3 whitespace-nowrap">{client.fullName}</td>
                    <td class="px-4 py-3 whitespace-nowrap">{client.cin}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-right">
                      <a href={`/clients/${client.id}`} class="text-primary-600 hover:text-primary-800">{$t('common.view')}</a>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
      
      <!-- Recent Cessions -->
      <div class="card">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold">{$t('dashboard.recent_cessions.title')}</h2>
          <a href="/cessions" class="text-primary-600 hover:text-primary-800 text-sm">{$t('common.view_all')}</a>
        </div>
        
        {#if recentCessions.length === 0}
          <p class="text-gray-500">{$t('dashboard.recent_cessions.empty')}</p>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('dashboard.recent_cessions.columns.client')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('dashboard.recent_cessions.columns.amount')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('dashboard.recent_cessions.columns.status')}</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('dashboard.recent_cessions.columns.action')}</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each recentCessions as cession}
                  <tr>
                    <td class="px-4 py-3 whitespace-nowrap">{cession.clientName}</td>
                    <td class="px-4 py-3 whitespace-nowrap">{formatCurrency(cession.totalLoanAmount)}</td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {cession.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}">
                        {$t(`dashboard.recent_cessions.status.${cession.status.toLowerCase()}`)}
                      </span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-right">
                      <a href={`/cessions/${cession.id}`} class="text-primary-600 hover:text-primary-800">{$t('common.view')}</a>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
