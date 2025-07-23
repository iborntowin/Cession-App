<script lang="ts">
  // @ts-nocheck
  import { page } from '$app/stores';
  import { documentsApi, jobsApi, workplacesApi } from '$lib/api';
  import { onMount, tick } from 'svelte';
  import { showToast } from '$lib/toast';
  import { browser } from '$app/environment';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { showAlert, loading } from '$lib/stores';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { clientsApi, cessionsApi } from '$lib/api';
  import { t } from '$lib/i18n';
  import { format } from 'date-fns';

  // Check if we came from salary cessions page
  $: fromSalaryCessions = $page.url.searchParams.get('from') === 'salary-cessions';

  export let data;

  let client = data.client;
  let cessions = [];
  let idCard = null; // Will hold the NATIONAL_ID document
  let jobCard = null; // Will hold the JOB_CARD document
  let otherDocuments = []; // Will hold all other document types
  let jobDetails = null;
  let workplaceDetails = null;

  let isLoading = true;
  let activeTab = 'personal';
  let isEditing = false;

  onMount(async () => {
    if (data.error) {
      showAlert(data.error, 'error');
      return;
    }
    
    if (!client) {
      showAlert('Client not found', 'error');
      return;
    }
    
    await loadCessions();
    
    // Ensure browser-only code runs after component is mounted
    await tick();
  });

  async function loadCessions() {
    $loading = true;
    try {
      const response = await cessionsApi.getByClientId(data.id);
      if (response && Array.isArray(response)) {
        cessions = response;
      }
    } catch (error) {
      console.error('Error loading cessions:', error);
      showAlert(error.message || 'Failed to load cessions', 'error');
    } finally {
      $loading = false;
    }
  }

  async function loadDocuments() {
    try {
      const documents = await documentsApi.getByClientId(client.id);
      idCard = documents.find(doc => doc.documentType === 'ID_CARD');
      jobCard = documents.find(doc => doc.documentType === 'JOB_CARD');
      otherDocuments = documents.filter(doc => 
        doc.documentType !== 'ID_CARD' && doc.documentType !== 'JOB_CARD'
      );
    } catch (error) {
      console.error('Error loading documents:', error);
      showAlert('Failed to load documents', 'error');
    }
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy');
  }

  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('ar-TN', { style: 'currency', currency: 'TND' }).format(amount);
  }

  function getStatusClass(status) {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'finished':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  function createCession(clientId) {
    if (!clientId) {
      showAlert('Invalid client ID', 'error');
      return;
    }
    try {
      goto(`/cessions/new?clientId=${clientId}`);
    } catch (error) {
      console.error('Error navigating to cession creation:', error);
      showAlert('Failed to navigate to cession creation', 'error');
      
      // Fallback navigation if the goto fails
      if (browser) {
        window.location.href = `/cessions/new?clientId=${clientId}`;
      }
    }
  }
</script>

<svelte:head>
  <title>{$t('clients.details.title')} | {$t('common.app_name')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Back to Salary Cessions Button -->
    {#if fromSalaryCessions}
      <div class="mb-6">
        <a
          href="/salary-cessions"
          class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200 shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
          {$t('common.actions.back_to_salary_cessions') || 'Back to Salary Cessions'}
        </a>
      </div>
    {/if}

    {#if data.error}
      <div class="bg-red-50 text-red-700 p-4 rounded-xl shadow-sm border border-red-100" transition:fly={{ y: -20, duration: 300 }}>
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {data.error}
        </div>
      </div>
    {:else if !client}
      <div class="bg-yellow-50 text-yellow-700 p-4 rounded-xl shadow-sm border border-yellow-100" transition:fly={{ y: -20, duration: 300 }}>
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          {$t('clients.details.not_found')}
        </div>
      </div>
    {:else}
      <div class="lg:grid lg:grid-cols-12 lg:gap-8" transition:fly={{ y: 20, duration: 300, easing: cubicOut }}>
        <div class="lg:col-span-11">
          <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
            <div class="p-6 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <div>
                  <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{$t('clients.details.title')}</h1>
                  <p class="mt-1 text-sm text-gray-500">{$t('clients.details.subtitle')}</p>
                </div>
                <div class="flex space-x-4">
                  <a
                    href={`/clients/${client.id}/edit`}
                    class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
                  >
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                    </svg>
                    {$t('clients.details.actions.edit')}
                  </a>
                  <a
                    href={`/cessions/new?clientId=${client.id}`}
                    class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
                  >
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    {$t('clients.details.actions.create_cession')}
                  </a>
                </div>
              </div>
            </div>

            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white/60 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/20">
                  <h3 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">{$t('clients.details.personal_info.title')}</h3>
                  <dl class="grid grid-cols-1 gap-4">
                    <div class="bg-white/80 p-3 rounded-lg shadow-sm">
                      <dt class="text-sm font-medium text-purple-600">{$t('clients.details.personal_info.full_name')}</dt>
                      <dd class="mt-1 text-sm text-gray-900 font-medium">{client.fullName}</dd>
                    </div>
                    <div class="bg-white/80 p-3 rounded-lg shadow-sm">
                      <dt class="text-sm font-medium text-purple-600">{$t('clients.details.personal_info.cin')}</dt>
                      <dd class="mt-1 text-sm text-gray-900 font-medium">{client.cin}</dd>
                    </div>
                    <div class="bg-white/80 p-3 rounded-lg shadow-sm">
                      <dt class="text-sm font-medium text-purple-600">{$t('clients.details.personal_info.phone')}</dt>
                      <dd class="mt-1 text-sm text-gray-900 font-medium">{client.phoneNumber || $t('common.not_provided')}</dd>
                    </div>
                    <div class="bg-white/80 p-3 rounded-lg shadow-sm">
                      <dt class="text-sm font-medium text-purple-600">{$t('clients.details.personal_info.address')}</dt>
                      <dd class="mt-1 text-sm text-gray-900 font-medium">{client.address || $t('common.not_provided')}</dd>
                    </div>
                  </dl>
                </div>

                <div class="bg-white/60 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/20">
                  <h3 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">{$t('clients.details.work_info.title')}</h3>
                  <dl class="grid grid-cols-1 gap-4">
                    <div class="bg-white/80 p-3 rounded-lg shadow-sm">
                      <dt class="text-sm font-medium text-purple-600">{$t('clients.details.work_info.job')}</dt>
                      <dd class="mt-1 text-sm text-gray-900 font-medium">{client.jobName || $t('common.not_provided')}</dd>
                    </div>
                    <div class="bg-white/80 p-3 rounded-lg shadow-sm">
                      <dt class="text-sm font-medium text-purple-600">{$t('clients.details.work_info.workplace')}</dt>
                      <dd class="mt-1 text-sm text-gray-900 font-medium">{client.workplaceName || $t('common.not_provided')}</dd>
                    </div>
                    <div class="bg-white/80 p-3 rounded-lg shadow-sm">
                      <dt class="text-sm font-medium text-purple-600">{$t('clients.details.work_info.worker_number')}</dt>
                      <dd class="mt-1 text-sm text-gray-900 font-medium">{client.workerNumber || $t('common.not_provided')}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Cessions Section -->
          <div class="mt-8">
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
              <div class="p-6 border-b border-gray-200">
                <div class="flex items-center justify-between">
                  <h2 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{$t('clients.details.cessions.title')}</h2>
                  <a
                    href={`/cessions?clientId=${client.id}`}
                    class="text-sm text-purple-600 hover:text-purple-800 font-medium"
                  >
                    {$t('clients.details.cessions.view_all')}
                  </a>
                </div>
              </div>

              <div class="overflow-x-auto">
                {#if $loading}
                  <div class="flex justify-center items-center py-8">
                    <div class="relative">
                      <div class="w-12 h-12 border-4 border-purple-200 rounded-full animate-spin"></div>
                      <div class="absolute top-0 left-0 w-12 h-12 border-4 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
                    </div>
                  </div>
                {:else if cessions.length === 0}
                  <div class="text-center py-12">
                    <div class="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                    <p class="text-gray-500 font-medium">{$t('clients.details.cessions.no_cessions')}</p>
                    <a 
                      href={`/cessions/new?clientId=${client.id}`}
                      class="inline-flex items-center px-4 py-2 mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
                    >
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                      </svg>
                      {$t('clients.details.actions.create_cession')}
                    </a>
                  </div>
                {:else}
                  <div class="p-4">
                    <table class="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                      <thead class="bg-gray-50/80 backdrop-blur-sm">
                        <tr>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {$t('clients.details.cessions.table.id')}
                          </th>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {$t('clients.details.cessions.table.start_date')}
                          </th>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {$t('clients.details.cessions.table.amount')}
                          </th>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {$t('clients.details.cessions.table.status')}
                          </th>
                          <th scope="col" class="relative px-6 py-3">
                            <span class="sr-only">{$t('clients.details.cessions.table.actions')}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody class="bg-white/80 backdrop-blur-sm divide-y divide-gray-200">
                        {#each cessions as cession, i}
                          <tr class="hover:bg-purple-50/80 transition-colors duration-150" transition:fly={{ y: 10, delay: i * 50, duration: 200 }}>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {cession.id}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              <span dir="ltr">{formatDate(cession.startDate)}</span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                              {formatCurrency(cession.totalLoanAmount)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                              <span class="px-3 py-1 text-xs font-medium rounded-full shadow-sm {getStatusClass(cession.status)}">
                                {$t(`cessions.details.status.${cession.status.toLowerCase()}`)}
                              </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <a
                                href={`/cessions/${cession.id}`}
                                class="text-purple-600 hover:text-purple-900 font-medium"
                              >
                                {$t('clients.details.cessions.table.view_details')}
                              </a>
                            </td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  @container(max-width:120px){.table-ba57763e-d2b9-42ac-87a3-288b2624e2e3-column-120{display: none;}}
  @container(max-width:240px){.table-ba57763e-d2b9-42ac-87a3-288b2624e2e3-column-240{display: none;}}
  @container(max-width:360px){.table-ba57763e-d2b9-42ac-87a3-288b2624e2e3-column-360{display: none;}}
  @container(max-width:480px){.table-ba57763e-d2b9-42ac-87a3-288b2624e2e3-column-480{display: none;}}
</style>