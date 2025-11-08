<script>
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { getAuthHeaders } from '$lib/api';
  import { config } from '$lib/config';

  // Props
  export let onClose = null;

  // State
  let scheduleConfig = null;
  let loading = false;
  let error = null;
  let saving = false;
  let successMessage = null;

  // Form state
  let enabled = false;
  let selectedDay = 'SAT';
  let selectedHour = '10';
  let customCron = '';
  let useCustomCron = false;

  // Day options
  const dayOptions = [
    { value: 'MON', label: 'Monday' },
    { value: 'TUE', label: 'Tuesday' },
    { value: 'WED', label: 'Wednesday' },
    { value: 'THU', label: 'Thursday' },
    { value: 'FRI', label: 'Friday' },
    { value: 'SAT', label: 'Saturday' },
    { value: 'SUN', label: 'Sunday' },
    { value: '*', label: 'Every Day' },
    { value: 'MON-FRI', label: 'Weekdays' }
  ];

  // Hour options (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: String(i),
    label: `${String(i).padStart(2, '0')}:00`
  }));

  onMount(() => {
    fetchScheduleConfig();
  });

  async function fetchScheduleConfig() {
    try {
      loading = true;
      error = null;

      const headers = getAuthHeaders();
      const response = await fetch(`${config.backendUrl}/api/v1/export/schedule/config`, {
        method: 'GET',
        headers: headers,
        credentials: 'include'
      });

      if (response.ok) {
        scheduleConfig = await response.json();
        
        // Parse config into form fields
        enabled = scheduleConfig.enabled;
        
        // Parse cron expression: "0 0 10 * * SAT"
        const cronParts = scheduleConfig.cronExpression.split(' ');
        if (cronParts.length === 6) {
          selectedHour = cronParts[2];
          selectedDay = cronParts[5];
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Failed to fetch schedule config:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function saveScheduleConfig() {
    try {
      saving = true;
      error = null;
      successMessage = null;

      // Build cron expression
      let cronExpression;
      if (useCustomCron && customCron) {
        cronExpression = customCron;
      } else {
        // Format: "0 0 HH * * DAY"
        cronExpression = `0 0 ${selectedHour} * * ${selectedDay}`;
      }

      const headers = getAuthHeaders();
      const response = await fetch(`${config.backendUrl}/api/v1/export/schedule/config`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          enabled: enabled,
          cronExpression: cronExpression
        })
      });

      if (response.ok) {
        scheduleConfig = await response.json();
        successMessage = 'Schedule configuration saved successfully!';
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          successMessage = null;
        }, 3000);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Failed to save schedule config:', err);
      error = err.message;
    } finally {
      saving = false;
    }
  }

  async function toggleSchedule() {
    try {
      error = null;
      
      const headers = getAuthHeaders();
      const response = await fetch(
        `${config.backendUrl}/api/v1/export/schedule/toggle?enabled=${!enabled}`,
        {
          method: 'POST',
          headers: headers,
          credentials: 'include'
        }
      );

      if (response.ok) {
        scheduleConfig = await response.json();
        enabled = scheduleConfig.enabled;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Failed to toggle schedule:', err);
      error = err.message;
    }
  }

  function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return 'Not scheduled';
    
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getNextRunRelativeTime(nextRunTime) {
    if (!nextRunTime) return '';
    
    const next = new Date(nextRunTime);
    const now = new Date();
    const diffMs = next - now;
    
    if (diffMs < 0) return 'Overdue';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 1) return `in ${diffDays} days`;
    if (diffHours > 1) return `in ${diffHours} hours`;
    return 'soon';
  }
</script>

