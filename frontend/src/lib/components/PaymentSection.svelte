<script>
  import { onMount, tick } from 'svelte';
  import { paymentsApi } from '$lib/api';
  import { formatCurrency, formatDate } from '$lib/utils/formatters';
  import { format, subMonths, addYears } from 'date-fns';
  import { t } from '$lib/i18n';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  export let cessionId;
  export let remainingBalance;
  export let totalLoanAmount;
  export let monthlyPayment;

  let payments = [];
  let loading = false;
  let error = '';
  let success = '';

  // Payment form state
  let amount = '';
  let paymentDate = format(new Date(), 'yyyy-MM-dd');
  let paymentType = 'REGULAR';
  let notes = '';

  // Date range filter - FIXED: Expand to 2 years to show all payments
  // Previous: 3 months caused missing payments (e.g., 6/30/2025 excluded when viewing on 10/5/2025)
  let startDate = format(subMonths(new Date(), 24), 'yyyy-MM-dd'); // 2 years back
  let endDate = format(new Date(), 'yyyy-MM-dd');

  // Statistics
  let totalPaid = 0;
  let progress = 0;

  // Tracker logic
  let fullMonths = 0;
  let partialMonthFraction = 0;

  onMount(async () => {
    if (!cessionId || cessionId === 'null' || cessionId === 'undefined') {
      error = $t('payments.errors.invalid_cession_id');
      return;
    }
    await loadPayments();
    await tick();
  });

  async function loadPayments() {
    if (!cessionId || cessionId === 'null' || cessionId === 'undefined') {
      error = $t('payments.errors.invalid_cession_id');
      return;
    }
    
    loading = true;
    error = '';
    try {
      const response = await paymentsApi.getPaymentsByDateRange(cessionId, startDate, endDate);
      if (response.success) {
        payments = response.data;
        
        // 🔍 DEBUG: Log payment filtering to help identify missing payments
        console.log('💰 Payment Loading Debug:');
        console.log('  Cession ID:', cessionId);
        console.log('  Date Range:', startDate, '→', endDate);
        console.log('  Payments Found:', payments.length);
        console.log('  Payment Dates:', payments.map(p => p.paymentDate).join(', '));
        console.log('  Total Amount:', payments.reduce((sum, p) => sum + p.amount, 0));
        
        calculateStatistics();
      } else {
        error = response.error || $t('payments.errors.load_failed');
      }
    } catch (e) {
      error = $t('payments.errors.load_failed');
      console.error('❌ Payment loading error:', e);
    } finally {
      loading = false;
    }
  }

  function calculateStatistics() {
    totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    progress = (totalLoanAmount > 0) ? (totalPaid / totalLoanAmount) * 100 : 0;
    fullMonths = monthlyPayment > 0 ? Math.floor(totalPaid / monthlyPayment) : 0;
    partialMonthFraction = monthlyPayment > 0 ? (totalPaid / monthlyPayment) - fullMonths : 0;
  }

  async function handleSubmit() {
    if (!amount || !paymentDate) {
      error = $t('payments.validation.required_fields');
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      error = $t('payments.validation.invalid_amount');
      return;
    }

    if (paymentAmount > remainingBalance) {
      error = $t('payments.validation.amount_exceeds_balance');
      return;
    }

    loading = true;
    error = '';
    try {
      const response = await paymentsApi.create({
        cessionId,
        amount: paymentAmount,
        paymentDate,
        paymentType,
        notes
      });

      if (response.success) {
        success = $t('payments.success.added');
        amount = '';
        paymentDate = format(new Date(), 'yyyy-MM-dd');
        paymentType = 'REGULAR';
        notes = '';
        await loadPayments();
        remainingBalance -= paymentAmount;
        if (remainingBalance < 0) remainingBalance = 0;
      } else {
        error = response.error || $t('payments.errors.add_failed');
      }
    } catch (e) {
      error = e.message || $t('payments.errors.add_failed');
    } finally {
      loading = false;
    }
  }

  function handleDateRangeChange() {
    loadPayments();
  }

  // 🔧 Show all payments from beginning to future
  function showAllPayments() {
    startDate = '2020-01-01'; // Far back enough to catch all payments
    endDate = format(addYears(new Date(), 2), 'yyyy-MM-dd'); // 2 years into future
    loadPayments();
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 space-y-6">
  <!-- Statistics Cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <!-- Total Paid Card -->
    <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6" transition:fly={{ y: 20, duration: 300, easing: cubicOut }}>
      <div class="flex items-center space-x-4">
        <div class="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-3 text-white">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01"></path>
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-medium text-purple-600">{$t('payments.stats.total_paid')}</h3>
          <p class="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(totalPaid)}</p>
        </div>
      </div>
    </div>

    <!-- Remaining Balance Card -->
    <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6" transition:fly={{ y: 20, duration: 300, delay: 50, easing: cubicOut }}>
      <div class="flex items-center space-x-4">
        <div class="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-3 text-white">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01"></path>
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-medium text-purple-600">{$t('payments.stats.remaining_balance')}</h3>
          <p class="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(remainingBalance)}</p>
        </div>
      </div>
    </div>

    <!-- Progress Card -->
    <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6" transition:fly={{ y: 20, duration: 300, delay: 100, easing: cubicOut }}>
      <div class="flex items-center space-x-4">
        <div class="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-3 text-white">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l-4 4-4-4"></path>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-medium text-purple-600">{$t('payments.stats.progress')}</h3>
          <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div class="bg-gradient-to-r from-purple-600 to-indigo-600 h-2.5 rounded-full" style="width: {progress}%"></div>
          </div>
          <p class="mt-1 text-sm font-medium text-gray-700">{progress.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Payment Form -->
  <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden" transition:fly={{ y: 20, duration: 300, delay: 150, easing: cubicOut }}>
    <div class="p-6 border-b border-gray-200/50">
      <h3 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
        {$t('payments.form.add_payment')}
      </h3>
    </div>

    <div class="p-6">
      {#if error}
        <div class="mb-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm font-medium">
          {error}
        </div>
      {/if}
      {#if success}
        <div class="mb-4 p-4 bg-green-50 text-green-600 rounded-lg border border-green-200 text-sm font-medium">
          {success}
        </div>
      {/if}

      <form on:submit|preventDefault={handleSubmit} class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="amount" class="block text-sm font-medium text-purple-600 mb-2">{$t('payments.form.amount')}*</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              bind:value={amount}
              placeholder={$t('payments.form.amount_placeholder')}
              min="0"
              max={remainingBalance}
              class="w-full pl-4 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
              required
            />
            <p class="mt-2 text-sm text-gray-500">
              {$t('payments.form.remaining_balance')}: <span class="font-medium text-gray-700">{formatCurrency(remainingBalance)}</span>
            </p>
          </div>

          <div>
            <label for="paymentDate" class="block text-sm font-medium text-purple-600 mb-2">{$t('payments.form.payment_date')}*</label>
            <input
              id="paymentDate"
              type="date"
              bind:value={paymentDate}
              class="w-full pl-4 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
              required
            />
          </div>
        </div>

        <div>
          <label for="notes" class="block text-sm font-medium text-purple-600 mb-2">{$t('payments.form.notes')}</label>
          <textarea
            id="notes"
            bind:value={notes}
            rows="3"
            placeholder={$t('payments.form.notes_placeholder')}
            class="w-full pl-4 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
          ></textarea>
        </div>

        <div class="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            class="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {#if loading}
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {$t('common.processing')}
            {:else}
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              {$t('payments.form.add_payment')}
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Payment History -->
  <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden" transition:fly={{ y: 20, duration: 300, delay: 200, easing: cubicOut }}>
    <div class="p-6 border-b border-gray-200/50">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <h3 class="text-lg font-medium bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          {$t('payments.history.title')}
        </h3>
        
        <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 items-end">
          <div>
            <label for="startDate" class="block text-sm font-medium text-purple-600 mb-1">{$t('payments.history.start_date')}</label>
            <input
              id="startDate"
              type="date"
              bind:value={startDate}
              on:change={handleDateRangeChange}
              class="w-full pl-4 pr-4 py-2 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
            />
          </div>
          <div>
            <label for="endDate" class="block text-sm font-medium text-purple-600 mb-1">{$t('payments.history.end_date')}</label>
            <input
              id="endDate"
              type="date"
              bind:value={endDate}
              on:change={handleDateRangeChange}
              class="w-full pl-4 pr-4 py-2 border border-gray-200 bg-white text-gray-900 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
            />
          </div>
          
          <!-- 🔍 Show All Payments Button -->
          <button
            on:click={showAllPayments}
            class="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm whitespace-nowrap"
            title="Show all payments without date filter"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
            </svg>
            Show All
          </button>
        </div>
      </div>
    </div>

    <div class="p-6">
      {#if loading}
        <div class="flex justify-center items-center py-16">
          <div class="relative">
            <div class="w-12 h-12 border-4 border-purple-200 rounded-full animate-spin"></div>
            <div class="absolute top-0 left-0 w-12 h-12 border-4 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
        </div>
      {:else if error}
        <div class="text-center py-16 text-red-600 font-medium">
          {error}
        </div>
      {:else if payments.length === 0}
        <div class="text-center py-16">
          <div class="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H4a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">{$t('payments.history.no_payments')}</h3>
          <p class="text-gray-500">{$t('payments.history.no_payments_hint')}</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full bg-white/80 backdrop-blur-sm rounded-lg overflow-hidden">
            <thead class="bg-gray-50/80 backdrop-blur-sm">
              <tr>
                <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('payments.history.columns.date')}</th>
                <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('payments.history.columns.amount')}</th>
                <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('payments.history.columns.type')}</th>
                <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('payments.history.columns.notes')}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#each payments as payment, i}
                <tr 
                  class="hover:bg-purple-50/80 transition-colors duration-150" 
                  transition:fly={{ y: 10, delay: i * 50, duration: 200 }}
                >
                  <td class="py-4 px-4 whitespace-nowrap text-sm text-gray-700"><span dir="ltr">{formatDate(payment.paymentDate)}</span></td>
                  <td class="py-4 px-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</td>
                  <td class="py-4 px-4 whitespace-nowrap text-sm text-gray-700">{payment.paymentType || 'REGULAR'}</td>
                  <td class="py-4 px-4 text-sm text-gray-700">{payment.notes || '-'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Months Tracker -->
        <div class="mt-8 pt-6 border-t border-gray-200/50">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span class="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {$t('payments.tracker.title')}
            </span>
            {#if (fullMonths + partialMonthFraction) >= 18}
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 animate-bounce">
                🎉 {$t('payments.tracker.fully_paid')}
              </span>
            {/if}
          </h3>
          
          <div class="mb-4">
            <div class="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                class="bg-gradient-to-r from-green-500 to-green-600 h-2.5 rounded-full transition-all duration-300" 
                style="width: {Math.min(((fullMonths + partialMonthFraction)/18)*100,100)}%"
              ></div>
            </div>
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>{(fullMonths + partialMonthFraction).toFixed(2)} / 18 {$t('payments.tracker.months_paid')}</span>
              {#if (fullMonths + partialMonthFraction) < 18}
                <span>{(18 - (fullMonths + partialMonthFraction)).toFixed(2)} {$t('payments.tracker.months_left')}</span>
              {/if}
            </div>
          </div>
          
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {#each Array(18) as _, i}
  <div class="relative group">
    <div class="flex flex-col items-center justify-center h-16 w-full rounded-lg border-2 transition-all duration-300
      {i < fullMonths ? 'bg-green-100 border-green-500 hover:shadow-lg' : 
       i === fullMonths && partialMonthFraction > 0 ? 'bg-yellow-100 border-yellow-500 hover:shadow-lg' : 
       'bg-gray-100 border-gray-300 hover:border-gray-400'}">
      <span class="text-xs font-semibold mb-1">Mois {i+1}</span>  <!-- Changed from {n} to {i+1} -->
      {#if i < fullMonths}
        <span class="text-green-600 text-lg font-bold animate-pulse">✔</span>
      {:else if i === fullMonths && partialMonthFraction > 0}
        <svg class="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <defs>
            <linearGradient id="half-fill" x1="0" x2="1" y1="0" y2="0">
              <stop offset="50%" stop-color="#f59e42" />
              <stop offset="50%" stop-color="#fff" />
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="16" height="16" rx="4" fill="url(#half-fill)" />
          <path d="M9 12l2 2 4-4" stroke="#f59e42" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      {:else}
        <span class="text-gray-400 text-lg font-bold">—</span>
      {/if}
    </div>
  </div>
{/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>