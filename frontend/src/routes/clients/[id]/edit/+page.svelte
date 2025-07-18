<script lang="ts">
  import { page } from '$app/stores';
  import { clientsApi, workplacesApi, jobsApi } from '$lib/api';
  import { onMount } from 'svelte';
  import { showToast } from '$lib/toast';
  import { browser } from '$app/environment';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { showAlert, loading } from '$lib/stores';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { t } from '$lib/i18n';
  import Modal from '$lib/components/Modal.svelte';

  export let data;

  let client = null;
  let isLoading = true;
  let isSaving = false;
  let workplaces = [];
  let jobs = [];
  let filteredJobs = [];
  let selectedWorkplaceId = null;
  let cinError = '';
  let workerNumberError = '';
  let fullNameError = '';

  let formData = {
    fullName: '',
    cin: '',
    job: '',
    phoneNumber: '',
    workplace: '',
    address: '',
    jobId: null,
    workplaceId: null,
    workerNumber: ''
  };

  let showDeleteModal = false;
  let deleteConfirmInput = '';
  let deleteError = '';

  onMount(async () => {
    if (!data.client) {
      showAlert($t('clients.edit.not_found'), 'error');
      goto('/clients');
      return;
    }

    try {
      // Load workplaces and jobs
      const [workplacesResponse, jobsResponse] = await Promise.all([
        workplacesApi.getAll(),
        jobsApi.getAll()
      ]);
      workplaces = workplacesResponse;
      jobs = jobsResponse;

      client = data.client;
      formData = {
        fullName: client.fullName,
        cin: client.cin || '',
        job: client.job || '',
        phoneNumber: client.phoneNumber || '',
        workplace: client.workplace || '',
        address: client.address || '',
        jobId: client.jobId,
        workplaceId: client.workplaceId,
        workerNumber: client.workerNumber || ''
      };

      // Set selected workplace and filter jobs
      if (client.workplaceId) {
        selectedWorkplaceId = client.workplaceId;
        filteredJobs = jobs.filter(job => job.workplaceId === client.workplaceId);
      }

      isLoading = false;
    } catch (error) {
      console.error('Error loading data:', error);
      showAlert($t('clients.edit.load_error'), 'error');
      isLoading = false;
    }
  });

  // Update filtered jobs when workplace is selected
  $: if (selectedWorkplaceId) {
    filteredJobs = jobs.filter(job => job.workplaceId === selectedWorkplaceId);
    // Reset job selection if the current job is not in the filtered list
    if (formData.jobId && !filteredJobs.some(job => job.id === formData.jobId)) {
      formData.jobId = null;
    }
  } else {
    filteredJobs = [];
    formData.jobId = null;
  }

  // Handle workplace selection
  function handleWorkplaceChange(event) {
    const workplaceId = event.target.value;
    selectedWorkplaceId = workplaceId || null;
    formData.workplaceId = workplaceId || null;
    
    // Set address automatically based on selected workplace
    if (workplaceId) {
      const selectedWorkplace = workplaces.find(w => w.id === workplaceId);
      if (selectedWorkplace) {
        formData.address = selectedWorkplace.name;
      }
    }
  }

  // Handle job selection
  function handleJobChange(event) {
    const jobId = event.target.value;
    formData.jobId = jobId || null;
  }

  // Handle CIN input
  function handleCinInput(event) {
    let value = event.target.value.replace(/[^\d]/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    formData.cin = value;
    if (value.length === 0) {
      cinError = '';
    } else if (value.length !== 8) {
      cinError = 'Le numéro CIN doit comporter exactement 8 chiffres (ex: 01234567).';
    } else {
      cinError = '';
    }
  }
  // Handle Worker Number input
  function handleWorkerNumberInput(event) {
    let value = event.target.value.replace(/[^\d]/g, '');
    if (value.length > 10) value = value.slice(0, 10);
    formData.workerNumber = value;
    if (value.length === 0) {
      workerNumberError = '';
    } else if (value.length !== 10) {
      workerNumberError = 'Le numéro d\'employé doit comporter exactement 10 chiffres (ex: 0092423923).';
    } else {
      workerNumberError = '';
    }
  }

  async function handleSubmit() {
    fullNameError = '';
    cinError = '';
    workerNumberError = '';
    if (!formData.fullName) {
      fullNameError = 'Le nom complet est requis.';
    }
    if (!formData.cin || formData.cin.length !== 8) {
      cinError = 'Le numéro CIN doit comporter exactement 8 chiffres (ex: 01234567).';
    }
    if (!formData.workerNumber || formData.workerNumber.length !== 10) {
      workerNumberError = 'Le numéro d\'employé doit comporter exactement 10 chiffres (ex: 0092423923).';
    }
    if (fullNameError || cinError || workerNumberError) {
      showAlert('Veuillez corriger les erreurs du formulaire.', 'error');
      return;
    }
    isSaving = true;
    try {
      await clientsApi.update(client.id, formData);
      showAlert($t('clients.edit.success'), 'success');
      goto(`/clients/${client.id}`);
    } catch (error) {
      let backendMessage = error?.message || '';
      if (backendMessage && backendMessage.toLowerCase().includes('cin')) {
        cinError = backendMessage;
      } else if (backendMessage && backendMessage.toLowerCase().includes('employ')) {
        workerNumberError = backendMessage;
      } else if (backendMessage && backendMessage.toLowerCase().includes('nom')) {
        fullNameError = backendMessage;
      } else {
        showAlert(backendMessage || $t('clients.edit.error'), 'error');
      }
    } finally {
      isSaving = false;
    }
  }

  async function handleDeleteClient() {
    deleteError = '';
    if (deleteConfirmInput.trim() !== client.fullName) {
      deleteError = 'Le nom saisi ne correspond pas. Veuillez taper le nom complet du client pour confirmer.';
      return;
    }
    try {
      await clientsApi.delete(client.id);
      showAlert('Client et toutes ses cessions supprimés avec succès.', 'success');
      goto('/clients');
    } catch (error) {
      showAlert(error.message || 'Erreur lors de la suppression du client.', 'error');
    }
  }
</script>

<svelte:head>
  <title>{$t('clients.edit.title')} | {$t('common.app_name')}</title>
</svelte:head>

<div class="space-y-6">
  <PageHeader 
    title={$t('clients.edit.title')} 
    subtitle={$t('clients.edit.subtitle')}
    actions={[
      {
        label: $t('clients.edit.back_to_client'),
        href: `/clients/${client?.id}`,
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
        </svg>`
      }
    ]}
  />

  {#if isLoading}
    <div class="flex justify-center py-12">
      <Spinner isLoading={true} size="lg" />
    </div>
  {:else}
    <div class="max-w-2xl mx-auto">
      <div class="bg-white shadow-sm rounded-lg overflow-hidden">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">{$t('clients.edit.client_info')}</h3>
        </div>
        <form on:submit|preventDefault={handleSubmit} class="p-6 space-y-6">
          <div class="space-y-4">
            <div>
              <label for="fullName" class="block text-sm font-medium text-gray-700">
                {$t('clients.edit.full_name')} {$t('clients.edit.required_field')}
              </label>
              <input
                type="text"
                id="fullName"
                bind:value={formData.fullName}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm {fullNameError ? 'border-red-500 ring-red-500' : ''}"
                required
              />
              {#if fullNameError}
                <p class="text-xs text-red-600 mt-1">{fullNameError}</p>
              {/if}
            </div>

            <div>
              <label for="workplace" class="block text-sm font-medium text-gray-700">{$t('clients.edit.workplace')}</label>
              <select
                id="workplace"
                value={selectedWorkplaceId}
                on:change={handleWorkplaceChange}
                class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">{$t('clients.edit.select_workplace')}</option>
                {#each workplaces as workplace}
                  <option value={workplace.id}>{workplace.name}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="job" class="block text-sm font-medium text-gray-700">{$t('clients.edit.job')}</label>
              <select
                id="job"
                value={formData.jobId}
                on:change={handleJobChange}
                disabled={!selectedWorkplaceId}
                class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">{$t('clients.edit.select_job')}</option>
                {#each filteredJobs as job}
                  <option value={job.id}>{job.name}</option>
                {/each}
              </select>
            </div>

            <!-- CIN and Worker Number side by side -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="cin" class="block text-sm font-medium text-gray-700">
                  CIN (8-digit Number) *
                </label>
                <div class="mt-1 relative">
                  <input
                    type="text"
                    id="cin"
                    bind:value={formData.cin}
                    required
                    pattern="\d*"
                    inputmode="numeric"
                    maxlength="8"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm {cinError ? 'border-red-500 ring-red-500' : ''}"
                    placeholder="Enter 8-digit CIN"
                  />
                  <div class="absolute right-3 top-1/2 -translate-y-1/2">
                    <span class={`text-sm font-medium ${formData.cin.length === 8 ? 'text-green-600' : formData.cin.length === 0 ? 'text-gray-500' : 'text-yellow-600'}`}>{formData.cin.length}/8</span>
                  </div>
                </div>
                <div class="mt-2 h-2 w-full rounded-full bg-gray-200 relative overflow-hidden">
                  <div
                    class="absolute left-0 top-0 h-full transition-all duration-300 ease-out"
                    class:bg-green-500={formData.cin.length === 8}
                    class:bg-yellow-500={formData.cin.length > 0 && formData.cin.length < 8}
                    class:bg-gray-400={formData.cin.length === 0}
                    style="width: {(formData.cin.length / 8) * 100}%"
                  ></div>
                </div>
                <p class={`mt-1 text-sm ${formData.cin.length === 8 ? 'text-green-600' : formData.cin.length === 0 ? 'text-gray-500' : 'text-yellow-600'}`}>{formData.cin.length === 8 ? 'CIN valide' : formData.cin.length === 0 ? 'Veuillez entrer un numéro CIN' : 'Numéro CIN incomplet'}</p>
              </div>
              <div>
                <label for="workerNumber" class="block text-sm font-medium text-gray-700">
                  Worker Number (10-digit Number) *
                </label>
                <div class="mt-1 relative">
                  <input
                    type="text"
                    id="workerNumber"
                    bind:value={formData.workerNumber}
                    required
                    pattern="\d*"
                    inputmode="numeric"
                    maxlength="10"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm {workerNumberError ? 'border-red-500 ring-red-500' : ''}"
                    placeholder="Enter 10-digit worker number"
                  />
                  <div class="absolute right-3 top-1/2 -translate-y-1/2">
                    <span class={`text-sm font-medium ${formData.workerNumber.length === 10 ? 'text-green-600' : formData.workerNumber.length === 0 ? 'text-gray-500' : 'text-yellow-600'}`}>{formData.workerNumber.length}/10</span>
                  </div>
                </div>
                <div class="mt-2 h-2 w-full rounded-full bg-gray-200 relative overflow-hidden">
                  <div
                    class="absolute left-0 top-0 h-full transition-all duration-300 ease-out"
                    class:bg-green-500={formData.workerNumber.length === 10}
                    class:bg-yellow-500={formData.workerNumber.length > 0 && formData.workerNumber.length < 10}
                    class:bg-gray-400={formData.workerNumber.length === 0}
                    style="width: {(formData.workerNumber.length / 10) * 100}%"
                  ></div>
                </div>
                <p class={`mt-1 text-sm ${formData.workerNumber.length === 10 ? 'text-green-600' : formData.workerNumber.length === 0 ? 'text-gray-500' : 'text-yellow-600'}`}>{formData.workerNumber.length === 10 ? 'Numéro d\'employé valide' : formData.workerNumber.length === 0 ? 'Veuillez entrer un numéro d\'employé' : 'Numéro d\'employé incomplet'}</p>
              </div>
            </div>

            <div>
              <label for="address" class="block text-sm font-medium text-gray-700">{$t('clients.edit.address')}</label>
              <input
                type="text"
                id="address"
                bind:value={formData.address}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                readonly={selectedWorkplaceId !== null}
              />
            </div>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              on:click={() => goto(`/clients/${client.id}`)}
            >
              {$t('clients.edit.cancel')}
            </button>
            <button
              type="submit"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={isSaving}
            >
              {#if isSaving}
                <Spinner isLoading={true} size="sm" className="mr-2" />
                {$t('clients.edit.saving')}
              {:else}
                {$t('clients.edit.save_changes')}
              {/if}
            </button>
            <button
              type="button"
              class="inline-flex items-center px-4 py-2 border border-red-600 text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              on:click={() => { showDeleteModal = true; deleteConfirmInput = ''; deleteError = ''; }}
            >
              {$t('clients.edit.delete')}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
  <Modal show={showDeleteModal} on:close={() => showDeleteModal = false} variant="danger" title={$t('clients.edit.delete_confirm_title')}>
    <div class="p-2">
      <div class="mb-2 p-3 rounded bg-red-50 border border-red-200">
        <p class="text-sm text-red-700 font-semibold mb-1">{$t('clients.edit.delete_confirm_message', { name: client.fullName })}</p>
        <p class="text-sm text-gray-700">{$t('clients.edit.delete_confirm_instruction')}</p>
      </div>
      <input
        type="text"
        class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm mb-2 text-black placeholder-gray-400"
        placeholder={client.fullName}
        bind:value={deleteConfirmInput}
      />
      {#if deleteError}
        <p class="text-xs text-red-600 mb-2">{deleteError}</p>
      {/if}
      <div class="flex justify-end space-x-2 mt-4">
        <button
          type="button"
          class="px-4 py-2 rounded-md text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-700"
          on:click={() => showDeleteModal = false}
        >{$t('clients.edit.delete_cancel_button')}</button>
        <button
          type="button"
          class="px-4 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
          disabled={deleteConfirmInput.trim() !== client.fullName}
          on:click={handleDeleteClient}
        >{$t('clients.edit.delete_confirm_button')}</button>
      </div>
    </div>
  </Modal>
</div>
