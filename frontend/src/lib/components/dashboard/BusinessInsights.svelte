<script lang="ts">
  export let recentCessions = [];
  export let payments = [];
  export let clients = [];
  export let formatCurrency;
  export let analytics = { revenueGrowth: 0 }; // ✅ NEW: Accept revenue growth from parent
  
  import { slide, fly } from 'svelte/transition';
  import { addMonths, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';

  // Calculate real business insights
  $: businessInsights = calculateBusinessInsights();

  function calculateBusinessInsights() {
    const now = new Date();
    const thisMonth = startOfMonth(now);
    const lastMonth = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1));
    
    // 1. Revenue Velocity - How fast are we generating revenue
    const thisMonthRevenue = payments
      .filter(p => {
        const date = new Date(p.createdAt);
        return date >= thisMonth && (p.status === 'COMPLETED' || p.status === 'PAID');
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const lastMonthRevenue = payments
      .filter(p => {
        const date = new Date(p.createdAt);
        return date >= lastMonth && date < thisMonth && (p.status === 'COMPLETED' || p.status === 'PAID');
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    // 2. Client Lifetime Value
    const activeClients = clients.filter(c => {
      return recentCessions.some(cession => cession.clientId === c.id && cession.status === 'ACTIVE');
    });
    
    const avgClientValue = activeClients.length > 0
      ? recentCessions
          .filter(c => c.status === 'ACTIVE')
          .reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0) / activeClients.length
      : 0;

    // 3. Portfolio Health Score
    const totalActiveCessions = recentCessions.filter(c => c.status === 'ACTIVE').length;
    const overdueCessions = recentCessions.filter(c => {
      if (c.status !== 'ACTIVE' || !c.startDate || !c.paymentCount) return false;
      const endDate = addMonths(new Date(c.startDate), c.paymentCount);
      return endDate < now;
    }).length;
    
    const healthScore = totalActiveCessions > 0 
      ? Math.max(0, 100 - ((overdueCessions / totalActiveCessions) * 100))
      : 100;

    // 4. Cash Flow Predictability
    const upcomingPayments = recentCessions
      .filter(c => c.status === 'ACTIVE' && c.monthlyPayment)
      .reduce((sum, c) => sum + (c.monthlyPayment || 0), 0);

    // 5. Market Penetration Opportunity
    const newClientsThisMonth = clients.filter(c => {
      const date = new Date(c.createdAt || c.dateCreated);
      return date >= thisMonth;
    }).length;

    // 6. Risk-Adjusted Returns
    const completedCessions = recentCessions.filter(c => c.status === 'FINISHED');
    const avgCompletionTime = completedCessions.length > 0
      ? completedCessions.reduce((sum, c) => {
          const start = new Date(c.startDate);
          const end = new Date(c.endDate || c.updatedAt);
          return sum + differenceInDays(end, start);
        }, 0) / completedCessions.length
      : 0;

    return {
      revenueVelocity: {
        current: thisMonthRevenue,
        growth: revenueGrowth,
        trend: revenueGrowth > 0 ? 'up' : 'down'
      },
      clientValue: {
        average: avgClientValue,
        activeClients: activeClients.length,
        newThisMonth: newClientsThisMonth
      },
      portfolioHealth: {
        score: healthScore,
        totalActive: totalActiveCessions,
        overdue: overdueCessions
      },
      cashFlow: {
        predictable: upcomingPayments,
        stability: upcomingPayments > 0 ? 'high' : 'low'
      },
      performance: {
        avgCompletionDays: avgCompletionTime,
        completionRate: recentCessions.length > 0 
          ? (completedCessions.length / recentCessions.length) * 100 
          : 0
      }
    };
  }

  function getHealthColor(score) {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  function getTrendIcon(trend) {
    return trend === 'up' 
      ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' 
      : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6';
  }

  function getTrendColor(trend) {
    return trend === 'up' ? 'text-emerald-600' : 'text-red-600';
  }
</script>

<!-- Business Intelligence Dashboard -->
<div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/20">
  <div class="flex items-center justify-between mb-6">
    <h3 class="text-lg font-bold text-gray-900">Business Intelligence</h3>
    <div class="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
  </div>

  <div class="space-y-6">
    <!-- ✅ NEW: Revenue Growth % (Most Important KPI) -->
    <div class="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4 border-2 border-emerald-200" 
         in:fly={{ x: -20, duration: 400, delay: 50 }}>
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-semibold text-emerald-900">Revenue Growth</h4>
          <p class="text-3xl font-bold {analytics.revenueGrowth >= 0 ? 'text-emerald-700' : 'text-red-700'}">
            {analytics.revenueGrowth >= 0 ? '+' : ''}{analytics.revenueGrowth.toFixed(1)}%
          </p>
          <p class="text-xs text-emerald-600 mt-1">
            Month-over-month growth
          </p>
        </div>
        <div class="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
          {#if analytics.revenueGrowth >= 0}
            <span class="text-2xl">📈</span>
          {:else}
            <span class="text-2xl">📉</span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Client Value Insights -->
    <div class="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 p-4 border border-purple-100" 
         in:fly={{ x: -20, duration: 400, delay: 100 }}>
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-semibold text-purple-900">Avg Client Value</h4>
          <p class="text-2xl font-bold text-purple-700">
            {formatCurrency(businessInsights.clientValue.average)} TND
          </p>
          <p class="text-xs text-purple-600 mt-1">
            {businessInsights.clientValue.newThisMonth} new clients this month
          </p>
        </div>
        <div class="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
          <span class="text-2xl">💎</span>
        </div>
      </div>
    </div>

    <!-- Predictable Cash Flow -->
    <div class="relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 p-4 border border-orange-100" 
         in:fly={{ x: -20, duration: 400, delay: 200 }}>
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-semibold text-orange-900">Expected Monthly Flow</h4>
          <p class="text-2xl font-bold text-orange-700">
            {formatCurrency(businessInsights.cashFlow.predictable)} TND
          </p>
          <p class="text-xs text-orange-600 mt-1">
            High predictability from active cessions
          </p>
        </div>
        <div class="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
          <span class="text-2xl">📊</span>
        </div>
      </div>
    </div>

    <!-- Performance Metrics -->
    <div class="relative overflow-hidden rounded-xl bg-gradient-to-r from-gray-50 to-slate-50 p-4 border border-gray-100" 
         in:fly={{ x: -20, duration: 400, delay: 300 }}>
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-semibold text-gray-900">Avg Completion</h4>
          <p class="text-2xl font-bold text-gray-700">
            {businessInsights.performance.avgCompletionDays.toFixed(0)} days
          </p>
          <p class="text-xs text-gray-600 mt-1">
            {businessInsights.performance.completionRate.toFixed(1)}% completion rate
          </p>
        </div>
        <div class="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
          <span class="text-2xl">⚡</span>
        </div>
      </div>
    </div>

    <!-- AI Recommendation -->
    <div class="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-50 to-fuchsia-50 p-4 border border-violet-100 border-2 border-dashed" 
         in:fly={{ x: -20, duration: 400, delay: 400 }}>
      <div class="flex items-start space-x-3">
        <div class="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <span class="text-lg">🤖</span>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-violet-900 mb-2">AI Insight</h4>
          <p class="text-xs text-violet-700 leading-relaxed">
            {#if businessInsights.clientValue.newThisMonth > 5}
              Excellent client acquisition rate! Consider implementing loyalty programs for existing clients.
            {:else if businessInsights.clientValue.newThisMonth > 2}
              Good client growth. Focus on converting prospects and improving client satisfaction.
            {:else}
              Consider marketing campaigns to attract new clients and improve conversion rates.
            {/if}
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- Live Update Indicator -->
  <div class="flex items-center justify-center mt-6 pt-4 border-t border-gray-100">
    <div class="flex items-center space-x-2 text-xs text-gray-500">
      <div class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
      <span>Live data • Updated just now</span>
    </div>
  </div>
</div>

<style>
  /* Custom animations for business insights */
  @keyframes pulse-slow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
  
  .animate-pulse {
    animation: pulse-slow 2s ease-in-out infinite;
  }
  
  /* Gradient border animations */
  .border-2.border-dashed {
    background-image: 
      linear-gradient(45deg, transparent 25%, rgba(139, 92, 246, 0.1) 25%, rgba(139, 92, 246, 0.1) 50%, transparent 50%, transparent 75%, rgba(139, 92, 246, 0.1) 75%);
    background-size: 8px 8px;
    animation: move 1s linear infinite;
  }
  
  @keyframes move {
    0% { background-position: 0 0; }
    100% { background-position: 8px 8px; }
  }
  
  /* Enhanced hover effects */
  .relative.overflow-hidden:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }
  
  /* Smooth transitions */
  .relative.overflow-hidden {
    transition: all 0.2s ease-in-out;
  }
</style>
