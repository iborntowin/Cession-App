<script lang="ts">
  // @ts-nocheck
  import { page } from '$app/stores';
  import { documentsApi, jobsApi, workplacesApi } from '$lib/api';
  import { onMount } from 'svelte';
  import { showToast } from '$lib/toast';
  import { browser } from '$app/environment';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { showAlert, loading } from '$lib/stores';
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
        return 'bg-green-100 text-green-800';
      case 'finished':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    }
  }
</script>

<svelte:head>
  <title>{$t('clients.details.title')} | {$t('common.app_name')}</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <!-- Back to Salary Cessions Button -->
  {#if fromSalaryCessions}
    <div class="mb-6">
      <button
        on:click={() => goto('/salary-cessions')}
        class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
        </svg>
        {$t('common.actions.back_to_salary_cessions') || 'Back to Salary Cessions'}
      </button>
    </div>
  {/if}

  {#if data.error}
    <div class="bg-red-50 text-red-700 p-4 rounded-md">
      {data.error}
    </div>
  {:else if !client}
    <div class="bg-yellow-50 text-yellow-700 p-4 rounded-md">
      {$t('clients.details.not_found')}
    </div>
  {:else}
    <div class="lg:grid lg:grid-cols-12 lg:gap-8">
      <div class="lg:col-span-11">
        <div class="bg-white shadow-sm rounded-lg overflow-hidden">
          <div class="p-6 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-2xl font-bold text-gray-900">{$t('clients.details.title')}</h1>
                <p class="mt-1 text-sm text-gray-500">{$t('clients.details.subtitle')}</p>
              </div>
              <div class="flex space-x-4">
                <a
                  href={`/clients/${client.id}/edit`}
                  class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {$t('clients.details.actions.edit')}
                </a>
                <button
                  on:click={() => createCession(client.id)}
                  class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {$t('clients.details.actions.create_cession')}
                </button>
              </div>
            </div>
          </div>

          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">{$t('clients.details.personal_info.title')}</h3>
                <dl class="grid grid-cols-1 gap-4">
                  <div>
                    <dt class="text-sm font-medium text-gray-500">{$t('clients.details.personal_info.full_name')}</dt>
                    <dd class="mt-1 text-sm text-gray-900">{client.fullName}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">{$t('clients.details.personal_info.cin')}</dt>
                    <dd class="mt-1 text-sm text-gray-900">{client.cin}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">{$t('clients.details.personal_info.phone')}</dt>
                    <dd class="mt-1 text-sm text-gray-900">{client.phoneNumber || $t('common.not_provided')}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">{$t('clients.details.personal_info.address')}</dt>
                    <dd class="mt-1 text-sm text-gray-900">{client.address || $t('common.not_provided')}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">{$t('clients.details.work_info.title')}</h3>
                <dl class="grid grid-cols-1 gap-4">
                  <div>
                    <dt class="text-sm font-medium text-gray-500">{$t('clients.details.work_info.job')}</dt>
                    <dd class="mt-1 text-sm text-gray-900">{client.jobName || $t('common.not_provided')}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">{$t('clients.details.work_info.workplace')}</dt>
                    <dd class="mt-1 text-sm text-gray-900">{client.workplaceName || $t('common.not_provided')}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">{$t('clients.details.work_info.worker_number')}</dt>
                    <dd class="mt-1 text-sm text-gray-900">{client.workerNumber || $t('common.not_provided')}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <!-- Cessions Section -->
        <div class="mt-8">
          <div class="bg-white shadow-sm rounded-lg overflow-hidden">
            <div class="p-6 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-medium text-gray-900">{$t('clients.details.cessions.title')}</h2>
                <a
                  href={`/cessions?clientId=${client.id}`}
                  class="text-sm text-primary-600 hover:text-primary-900"
                >
                  {$t('clients.details.cessions.view_all')}
                </a>
              </div>
            </div>

            <div class="overflow-x-auto">
              {#if $loading}
                <div class="flex justify-center items-center py-8">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              {:else if cessions.length === 0}
                <div class="text-center py-8">
                  <p class="text-gray-500">{$t('clients.details.cessions.no_cessions')}</p>
                </div>
              {:else}
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
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
                  <tbody class="bg-white divide-y divide-gray-200">
                    {#each cessions as cession}
                      <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {cession.id}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span dir="ltr">{formatDate(cession.startDate)}</span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(cession.totalLoanAmount)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusClass(cession.status)}">
                            {$t(`cessions.details.status.${cession.status.toLowerCase()}`)}
                          </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <a
                            href={`/cessions/${cession.id}`}
                            class="text-primary-600 hover:text-primary-900"
                          >
                            {$t('clients.details.cessions.table.view_details')}
                          </a>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  @container(max-width:120px){.table-ba57763e-d2b9-42ac-87a3-288b2624e2e3-column-120{display: none;}}
  @container(max-width:240px){.table-ba57763e-d2b9-42ac-87a3-288b2624e2e3-column-240{display: none;}}
  @container(max-width:360px){.table-ba57763e-d2b9-42ac-87a3-288b2624e2e3-column-360{display: none;}}
  @container(max-width:480px){.table-ba57763e-d2b9-42ac-87a3-288b2624e2e3-column-480{display: none;}}
</style>

