<script lang="ts">
  import { goto } from '$app/navigation';
</script>

<div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20">
  <h3 class="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6">
    Quick Actions
  </h3>
  
  <div class="grid grid-cols-2 gap-4">
    <button
      on:click={() => goto('/clients/new')}
      class="bg-white/40 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 hover:bg-white/60 transition-all duration-300 group"
    >
      <div class="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
        </svg>
      </div>
      <p class="text-sm font-medium text-gray-700">New Client</p>
    </button>

    <button
      on:click={() => goto('/cessions/new')}
      class="bg-white/40 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 hover:bg-white/60 transition-all duration-300 group"
    >
      <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      <p class="text-sm font-medium text-gray-700">New Cession</p>
    </button>

    <button
      on:click={() => goto('/payments')}
      class="bg-white/40 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 hover:bg-white/60 transition-all duration-300 group"
    >
      <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
      </div>
      <p class="text-sm font-medium text-gray-700">Payments</p>
    </button>

    <button
      on:click={() => goto('/salary-cessions')}
      class="bg-white/40 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 hover:bg-white/60 transition-all duration-300 group"
    >
      <div class="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      </div>
      <p class="text-sm font-medium text-gray-700">Reports</p>
    </button>
  </div>
</div>
