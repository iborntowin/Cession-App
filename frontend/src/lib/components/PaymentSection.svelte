<script>
  import { onMount } from 'svelte';
  import { paymentsApi } from '$lib/api';
  import { formatCurrency, formatDate } from '$lib/utils/formatters';
  import { format, subMonths } from 'date-fns';
  import { t } from '$lib/i18n';

  export let cessionId;
  export let remainingBalance;
  export let totalLoanAmount;
  export let monthlyPayment;

  // Debug logging
  console.log('PaymentSection props:', { cessionId, remainingBalance, totalLoanAmount });

  let payments = [];
  let loading = false;
  let error = '';
  let success = '';

  // Payment form state
  let amount = '';
  let paymentDate = format(new Date(), 'yyyy-MM-dd');
  let paymentType = 'REGULAR';
  let notes = '';

  // Date range filter
  let startDate = format(subMonths(new Date(), 3), 'yyyy-MM-dd');
  let endDate = format(new Date(), 'yyyy-MM-dd');

  // Statistics
  let totalPaid = 0;
  let progress = 0;

  // Add tracker logic
  let paidMonths = 0;

  onMount(async () => {
    console.log('PaymentSection onMount - cessionId:', cessionId);
    if (!cessionId || cessionId === 'null' || cessionId === 'undefined') {
      console.error('PaymentSection: Invalid cession ID:', cessionId);
      error = $t('payments.errors.invalid_cession_id');
      return;
    }
    await loadPayments();
  });

  async function loadPayments() {
    console.log('loadPayments - cessionId:', cessionId);
    if (!cessionId || cessionId === 'null' || cessionId === 'undefined') {
      console.error('Cannot load payments: Invalid cession ID:', cessionId);
      error = $t('payments.errors.invalid_cession_id');
      return;
    }
    
    loading = true;
    error = '';
    try {
      console.log('Calling getPaymentsByDateRange with:', { cessionId, startDate, endDate });
      const response = await paymentsApi.getPaymentsByDateRange(cessionId, startDate, endDate);
      console.log('getPaymentsByDateRange response:', response);
      if (response.success) {
        payments = response.data;
        calculateStatistics();
      } else {
        error = response.error || $t('payments.errors.load_failed');
        console.error('Failed to load payments:', response.error);
      }
    } catch (e) {
      error = $t('payments.errors.load_failed');
      console.error('Error loading payments:', e);
    } finally {
      loading = false;
    }
  }

  function calculateStatistics() {
    totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    progress = (totalLoanAmount > 0) ? (totalPaid / totalLoanAmount) * 100 : 0;
  }

  // Tracker logic: calculate paid and partial months
  $: fullMonths = monthlyPayment > 0 ? Math.floor(totalPaid / monthlyPayment) : 0;
  $: partialMonthFraction = monthlyPayment > 0 ? (totalPaid / monthlyPayment) - fullMonths : 0;

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
        // Reset form
        amount = '';
        paymentDate = format(new Date(), 'yyyy-MM-dd');
        paymentType = 'REGULAR';
        notes = '';
        // Reload payments
        await loadPayments();
        // Update remainingBalance locally
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
</script>

