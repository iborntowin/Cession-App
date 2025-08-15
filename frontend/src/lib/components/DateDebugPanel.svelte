<script>
  import { onMount } from 'svelte';
  import { logDateDebugInfo } from '$lib/utils/dateDebug';
  
  let debugInfo = null;
  let loading = false;
  let showPanel = false;
  
  async function runDebug() {
    loading = true;
    try {
      debugInfo = await logDateDebugInfo();
    } catch (error) {
      console.error('Debug failed:', error);
    } finally {
      loading = false;
    }
  }
  
  onMount(() => {
    // Auto-run debug on mount for immediate troubleshooting
    runDebug();
  });
</script>

<!-- Debug Panel Toggle -->
<div class="fixed bottom-4 right-4 z-50">
  <button
    on:click={() => showPanel = !showPanel}
    class="bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-red-700 transition-colors text-sm font-medium"
  >
    🐛 Debug Dates
  </button>
</div>

<!-- Debug Panel -->
{#if showPanel}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Date/Timezone Debug Information</h3>
          <button
            on:click={() => showPanel = false}
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <button
            on:click={runDebug}
            disabled={loading}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Running Debug...' : 'Refresh Debug Info'}
          </button>
          
          {#if debugInfo}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Frontend Info -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-900 mb-2">Frontend (Browser)</h4>
                <div class="text-sm space-y-1">
                  <div><strong>Timezone:</strong> {debugInfo.frontend.timeZone}</div>
                  <div><strong>Locale:</strong> {debugInfo.frontend.locale}</div>
                  <div><strong>Current Date:</strong> {debugInfo.frontend.currentDateISO}</div>
                  <div><strong>Test Date (2025-06-30):</strong> {debugInfo.frontend.testDateParsedISO}</div>
                  <div><strong>Platform:</strong> {debugInfo.frontend.platform}</div>
                </div>
              </div>
              
              <!-- Backend Info -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-900 mb-2">Backend (Server)</h4>
                {#if debugInfo.backend?.error}
                  <div class="text-red-600 text-sm">Error: {debugInfo.backend.error}</div>
                {:else if debugInfo.backend}
                  <div class="text-sm space-y-1">
                    <div><strong>Default Timezone:</strong> {debugInfo.backend.defaultTimeZone}</div>
                    <div><strong>System Timezone:</strong> {debugInfo.backend.systemTimezone}</div>
                    <div><strong>Current Date UTC:</strong> {debugInfo.backend.currentDateUTC}</div>
                    <div><strong>Current Date System:</strong> {debugInfo.backend.currentDateSystem}</div>
                  </div>
                {:else}
                  <div class="text-gray-500 text-sm">No backend info available</div>
                {/if}
              </div>
            </div>
            
            <!-- Comparison -->
            <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 class="font-semibold text-gray-900 mb-2">Comparison</h4>
              <div class="text-sm space-y-1">
                <div><strong>Frontend Date:</strong> {debugInfo.comparison.frontendDate}</div>
                <div><strong>Backend Date (UTC):</strong> {debugInfo.comparison.backendDateUTC}</div>
                <div><strong>Dates Match:</strong> 
                  <span class={debugInfo.comparison.match ? 'text-green-600' : 'text-red-600'}>
                    {debugInfo.comparison.match ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Instructions -->
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 class="font-semibold text-blue-900 mb-2">Troubleshooting</h4>
              <div class="text-sm text-blue-800 space-y-2">
                <p>If dates don't match or timezone differs between dev/prod:</p>
                <ul class="list-disc list-inside space-y-1 ml-4">
                  <li>Check system timezone settings</li>
                  <li>Verify JVM timezone configuration</li>
                  <li>Ensure consistent date parsing in frontend</li>
                  <li>Check browser timezone vs system timezone</li>
                </ul>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}