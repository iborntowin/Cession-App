<script lang="ts">
  import { clientsApi, documentsApi, workplacesApi, jobsApi } from '$lib/api';
  import { onMount } from 'svelte';
  import { showToast } from '$lib/toast';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { showAlert, loading } from '$lib/stores';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import { t } from '$lib/i18n';

  let isSaving = false;
  let workplaces = [];
  let jobs = [];
  let filteredJobs = [];
  let selectedWorkplaceId = null;
  let showDocuments = false;

  let formData = {
    fullName: '',
    cin: '',
    job: '',
    phoneNumber: '',
    workplace: '',
    address: '',
    jobId: null,
    workerNumber: '',
    workplaceId: null
  };

  let idCardFile = null;
  let jobCardFile = null;
  let otherDocuments = [];

  let cinLength = 0;
  let cinInput = '';
  let cinDuplicateCheck = { exists: false, checking: false, clientId: null };

  let workerNumberLength = 0;
  let workerNumberInput = '';
  let workerNumberDuplicateCheck = { exists: false, checking: false, clientId: null };

  // Reactive status calculations
  $: cinStatus = getCinStatusValue(cinLength, cinDuplicateCheck);
  $: workerNumberStatus = getWorkerNumberStatusValue(workerNumberLength, workerNumberDuplicateCheck);
  
  // Reactive status messages
  $: cinStatusMessage = getCinStatusMessage(cinStatus, cinLength, cinDuplicateCheck);
  $: workerNumberStatusMessage = getWorkerNumberStatusMessage(workerNumberStatus, workerNumberLength, workerNumberDuplicateCheck);

  // Functions to calculate status values
  function getCinStatusValue(length, duplicateCheck) {
    if (length === 0) {
      return 'empty';
    } else if (length < 8) {
      return 'invalid';
    } else if (length === 8) {
      if (duplicateCheck.checking) {
        return 'checking';
      } else if (duplicateCheck.exists) {
        return 'duplicate';
      } else {
        return 'valid';
      }
    }
    return 'empty';
  }

  function getWorkerNumberStatusValue(length, duplicateCheck) {
    if (length === 0) {
      return 'empty';
    } else if (length < 10) {
      return 'invalid';
    } else if (length === 10) {
      if (duplicateCheck.checking) {
        return 'checking';
      } else if (duplicateCheck.exists) {
        return 'duplicate';
      } else {
        return 'valid';
      }
    }
    return 'empty';
  }

  let phoneNumberLength = 0;
  let phoneNumberStatus = 'empty';
  let phoneNumberInput = '';

  onMount(async () => {
    try {
      // Load workplaces
      const workplacesResponse = await workplacesApi.getAll();
      workplaces = workplacesResponse;

      // Load all jobs
      const jobsResponse = await jobsApi.getAll();
      jobs = jobsResponse;
    } catch (error) {
      console.error('Error loading data:', error);
      showAlert('Failed to load workplaces and jobs', 'error');
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
    
    // Set workplace name and address based on selected workplace
    if (workplaceId) {
      const selectedWorkplace = workplaces.find(w => w.id === workplaceId);
      if (selectedWorkplace) {
        formData.workplace = selectedWorkplace.name;
        formData.address = selectedWorkplace.name;
      }
    } else {
      formData.workplace = '';
      formData.address = '';
    }
  }

  // Handle job selection
  function handleJobChange(event) {
    const jobId = event.target.value;
    formData.jobId = jobId || null;
    
    // Set job name based on selected job
    if (jobId) {
      const selectedJob = jobs.find(j => j.id === jobId);
      if (selectedJob) {
        formData.job = selectedJob.name;
      }
    } else {
      formData.job = '';
    }
  }

  // Debounce timers for duplicate checking
  let cinDebounceTimer = null;
  let workerNumberDebounceTimer = null;

  // Handle CIN input changes
  function handleCinInput(event) {
    let value = event.target.value.replace(/[^\d]/g, '').slice(0, 8);
    cinInput = value;
    cinLength = value.length;
    formData.cin = value;
    
    // Reset duplicate check when input changes
    cinDuplicateCheck = { exists: false, checking: false };
    
    // Check for duplicates if CIN is complete
    if (cinLength === 8) {
      checkCinDuplicate(value);
    }
  }

  // Handle Worker Number input changes
  function handleWorkerNumberInput(event) {
    let value = event.target.value.replace(/[^\d]/g, '').slice(0, 10);
    workerNumberInput = value;
    workerNumberLength = value.length;
    formData.workerNumber = value;
    
    // Reset duplicate check when input changes
    workerNumberDuplicateCheck = { exists: false, checking: false };
    
    // Check for duplicates if Worker Number is complete
    if (workerNumberLength === 10) {
      checkWorkerNumberDuplicate(value);
    }
  }

  // Debounced function to check CIN duplicates
  async function checkCinDuplicate(cin) {
    if (cinDebounceTimer) clearTimeout(cinDebounceTimer);
    
    cinDebounceTimer = setTimeout(async () => {
      cinDuplicateCheck = { exists: false, checking: true, clientId: null };
      try {
        const result = await clientsApi.checkDuplicate(cin, null);
        if (result.success) {
          cinDuplicateCheck = { 
            exists: result.data.cinExists, 
            checking: false, 
            clientId: result.data.cinClientId 
          };
        } else {
          cinDuplicateCheck = { exists: false, checking: false, clientId: null };
        }
      } catch (error) {
        console.error('Error checking CIN duplicate:', error);
        cinDuplicateCheck = { exists: false, checking: false, clientId: null };
      }
    }, 500); // 500ms debounce
  }

  // Debounced function to check Worker Number duplicates
  async function checkWorkerNumberDuplicate(workerNumber) {
    if (workerNumberDebounceTimer) clearTimeout(workerNumberDebounceTimer);
    
    workerNumberDebounceTimer = setTimeout(async () => {
      workerNumberDuplicateCheck = { exists: false, checking: true, clientId: null };
      try {
        const result = await clientsApi.checkDuplicate(null, workerNumber);
        if (result.success) {
          workerNumberDuplicateCheck = { 
            exists: result.data.workerNumberExists, 
            checking: false, 
            clientId: result.data.workerNumberClientId 
          };
        } else {
          workerNumberDuplicateCheck = { exists: false, checking: false, clientId: null };
        }
      } catch (error) {
        console.error('Error checking Worker Number duplicate:', error);
        workerNumberDuplicateCheck = { exists: false, checking: false, clientId: null };
      }
    }, 500); // 500ms debounce
  }

  // Get color for the background track of the CIN bar - ALWAYS GRAY
  function getCinBarTrackColor() {
    return 'bg-gray-200';
        }

  // Update the progress bar color logic for CIN and Worker Number:
  function getCinBarFillColor() {
    if (cinStatus === 'duplicate') return 'bg-red-500';
    if (cinStatus === 'valid') return 'bg-green-500';
    if (cinStatus === 'checking') return 'bg-blue-500';
    if (cinStatus === 'invalid') return 'bg-yellow-500';
    return 'bg-gray-400';
  }

  // Get text color status
  function getCinTextColor() {
    if (cinStatus === 'duplicate') return 'text-red-600';
    if (cinStatus === 'valid') return 'text-green-600';
    if (cinStatus === 'checking') return 'text-blue-600';
    if (cinStatus === 'invalid') return 'text-yellow-600';
    return 'text-gray-500';
  }

  // Get status message
  function getCinStatusMessage(status, length, duplicateCheck) {
    if (duplicateCheck.checking) return 'Checking if this CIN already exists...';
    switch (status) {
      case 'duplicate':
        return '❌ This CIN already exists! Please use a different CIN number.';
      case 'valid':
        return '✅ Perfect! This CIN is valid and available.';
      case 'invalid':
        return length < 8 ? `⚠️ Please enter ${8 - length} more digit${8 - length > 1 ? 's' : ''} (${length}/8)` : 'Invalid CIN number';
      default:
        return 'Enter your 8-digit National ID number (CIN)';
    }
  }

  // Function to handle viewing duplicate client profile
  function viewDuplicateClient(type) {
    let clientId = null;
    
    if (type === 'cin' && cinDuplicateCheck.clientId) {
      clientId = cinDuplicateCheck.clientId;
    } else if (type === 'workerNumber' && workerNumberDuplicateCheck.clientId) {
      clientId = workerNumberDuplicateCheck.clientId;
    }
    
    if (clientId) {
      goto(`/clients/${clientId}`);
    } else {
      // Fallback to search if no client ID is available
      const searchValue = type === 'cin' ? cinInput : workerNumberInput;
      goto(`/clients?search=${searchValue}`);
    }
  }

  function handleFileUpload(type, file) {
      if (type === 'idCard') {
        idCardFile = file;
      } else if (type === 'jobCard') {
        jobCardFile = file;
      } else if (type === 'other') {
        otherDocuments = [...otherDocuments, file];
    }
  }

  function removeOtherDocument(index) {
    otherDocuments = otherDocuments.filter((_, i) => i !== index);
  }

  // Handle Phone Number input
  function handlePhoneNumberInput(event) {
    let value = event.target.value;
    value = value.replace(/[^\d]/g, '');
    if (value.length > 8) {
      value = value.slice(0, 8);
    }
    phoneNumberInput = value;
    phoneNumberLength = phoneNumberInput.length;
    const numValue = parseInt(phoneNumberInput);
    formData.phoneNumber = isNaN(numValue) ? '' : value; // Store as string

    if (phoneNumberLength === 8) {
      phoneNumberStatus = 'valid';
    } else if (phoneNumberLength > 0) {
      phoneNumberStatus = 'invalid';
    } else {
      phoneNumberStatus = 'empty';
    }
  }

  // Get color for the filling part of the Phone Number bar
  function getPhoneNumberBarFillColor() {
    if (phoneNumberStatus === 'valid') return 'bg-green-500';
    if (phoneNumberStatus === 'invalid') return 'bg-yellow-500';
    return 'bg-gray-400';
  }

  // Get text color status for Phone Number
  function getPhoneNumberTextColor() {
    if (phoneNumberStatus === 'valid') return 'text-green-600';
    if (phoneNumberStatus === 'invalid') return 'text-yellow-600';
    return 'text-gray-500';
  }

  // Get status message for Phone Number
  function getPhoneNumberStatusMessage() {
    switch (phoneNumberStatus) {
      case 'valid':
        return '✅ Great! This phone number is valid.';
      case 'invalid':
        return phoneNumberLength < 8 ? `⚠️ Please enter ${8 - phoneNumberLength} more digit${8 - phoneNumberLength > 1 ? 's' : ''} (${phoneNumberLength}/8)` : 'Invalid phone number';
      default:
        return 'Enter your 8-digit phone number (optional)';
    }
  }



  // Update the progress bar color logic for CIN and Worker Number:
  function getWorkerNumberBarFillColor() {
    if (workerNumberStatus === 'duplicate') return 'bg-red-500';
    if (workerNumberStatus === 'valid') return 'bg-green-500';
    if (workerNumberStatus === 'checking') return 'bg-blue-500';
    if (workerNumberStatus === 'invalid') return 'bg-yellow-500';
    return 'bg-gray-400';
  }

  // Get text color status for Worker Number
  function getWorkerNumberTextColor() {
    if (workerNumberStatus === 'duplicate') return 'text-red-600';
    if (workerNumberStatus === 'valid') return 'text-green-600';
    if (workerNumberStatus === 'checking') return 'text-blue-600';
    if (workerNumberStatus === 'invalid') return 'text-yellow-600';
    return 'text-gray-500';
  }

  // Get status message for Worker Number
  function getWorkerNumberStatusMessage(status, length, duplicateCheck) {
    if (duplicateCheck.checking) return 'Checking if this Worker Number already exists...';
    switch (status) {
      case 'duplicate':
        return '❌ This Worker Number already exists! Please use a different number.';
      case 'valid':
        return '✅ Excellent! This Worker Number is valid and available.';
      case 'invalid':
        return length < 10 ? `⚠️ Please enter ${10 - length} more digit${10 - length > 1 ? 's' : ''} (${length}/10)` : 'Invalid worker number';
      default:
        return 'Enter your 10-digit Worker Number';
    }
  }



  async function handleSubmit() {
    isSaving = true;
    loading.set(true);

    try {
      // Client-side validation
      if (!formData.fullName.trim()) {
        showAlert('Full Name cannot be blank', 'error');
        return;
      }

      // Validate CIN - must be exactly 8 digits
      if (!cinInput || cinInput.length !== 8) {
        showAlert('CIN must be exactly 8 digits', 'error');
        return;
      }

      // Validate worker number if provided - must be exactly 10 digits
      if (!workerNumberInput || workerNumberInput.length !== 10) {
        showAlert('Worker number must be exactly 10 digits', 'error');
        return;
      }

      if (!selectedWorkplaceId) {
        showAlert('Workplace is required', 'error');
        return;
      }
      if (!formData.jobId) {
        showAlert('Job is required', 'error');
        return;
      }
      if (!formData.address || !formData.address.trim()) {
        showAlert('Address is required', 'error');
        return;
      }

      // Get workplace name if workplace is selected
      if (selectedWorkplaceId) {
        const selectedWorkplace = workplaces.find(w => w.id === selectedWorkplaceId);
        if (selectedWorkplace) {
          formData.workplace = selectedWorkplace.name;
        }
      }

      // Create a plain object for client data
      const clientData = {
        fullName: formData.fullName,
        cin: cinInput,
        job: formData.job,
        phoneNumber: formData.phoneNumber,
        workplace: formData.workplace,
        address: formData.address,
        jobId: formData.jobId,
        workerNumber: workerNumberInput,
        workplaceId: formData.workplaceId
      };



      // Create the client
      const result = await clientsApi.create(clientData);
      
      if (result.success) {
        showAlert('Client created successfully', 'success');
        goto(`/clients/${result.data.id}`);
      } else {
        showAlert(result.error || 'Failed to create client', 'error');
      }
    } catch (error) {
      console.error('Error creating client:', error);
      showAlert(error.message || 'Failed to create client', 'error');
    } finally {
      isSaving = false;
      loading.set(false);
    }
  }
</script>

<svelte:head>
  <title>New Client | Cession Management</title>
</svelte:head>

<div class="space-y-6">
  <PageHeader 
    title="New Client" 
    subtitle="Create a new client profile"
    actions={[
      {
        label: 'Back to Clients',
        href: '/clients',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>`
      }
    ]}
  />

  <div class="max-w-2xl mx-auto">
    <div class="bg-white shadow-sm rounded-lg overflow-hidden">
      <div class="p-6 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">Client Information</h3>
      </div>

      <form on:submit|preventDefault={handleSubmit} class="p-6 space-y-6">
        <!-- Full Name -->
        <div class="space-y-4">
          <div>
            <label for="fullName" class="block text-sm font-medium text-gray-700">
              Full Name *
            </label>
            <input
              type="text"
              id="fullName"
              bind:value={formData.fullName}
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              required
            />
          </div>
          </div>

        <!-- CIN Input -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="cin" class="block text-sm font-medium text-gray-700">
              CIN (8-digit Number) *
            </label>
            <div class="mt-1 relative">
              <input
                type="text"
                id="cin"
                value={cinInput}
                on:input={handleCinInput}
                required
                pattern="\d*"
                inputmode="numeric"
                maxlength="8"
                class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Enter 8-digit CIN"
              />
              <div class="absolute right-3 top-1/2 -translate-y-1/2">
                <span class={`text-sm font-medium ${getCinTextColor()}`}>
                  {cinLength}/8
                </span>
              </div>
            </div>
            <!-- CIN progress bar: -->
            <div class="mt-2 h-2 w-full rounded-full bg-gray-200 relative overflow-hidden">
              <div
                class="absolute left-0 top-0 h-full transition-all duration-300 ease-out"
                class:bg-red-500={cinStatus === 'duplicate'}
                class:bg-green-500={cinStatus === 'valid'}
                class:bg-blue-500={cinStatus === 'checking'}
                class:bg-yellow-500={cinStatus === 'invalid'}
                class:bg-gray-400={cinStatus === 'empty'}
                style="width: {(cinLength / 8) * 100}%"
              ></div>
            </div>
            <div class={`mt-1 text-sm ${getCinTextColor()}`}>
              <p>{cinStatusMessage}</p>
              {#if cinStatus === 'duplicate'}
                <button
                  type="button"
                  on:click={() => viewDuplicateClient('cin')}
                  class="mt-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                  {$t('cessions.details.view_profile')}
                </button>
              {/if}
            </div>
          </div>
          <!-- Worker Number Input -->
          <div>
            <label for="workerNumber" class="block text-sm font-medium text-gray-700">
              Worker Number (10-digit Number) *
            </label>
            <div class="mt-1 relative">
              <input
                type="text"
                id="workerNumber"
                value={workerNumberInput}
                on:input={handleWorkerNumberInput}
                required
                pattern="\d*"
                inputmode="numeric"
                maxlength="10"
                class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Enter 10-digit worker number"
              />
              <div class="absolute right-3 top-1/2 -translate-y-1/2">
                <span class={`text-sm font-medium ${getWorkerNumberTextColor()}`}>
                  {workerNumberLength}/10
                </span>
              </div>
            </div>
            <!-- Worker Number progress bar: -->
            <div class="mt-2 h-2 w-full rounded-full bg-gray-200 relative overflow-hidden">
              <div
                class="absolute left-0 top-0 h-full transition-all duration-300 ease-out"
                class:bg-red-500={workerNumberStatus === 'duplicate'}
                class:bg-green-500={workerNumberStatus === 'valid'}
                class:bg-blue-500={workerNumberStatus === 'checking'}
                class:bg-yellow-500={workerNumberStatus === 'invalid'}
                class:bg-gray-400={workerNumberStatus === 'empty'}
                style="width: {(workerNumberLength / 10) * 100}%"
              ></div>
            </div>
            <div class={`mt-1 text-sm ${getWorkerNumberTextColor()}`}>
              <p>{workerNumberStatusMessage}</p>
              {#if workerNumberStatus === 'duplicate'}
                <button
                  type="button"
                  on:click={() => viewDuplicateClient('workerNumber')}
                  class="mt-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                  {$t('cessions.details.view_profile')}
                </button>
              {/if}
            </div>
          </div>
        </div>

        <!-- Workplace Selection -->
        <div class="space-y-4">
          <div>
            <label for="workplace" class="block text-sm font-medium text-gray-700">
              Workplace *
            </label>
            <select
              id="workplace"
              value={selectedWorkplaceId}
              on:change={handleWorkplaceChange}
              required
              class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="">Select a workplace</option>
              {#each workplaces as workplace}
                <option value={workplace.id}>{workplace.name}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Job Selection -->
        <div class="space-y-4">
          <div>
            <label for="job" class="block text-sm font-medium text-gray-700">
              Job *
            </label>
            <select
              id="job"
              value={formData.jobId}
              on:change={handleJobChange}
              disabled={!selectedWorkplaceId}
              required
              class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">Select a job</option>
              {#each filteredJobs as job}
                <option value={job.id}>{job.name}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Address -->
        <div class="space-y-4">
          <div>
            <label for="address" class="block text-sm font-medium text-gray-700">
              Address *
            </label>
            <input
              type="text"
              id="address"
              bind:value={formData.address}
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              readonly={selectedWorkplaceId !== null}
            />
          </div>
        </div>

        <!-- File Uploads -->
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <label class="block text-sm font-medium text-gray-700">
              Required Documents
            </label>
            <button
              type="button"
              on:click={() => showDocuments = !showDocuments}
              class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {#if showDocuments}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                </svg>
                Hide Documents
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                Show Documents
              {/if}
            </button>
          </div>

          {#if showDocuments}
            <!-- ID Card Upload -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                National ID Card
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              {#if idCardFile}
                <p class="mt-2 text-sm text-gray-500">
                  Selected: {idCardFile.name}
                </p>
              {/if}
            </div>

            <!-- Job Card Upload -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Job Card (Optional)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              {#if jobCardFile}
                <p class="mt-2 text-sm text-gray-500">
                  Selected: {jobCardFile.name}
                </p>
              {/if}
            </div>

            <!-- Phone Number Input -->
            <div class="mb-4">
              <label for="phoneNumber" class="block text-sm font-medium text-gray-700">
                Phone Number (8-digit Number)
              </label>
              <div class="mt-1 relative">
                <input
                  type="text"
                  id="phoneNumber"
                  value={phoneNumberInput}
                  on:input={handlePhoneNumberInput}
                  pattern="\d*"
                  inputmode="numeric"
                  maxlength="8"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter 8-digit phone number"
                />
                <div class="absolute right-3 top-1/2 -translate-y-1/2">
                  <span class={`text-sm font-medium ${getPhoneNumberTextColor()}`}>
                    {phoneNumberLength}/8
                  </span>
                </div>
              </div>
              <div class="mt-2 h-2 w-full rounded-full bg-gray-200 relative overflow-hidden">
                <div
                  class={`absolute left-0 top-0 h-full ${getPhoneNumberBarFillColor()} transition-all duration-300 ease-out`}
                  style={`width: ${(phoneNumberLength / 8) * 100}%`}
                ></div>
              </div>
              <p class={`mt-1 text-sm ${getPhoneNumberTextColor()}`}>
                {getPhoneNumberStatusMessage()}
              </p>
            </div>

            <!-- Other Documents -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Additional Documents
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              <ul class="mt-2 space-y-1">
                {#each otherDocuments as doc, i}
                  <li class="flex justify-between items-center text-sm text-gray-500">
                    <span>{doc.name}</span>
                    <button
                      type="button"
                      on:click={() => removeOtherDocument(i)}
                      class="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>

        <!-- Submit Button -->
        <div class="pt-5">
          <button
            type="submit"
            disabled={isSaving || cinStatus !== 'valid' || workerNumberStatus !== 'valid' || !formData.fullName}
            class="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if isSaving}
              <Spinner size="sm" /> Saving...
            {:else}
              Save Client
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- Hidden color classes to ensure Tailwind generates them for progress bars -->
<div class="hidden">
  <div class="bg-green-500 bg-yellow-500 bg-gray-400 bg-red-500 bg-blue-500"></div>
</div>