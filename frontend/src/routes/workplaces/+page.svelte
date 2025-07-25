<script lang="ts">
  import { onMount } from 'svelte';
  import { showAlert, loading } from '$lib/stores';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
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
        workplaces = response.map(workplace => ({
          ...workplace,
          jobs: workplace.jobs || []
        }));
      }
    } catch (error) {
      showAlert(error.message || 'Failed to load workplaces', 'error');
    } finally {
      $loading = false;
    }
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
        workplaces = workplaces.map(w => 
          w.id === selectedWorkplace.id ? { ...w, name: newWorkplaceName } : w
        );
        cancelEdit();
        showAlert('Workplace updated successfully', 'success');
      }
    } catch (error) {
      showAlert(error.message || 'Failed to update workplace', 'error');
    } finally {
      $loading = false;
    }
  }

  async function handleAddJob() {
    if (!selectedWorkplace || !newJobName.trim()) {
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
        workplaces = workplaces.map(w => 
          w.id === selectedWorkplace.id 
            ? { ...w, jobs: [...w.jobs, result.data] } 
            : w
        );
        newJobName = '';
        isAddingJob = false;
        showAlert('Job added successfully', 'success');
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
        showAlert('Job updated successfully', 'success');
      }
    } catch (error) {
      showAlert(error.message || 'Failed to update job', 'error');
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
        showAlert('Workplace deleted successfully', 'success');
      }
    } catch (error) {
      showAlert(error.message || 'Failed to delete workplace', 'error');
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
        showAlert('Job deleted successfully', 'success');
      }
    } catch (error) {
      showAlert(error.message || 'Failed to delete job', 'error');
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
                Workplaces & Jobs
              </h1>
              <p class="text-sm text-gray-500 font-medium">Manage workplaces and their associated jobs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="max-w-7xl mx-auto mt-8 space-y-6">
    <!-- Add/Edit Workplace Card -->
    <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden" transition:fly={{ y: 20, duration: 300, easing: cubicOut }}>
      <div class="p-6 border-b border-gray-200/50 flex justify-between items-center">
        <h3 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          {isAddingWorkplace ? 'Add New Workplace' : isEditingWorkplace ? 'Edit Workplace' : 'Workplaces'}
        </h3>
        <button
          on:click={() => isAddingWorkplace ? cancelEdit() : (isAddingWorkplace = true)}
          class="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
        >
          {#if isAddingWorkplace || isEditingWorkplace}
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            Cancel
          {:else}
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            Add Workplace
          {/if}
        </button>
      </div>

      {#if isAddingWorkplace || isEditingWorkplace}
        <div class="p-6">
          <form on:submit|preventDefault={isEditingWorkplace ? handleUpdateWorkplace : handleAddWorkplace} class="space-y-4">
            <div>
              <label for="workplaceName" class="block text-sm font-medium text-purple-600 mb-2">Workplace Name</label>
              <input
                type="text"
                id="workplaceName"
                bind:value={newWorkplaceName}
                class="w-full pl-4 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
                placeholder="Enter workplace name"
                required
              />
            </div>
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                on:click={cancelEdit}
                class="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
              >
                {isEditingWorkplace ? 'Update Workplace' : 'Add Workplace'}
              </button>
            </div>
          </form>
        </div>
      {/if}
    </div>

    <!-- Workplaces List -->
    <div class="space-y-4">
{#each workplaces as workplace, index (workplace.id)}
  <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden" transition:fly={{ y: 20, duration: 300, delay: 50 * index, easing: cubicOut }}>
          <!-- Workplace Header -->
          <div class="p-6 border-b border-gray-200/50 flex justify-between items-center cursor-pointer" on:click={() => toggleWorkplaceExpansion(workplace.id)}>
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
                title="Edit Workplace"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button
                on:click|stopPropagation={() => handleDeleteWorkplace(workplace)}
                class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Workplace"
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
                <h4 class="text-md font-medium text-gray-700">Jobs</h4>
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
                    Cancel
                  {:else}
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    Add Job
                  {/if}
                </button>
              </div>

              {#if isAddingJob && selectedWorkplace?.id === workplace.id}
                <div class="bg-gray-50 p-4 rounded-xl">
                  <form on:submit|preventDefault={handleAddJob} class="space-y-4">
                    <div>
                      <label for="jobName" class="block text-sm font-medium text-purple-600 mb-2">Job Name</label>
                      <input
                        type="text"
                        id="jobName"
                        bind:value={newJobName}
                        class="w-full pl-4 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
                        placeholder="Enter job name"
                        required
                      />
                    </div>
                    <div class="flex justify-end space-x-3">
                      <button
                        type="button"
                        on:click={() => isAddingJob = false}
                        class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        class="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                      >
                        Add Job
                      </button>
                    </div>
                  </form>
                </div>
              {/if}

              {#if isEditingJob && selectedWorkplace?.id === workplace.id}
                <div class="bg-gray-50 p-4 rounded-xl">
                  <form on:submit|preventDefault={handleUpdateJob} class="space-y-4">
                    <div>
                      <label for="editJobName" class="block text-sm font-medium text-purple-600 mb-2">Job Name</label>
                      <input
                        type="text"
                        id="editJobName"
                        bind:value={newJobName}
                        class="w-full pl-4 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
                        placeholder="Enter job name"
                        required
                      />
                    </div>
                    <div class="flex justify-end space-x-3">
                      <button
                        type="button"
                        on:click={cancelEdit}
                        class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        class="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                      >
                        Update Job
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
                          title="Edit Job"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button
                          on:click={() => handleDeleteJob(workplace, job)}
                          class="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Job"
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
                  <p class="mt-2 text-sm text-gray-500">No jobs added yet</p>
                  <button
                    on:click={() => {
                      selectedWorkplace = workplace;
                      isAddingJob = true;
                    }}
                    class="mt-3 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                  >
                    Add First Job
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
          <h3 class="mt-4 text-lg font-medium text-gray-900">No workplaces yet</h3>
          <p class="mt-2 text-gray-500">Get started by adding your first workplace</p>
          <button
            on:click={() => isAddingWorkplace = true}
            class="mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            Add Workplace
          </button>
        </div>
      {/each}
    </div>
  </div>
</div>