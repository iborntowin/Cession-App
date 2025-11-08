<script lang="ts">
  import { t } from '$lib/i18n';
  
  export let analytics;
  export let quickStats;
  export let systemHealth;
  export let formatCurrency;

  // Calculate dynamic status colors
  function getHealthColor(health) {
    switch(health.status) {
      case 'healthy': return 'from-emerald-500 to-teal-600';
      case 'warning': return 'from-yellow-500 to-orange-500';
      case 'error': return 'from-red-500 to-rose-600';
      default: return 'from-gray-500 to-slate-600';
    }
  }

  function getGrowthColor(growth) {
    if (growth > 5) return 'text-emerald-600';
    if (growth > 0) return 'text-blue-600';
    if (growth === 0) return 'text-gray-600';
    return 'text-red-600';
  }

  function getGrowthIcon(growth) {
    if (growth > 0) return 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6';
    if (growth < 0) return 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6';
    return 'M5 12h14M12 5l7 7-7 7';
  }

  // Real-time calculation helpers
  $: avgLoanFormatted = formatCurrency(analytics.avgLoanAmount || 0);
  $: completionRateFormatted = (analytics.completionRate || 0).toFixed(1);
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
  <!-- Active Cessions -->
  <div class="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20 hover:bg-white/90 transition-all duration-300 hover:scale-105 hover:-translate-y-1 flex flex-col">
    <div class="flex items-center justify-between mb-3">
      <div class="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
    </div>
    <div class="flex-1 flex flex-col justify-between">
      <p class="text-sm font-semibold text-gray-600 mb-2">Cessions Actives</p>
      <p class="text-3xl font-bold text-gray-900">{analytics.activeCount}</p>
    </div>
  </div>

  <!-- ✅ FIXED: Monthly Revenue (Real Payments This Month) -->
  <div class="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20 hover:bg-white/90 transition-all duration-300 hover:scale-105 hover:-translate-y-1 flex flex-col">
    <div class="flex items-center justify-between mb-3">
      <div class="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
        </svg>
      </div>
    </div>
    <div class="flex-1 flex flex-col justify-between">
      <p class="text-sm font-semibold text-gray-600 mb-2">Revenus Mensuels</p>
      <p class="text-2xl font-bold text-gray-900">{formatCurrency(quickStats.monthlyRevenue)}</p>
      <p class="text-xs text-blue-600 font-medium mt-1">This month</p>
    </div>
  </div>

  <!-- ✅ NEW: Total Cumulative Revenue -->
  <div class="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20 hover:bg-white/90 transition-all duration-300 hover:scale-105 hover:-translate-y-1 flex flex-col">
    <div class="flex items-center justify-between mb-3">
      <div class="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      </div>
    </div>
    <div class="flex-1 flex flex-col justify-between">
      <p class="text-sm font-semibold text-gray-600 mb-2">Cumul des Revenus</p>
      <p class="text-2xl font-bold text-gray-900">{formatCurrency(quickStats.totalRevenue)}</p>
      <p class="text-xs text-purple-600 font-medium mt-1">All time</p>
    </div>
  </div>

  <!-- ✅ NEW: Paying Users This Month -->
  <div class="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20 hover:bg-white/90 transition-all duration-300 hover:scale-105 hover:-translate-y-1 flex flex-col">
    <div class="flex items-center justify-between mb-3">
      <div class="w-14 h-14 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
      </div>
    </div>
    <div class="flex-1 flex flex-col justify-between">
      <p class="text-sm font-semibold text-gray-600 mb-2">Clients Payants</p>
      <p class="text-3xl font-bold text-gray-900">{quickStats.payingUsersThisMonth}</p>
      <p class="text-xs text-orange-600 font-medium mt-1">This month</p>
    </div>
  </div>

  <!-- ✅ NEW: Average Revenue Per Customer -->
  <div class="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20 hover:bg-white/90 transition-all duration-300 hover:scale-105 hover:-translate-y-1 flex flex-col">
    <div class="flex items-center justify-between mb-3">
      <div class="w-14 h-14 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      </div>
    </div>
    <div class="flex-1 flex flex-col justify-between">
      <p class="text-sm font-semibold text-gray-600 mb-2">Revenu Moyen/Client</p>
      <p class="text-2xl font-bold text-gray-900">{formatCurrency(quickStats.avgRevenuePerCustomer)}</p>
      <p class="text-xs text-cyan-600 font-medium mt-1">Per customer</p>
    </div>
  </div>

  <!-- Completion Rate -->
  <div class="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20 hover:bg-white/90 transition-all duration-300 hover:scale-105 hover:-translate-y-1 flex flex-col">
    <div class="flex items-center justify-between mb-3">
      <div class="w-14 h-14 bg-gradient-to-r {getHealthColor(systemHealth)} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
    </div>
    <div class="flex-1 flex flex-col justify-between">
      <p class="text-sm font-semibold text-gray-600 mb-2">Taux de Réussite</p>
      <p class="text-3xl font-bold text-gray-900">{completionRateFormatted}%</p>
      <p class="text-xs font-medium mt-1 capitalize {systemHealth.status === 'healthy' ? 'text-emerald-600' : systemHealth.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}">
        {systemHealth.status}
      </p>
    </div>
  </div>
</div>
