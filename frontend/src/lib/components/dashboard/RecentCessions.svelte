<script lang="ts">
  export let recentCessions;
  export let getStatusClass;
  export let safeFormatDistanceToNow;
  export let formatCurrency;
  import { goto } from '$app/navigation';
  import { slide } from 'svelte/transition';
</script>

<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
  <div class="px-6 py-4 border-b border-gray-200/50">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-bold text-gray-900">Recent Cessions</h3>
      <button 
        class="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors"
        on:click={() => goto('/cessions')}
      >
        View All
      </button>
    </div>
  </div>
  <div class="p-6">
    {#if recentCessions.length > 0}
      <div class="space-y-4">
        {#each recentCessions.slice(0, 5) as cession, i}
          <div class="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl hover:bg-gray-100/50 transition-colors" in:slide={{ duration: 300, delay: i * 100 }}>
            <div class="flex items-center space-x-4">
              <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <span class="text-white font-bold text-sm">{cession.clientName?.charAt(0) || 'C'}</span>
              </div>
              <div>
                <p class="font-semibold text-gray-900">{cession.clientName}</p>
                <p class="text-sm text-gray-600">{formatCurrency(cession.totalLoanAmount)} DT</p>
              </div>
            </div>
            <div class="text-right">
              <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getStatusClass(cession.status)}">
                {cession.status}
              </span>
              <p class="text-xs text-gray-500 mt-1">{safeFormatDistanceToNow(cession.createdAt)} ago</p>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center py-8">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <p class="text-gray-500">No cessions found</p>
      </div>
    {/if}
  </div>
</div>
