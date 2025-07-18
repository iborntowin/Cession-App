<script lang="ts">
  import { onMount } from 'svelte';
  import { showAlert, loading } from '$lib/stores';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Spinner from '$lib/components/Spinner.svelte';
  import DataTable from '$lib/components/DataTable.svelte';
  import { workplacesApi, jobsApi } from '$lib/api';

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

  onMount(async () => {
    await loadWorkplaces();
  });

  async function loadWorkplaces() {
    $loading = true;
    try {
      const response = await workplacesApi.getAll();
      if (response && Array.isArray(response)) {
        workplaces = response;
        // Ensure each workplace has a jobs array
        workplaces = workplaces.map(workplace => ({
          ...workplace,
          jobs: workplace.jobs || []
        }));
      } else {
        console.error('Invalid response format:', response);
        showAlert('Failed to load workplaces: Invalid response format', 'error');
      }
    } catch (error) {
      console.error('Error loading workplaces:', error);
      showAlert(error.message || 'Failed to load workplaces', 'error');
    } finally {
      $loading = false;
    }
  }

  function toggleWorkplaceExpansion(workplaceId) {
    if (expandedWorkplaces.has(workplaceId)) {
      expandedWorkplaces.delete(workplaceId);
    } else {
      expandedWorkplaces.add(workplaceId);
    }
    expandedWorkplaces = expandedWorkplaces; // Trigger reactivity
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
      showAlert('Workplace name cannot be empty', 'error');
      return;
    }

    $loading = true;
    try {
      const result = await workplacesApi.create({ name: newWorkplaceName });
      if (result.success) {
        workplaces = [...workplaces, result.data];
        newWorkplaceName = '';
        isAddingWorkplace = false;
        showAlert('Workplace added successfully', 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      showAlert(error.message || 'Failed to add workplace', 'error');
    } finally {
      $loading = false;
    }
  }

  async function handleUpdateWorkplace() {
    if (!selectedWorkplace || !newWorkplaceName.trim()) {
      showAlert('Workplace name cannot be empty', 'error');
      return;
    }

    $loading = true;
    try {
      const result = await workplacesApi.update(selectedWorkplace.id, { name: newWorkplaceName });
      if (result.success) {
        const index = workplaces.findIndex(w => w.id === selectedWorkplace.id);
        if (index !== -1) {
          workplaces[index] = { ...workplaces[index], name: newWorkplaceName };
          workplaces = [...workplaces];
        }
        newWorkplaceName = '';
        isEditingWorkplace = false;
        selectedWorkplace = null;
        showAlert('Workplace updated successfully', 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      showAlert(error.message || 'Failed to update workplace', 'error');
    } finally {
      $loading = false;
    }
  }

  async function handleAddJob() {
    if (!selectedWorkplace) {
      showAlert('Please select a workplace first', 'error');
      return;
    }
    if (!newJobName.trim()) {
      showAlert('Job name cannot be empty', 'error');
      return;
    }

    $loading = true;
    try {
      const result = await jobsApi.create({
        name: newJobName,
        workplaceId: selectedWorkplace.id
      });
      
      if (result.success) {
        const index = workplaces.findIndex(w => w.id === selectedWorkplace.id);
        if (index !== -1) {
          workplaces[index].jobs = [...(workplaces[index].jobs || []), result.data];
          workplaces = [...workplaces];
        }
        newJobName = '';
        isAddingJob = false;
        showAlert('Job added successfully', 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      showAlert(error.message || 'Failed to add job', 'error');
    } finally {
      $loading = false;
    }
  }

  async function handleUpdateJob() {
    if (!selectedWorkplace || !selectedJob || !newJobName.trim()) {
      showAlert('Job name cannot be empty', 'error');
      return;
    }

    $loading = true;
    try {
      const result = await jobsApi.update(selectedJob.id, { name: newJobName });
      if (result.success) {
        const workplaceIndex = workplaces.findIndex(w => w.id === selectedWorkplace.id);
        if (workplaceIndex !== -1) {
          const jobIndex = workplaces[workplaceIndex].jobs.findIndex(j => j.id === selectedJob.id);
          if (jobIndex !== -1) {
            workplaces[workplaceIndex].jobs[jobIndex] = { ...workplaces[workplaceIndex].jobs[jobIndex], name: newJobName };
            workplaces = [...workplaces];
          }
        }
        newJobName = '';
        isEditingJob = false;
        selectedJob = null;
        showAlert('Job updated successfully', 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      showAlert(error.message || 'Failed to update job', 'error');
    } finally {
      $loading = false;
    }
  }

  async function handleDeleteWorkplace(workplace) {
    if (!confirm('Are you sure you want to delete this workplace? This will also delete all associated jobs.')) {
      return;
    }

    $loading = true;
    try {
      const result = await workplacesApi.delete(workplace.id);
      if (result.success) {
        workplaces = workplaces.filter(w => w.id !== workplace.id);
        showAlert('Workplace deleted successfully', 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      showAlert(error.message || 'Failed to delete workplace', 'error');
    } finally {
      $loading = false;
    }
  }

  async function handleDeleteJob(workplace, job) {
    if (!confirm('Are you sure you want to delete this job?')) {
      return;
    }

    $loading = true;
    try {
      const result = await jobsApi.delete(job.id);
      if (result.success) {
        const index = workplaces.findIndex(w => w.id === workplace.id);
        if (index !== -1) {
          workplaces[index].jobs = workplaces[index].jobs.filter(j => j.id !== job.id);
          workplaces = [...workplaces];
        }
        showAlert('Job deleted successfully', 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      showAlert(error.message || 'Failed to delete job', 'error');
    } finally {
      $loading = false;
    }
  }

  function cancelEdit() {
    isEditingWorkplace = false;
    isEditingJob = false;
    selectedWorkplace = null;
    selectedJob = null;
    newWorkplaceName = '';
    newJobName = '';
  }
</script>

<svelte:head>
  <title>Workplaces & Jobs | Cession Management</title>
</svelte:head>

<div class="space-y-6">
  <PageHeader 
    title="Workplaces & Jobs" 
    subtitle="Manage workplaces and their associated jobs"
  />

  <!-- Add/Edit Workplace Form -->
  <div class="bg-white shadow-sm rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-medium text-gray-900">Workplaces</h2>
      <button
        on:click={() => {
          if (isAddingWorkplace) {
            cancelEdit();
          } else {
            isAddingWorkplace = true;
            isEditingWorkplace = false;
          }
        }}
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        {#if isAddingWorkplace}
          Cancel
        {:else}
          Add Workplace
        {/if}
      </button>
    </div>

    {#if isAddingWorkplace || isEditingWorkplace}
      <div class="mt-4">
        <form on:submit|preventDefault={isEditingWorkplace ? handleUpdateWorkplace : handleAddWorkplace} class="space-y-4">
          <div>
            <label for="workplaceName" class="block text-sm font-medium text-gray-700">Workplace Name</label>
            <input
              type="text"
              id="workplaceName"
              bind:value={newWorkplaceName}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              placeholder="Enter workplace name"
              required
            />
          </div>
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              on:click={cancelEdit}
              class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {isEditingWorkplace ? 'Update Workplace' : 'Add Workplace'}
            </button>
          </div>
        </form>
      </div>
    {/if}

    <!-- Workplaces List -->
    <div class="mt-6 space-y-4">
      {#each workplaces as workplace}
        <div class="border rounded-lg overflow-hidden">
          <!-- Workplace Header -->
          <div class="bg-gray-50 px-4 py-3 flex justify-between items-center">
            <div class="flex items-center space-x-3">
              <button
                on:click={() => toggleWorkplaceExpansion(workplace.id)}
                class="text-gray-500 hover:text-gray-700"
              >
                <svg
                  class={`h-5 w-5 transform transition-transform ${expandedWorkplaces.has(workplace.id) ? 'rotate-90' : ''}`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <h3 class="text-lg font-medium text-gray-900">{workplace.name}</h3>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {workplace.jobs?.length || 0} Jobs
              </span>
            </div>
            <div class="flex items-center space-x-2">
              <button
                on:click={() => startEditingWorkplace(workplace)}
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Edit
              </button>
              <button
                on:click={() => {
                  selectedWorkplace = workplace;
                  isAddingJob = !isAddingJob;
                }}
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Add Job
              </button>
              <button
                on:click={() => handleDeleteWorkplace(workplace)}
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Jobs Section -->
          {#if expandedWorkplaces.has(workplace.id)}
            <div class="px-4 py-3 bg-white">
              {#if isAddingJob && selectedWorkplace?.id === workplace.id}
                <div class="mb-4 p-4 bg-gray-50 rounded-lg">
                  <form on:submit|preventDefault={handleAddJob} class="space-y-4">
                    <div>
                      <label for="jobName" class="block text-sm font-medium text-gray-700">Job Name</label>
                      <input
                        type="text"
                        id="jobName"
                        bind:value={newJobName}
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="Enter job name"
                        required
                      />
                    </div>
                    <div class="flex justify-end space-x-3">
                      <button
                        type="button"
                        on:click={() => {
                          isAddingJob = false;
                          newJobName = '';
                        }}
                        class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Add Job
                      </button>
                    </div>
                  </form>
                </div>
              {/if}

              {#if isEditingJob && selectedWorkplace?.id === workplace.id}
                <div class="mb-4 p-4 bg-gray-50 rounded-lg">
                  <form on:submit|preventDefault={handleUpdateJob} class="space-y-4">
                    <div>
                      <label for="editJobName" class="block text-sm font-medium text-gray-700">Job Name</label>
                      <input
                        type="text"
                        id="editJobName"
                        bind:value={newJobName}
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="Enter job name"
                        required
                      />
                    </div>
                    <div class="flex justify-end space-x-3">
                      <button
                        type="button"
                        on:click={cancelEdit}
                        class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Update Job
                      </button>
                    </div>
                  </form>
                </div>
              {/if}

              {#if workplace.jobs && workplace.jobs.length > 0}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {#each workplace.jobs as job}
                    <div class="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
                      <span class="text-sm font-medium text-gray-900">{job.name}</span>
                      <div class="flex items-center space-x-2">
                        <button
                          on:click={() => startEditingJob(workplace, job)}
                          class="text-primary-600 hover:text-primary-900"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          on:click={() => handleDeleteJob(workplace, job)}
                          class="text-red-600 hover:text-red-900"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="text-sm text-gray-500 text-center py-4">No jobs added yet</p>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div> 