<div class="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
  <!-- Header -->
  <div class="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 rounded-t-2xl">
    <div class="flex justify-between items-center">
      <div class="flex items-center space-x-4">
        <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <h2 class="text-2xl font-bold text-white">Scheduled Export Settings</h2>
          <p class="text-indigo-100 text-sm">Configure automatic data synchronization</p>
        </div>
      </div>
      {#if onClose}
        <button
          on:click={onClose}
          class="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- Content -->
  <div class="p-8">
    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
        <div class="flex items-center">
          <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
            <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <p class="text-sm text-red-700 font-medium">Error: {error}</p>
        </div>
      </div>
    {:else if scheduleConfig}
      <!-- Success Message -->
      {#if successMessage}
        <div class="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 animate-fade-in">
          <div class="flex items-center">
            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <p class="text-sm text-green-700 font-medium">{successMessage}</p>
          </div>
        </div>
      {/if}

      <!-- Enable/Disable Toggle -->
      <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">Automatic Scheduled Exports</h3>
              <p class="text-sm text-gray-600">
                {enabled ? 'Scheduled exports are enabled' : 'Scheduled exports are disabled'}
              </p>
            </div>
          </div>
          <button
            on:click={toggleSchedule}
            class="relative inline-flex h-8 w-14 items-center rounded-full transition-colors {enabled ? 'bg-emerald-500' : 'bg-gray-300'}"
          >
            <span class="inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform {enabled ? 'translate-x-7' : 'translate-x-1'}"></span>
          </button>
        </div>
      </div>

      <!-- Current Status -->
      {#if enabled && scheduleConfig.nextRunTime}
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <div class="flex items-start space-x-3">
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mt-0.5">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="flex-1">
              <h4 class="font-semibold text-blue-900 mb-1">Next Scheduled Export</h4>
              <p class="text-blue-700 font-medium">{formatDateTime(scheduleConfig.nextRunTime)}</p>
              <p class="text-sm text-blue-600 mt-1">
                {getNextRunRelativeTime(scheduleConfig.nextRunTime)}
              </p>
            </div>
          </div>
        </div>
      {/if}

      <!-- Schedule Configuration Form -->
      <div class="space-y-6">
        <div class="border-t border-gray-200 pt-6">
          <h3 class="font-semibold text-gray-900 mb-4 flex items-center">
            <svg class="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Schedule Configuration
          </h3>

          {#if !useCustomCron}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Day Selector -->
              <div>
                <label for="day-select" class="block text-sm font-medium text-gray-700 mb-2">
                  Day of Week
                </label>
                <select
                  id="day-select"
                  bind:value={selectedDay}
                  class="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                  {#each dayOptions as day}
                    <option value={day.value}>{day.label}</option>
                  {/each}
                </select>
              </div>

              <!-- Hour Selector -->
              <div>
                <label for="hour-select" class="block text-sm font-medium text-gray-700 mb-2">
                  Time (Hour)
                </label>
                <select
                  id="hour-select"
                  bind:value={selectedHour}
                  class="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                  {#each hourOptions as hour}
                    <option value={hour.value}>{hour.label}</option>
                  {/each}
                </select>
              </div>
            </div>

            <!-- Preview -->
            <div class="mt-4 p-4 bg-gray-50 rounded-lg">
              <p class="text-sm text-gray-600">
                <span class="font-medium">Schedule Preview:</span> 
                {scheduleConfig.scheduleDescription || `Every ${selectedDay} at ${selectedHour}:00`}
              </p>
              <p class="text-xs text-gray-500 mt-1">
                Cron: 0 0 {selectedHour} * * {selectedDay}
              </p>
            </div>
          {:else}
            <!-- Custom Cron Expression -->
            <div>
              <label for="cron-input" class="block text-sm font-medium text-gray-700 mb-2">
                Custom Cron Expression
              </label>
              <input
                id="cron-input"
                type="text"
                bind:value={customCron}
                placeholder="0 0 10 * * SAT"
                class="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              <p class="text-xs text-gray-500 mt-2">
                Format: second minute hour day month dayOfWeek
              </p>
            </div>
          {/if}

          <!-- Toggle Custom Cron -->
          <div class="mt-4">
            <button
              on:click={() => useCustomCron = !useCustomCron}
              class="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {useCustomCron ? '← Use simple scheduler' : 'Use custom cron expression →'}
            </button>
          </div>
        </div>

        <!-- Statistics -->
        {#if scheduleConfig.totalScheduledRuns > 0}
          <div class="border-t border-gray-200 pt-6">
            <h3 class="font-semibold text-gray-900 mb-4">Schedule Statistics</h3>
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-gray-50 rounded-lg p-4">
                <div class="text-2xl font-bold text-gray-900">{scheduleConfig.totalScheduledRuns || 0}</div>
                <div class="text-sm text-gray-600">Total Runs</div>
              </div>
              <div class="bg-green-50 rounded-lg p-4">
                <div class="text-2xl font-bold text-green-600">{scheduleConfig.successfulRuns || 0}</div>
                <div class="text-sm text-gray-600">Successful</div>
              </div>
              <div class="bg-red-50 rounded-lg p-4">
                <div class="text-2xl font-bold text-red-600">{scheduleConfig.failedRuns || 0}</div>
                <div class="text-sm text-gray-600">Failed</div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Last Run Info -->
        {#if scheduleConfig.lastRunTime}
          <div class="border-t border-gray-200 pt-6">
            <h3 class="font-semibold text-gray-900 mb-4">Last Scheduled Run</h3>
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-gray-600">Time:</span>
                <span class="text-sm font-medium text-gray-900">{formatDateTime(scheduleConfig.lastRunTime)}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Status:</span>
                <span class="text-sm font-medium {scheduleConfig.lastRunStatus === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}">
                  {scheduleConfig.lastRunStatus || 'N/A'}
                </span>
              </div>
              {#if scheduleConfig.lastErrorMessage}
                <div class="mt-3 pt-3 border-t border-gray-200">
                  <span class="text-sm text-gray-600">Error:</span>
                  <p class="text-sm text-red-600 mt-1">{scheduleConfig.lastErrorMessage}</p>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-4 mt-8 pt-6 border-t border-gray-200">
        <button
          on:click={saveScheduleConfig}
          disabled={saving}
          class="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if saving}
            <div class="flex items-center justify-center space-x-2">
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Saving...</span>
            </div>
          {:else}
            Save Configuration
          {/if}
        </button>

        {#if onClose}
          <button
            on:click={onClose}
            class="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors shadow-sm border border-gray-200"
          >
            Close
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  /* Smooth transitions */
  * {
    transition-property: color, background-color, border-color, transform, opacity;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  /* Loading animation */
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  /* Fade in animation */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }

  /* Focus styles */
  select:focus,
  input:focus {
    outline: none;
  }
</style>