<div class="space-y-8">
  <!-- Payment Statistics -->
  <div class="bg-white rounded-xl shadow p-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <h3 class="text-sm font-medium text-gray-500">{$t('payments.stats.total_paid')}</h3>
        <p class="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(totalPaid)}</p>
      </div>
      <div>
        <h3 class="text-sm font-medium text-gray-500">{$t('payments.stats.remaining_balance')}</h3>
        <p class="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(remainingBalance)}</p>
      </div>
      <div>
        <h3 class="text-sm font-medium text-gray-500">{$t('payments.stats.progress')}</h3>
        <div class="mt-1">
          <div class="w-full bg-gray-200 rounded-full h-2.5">
            <div
              class="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
              style="width: {progress}%"
            ></div>
          </div>
          <p class="mt-1 text-sm text-gray-600">{progress.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Payment Form -->
  <div class="bg-white rounded-xl shadow p-6">
    <h3 class="text-lg font-medium text-gray-900 mb-4">{$t('payments.form.add_payment')}</h3>
    {#if error}
      <div class="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
        {error}
      </div>
    {/if}
    {#if success}
      <div class="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">
        {success}
      </div>
    {/if}
    <form on:submit|preventDefault={handleSubmit} class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="amount" class="block text-sm font-medium text-gray-700">{$t('payments.form.amount')}</label>
          <input
            type="number"
            id="amount"
            bind:value={amount}
            step="0.01"
            min="0"
            max={remainingBalance}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            required
          />
        </div>
        <div>
          <label for="paymentDate" class="block text-sm font-medium text-gray-700">{$t('payments.form.payment_date')}</label>
          <input
            type="date"
            id="paymentDate"
            bind:value={paymentDate}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            required
          />
        </div>
      </div>
      <div>
        <label for="notes" class="block text-sm font-medium text-gray-700">{$t('payments.form.notes')}</label>
        <textarea
          id="notes"
          bind:value={notes}
          rows="3"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        ></textarea>
      </div>
      <div class="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {#if loading}
            <span class="inline-block animate-spin mr-2">⟳</span>
          {/if}
          {$t('payments.form.add_payment')}
        </button>
      </div>
    </form>
  </div>

  <!-- Payment List -->
  <div class="bg-white rounded-xl shadow p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-medium text-gray-900">{$t('payments.history.title')}</h3>
      <div class="flex space-x-4">
        <div>
          <label for="startDate" class="block text-sm font-medium text-gray-700">{$t('payments.history.start_date')}</label>
          <input
            type="date"
            id="startDate"
            bind:value={startDate}
            on:change={handleDateRangeChange}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
        <div>
          <label for="endDate" class="block text-sm font-medium text-gray-700">{$t('payments.history.end_date')}</label>
          <input
            type="date"
            id="endDate"
            bind:value={endDate}
            on:change={handleDateRangeChange}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>
    {#if loading}
      <div class="text-center py-4">
        <span class="inline-block animate-spin mr-2">⟳</span>
        {$t('payments.history.loading')}
      </div>
    {:else if error}
      <div class="text-center py-4 text-red-600">
        {error}
      </div>
    {:else if payments.length === 0}
      <div class="text-center py-4 text-gray-500">
        {$t('payments.history.no_payments')}
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('payments.history.columns.date')}</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('payments.history.columns.amount')}</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('payments.history.columns.notes')}</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each payments as payment}
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(payment.paymentDate)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(payment.amount)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {payment.notes || '-'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
    {#if !loading && payments.length > 0}
      <div class="mt-8">
        <h3 class="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          18-Month Payment Tracker
          {#if (fullMonths + partialMonthFraction) >= 18}
            <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 animate-bounce">🎉 Fully Paid!</span>
          {/if}
        </h3>
        <div class="mb-2">
          <div class="w-full bg-gray-200 rounded-full h-2.5">
            <div class="bg-green-500 h-2.5 rounded-full transition-all duration-300" style="width: {Math.min(((fullMonths + partialMonthFraction)/18)*100,100)}%"></div>
          </div>
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>{(fullMonths + partialMonthFraction).toFixed(2)} / 18 months paid</span>
            {#if (fullMonths + partialMonthFraction) < 18}
              <span>{(18 - (fullMonths + partialMonthFraction)).toFixed(2)} months left</span>
            {/if}
          </div>
        </div>
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4">
          {#each Array(18) as _, i}
            <div class="relative group">
              <div class="flex flex-col items-center justify-center h-16 w-full rounded-lg border-2 transition-colors duration-300
                {i < fullMonths ? 'bg-green-100 border-green-500' : i === fullMonths && partialMonthFraction > 0 ? 'bg-yellow-100 border-yellow-500' : 'bg-gray-100 border-gray-300'}
                hover:shadow-lg cursor-pointer">
                <span class="text-xs font-semibold mb-1">{$t('payments.tracker.month', { n: i+1 })}</span>
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
              {#if i < fullMonths}
                <div class="absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-white border border-gray-300 rounded shadow px-2 py-1 text-xs text-gray-700 whitespace-nowrap">
                  {$t('payments.tracker.paid_on', { date: formatDate(payments[i]?.paymentDate), amount: formatCurrency(payments[i]?.amount) })}
                </div>
              {:else if i === fullMonths && partialMonthFraction > 0}
                <div class="absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-white border border-yellow-300 rounded shadow px-2 py-1 text-xs text-yellow-700 whitespace-nowrap">
                  {$t('payments.tracker.partial_paid', { percent: Math.round(partialMonthFraction * 100) })}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div> 