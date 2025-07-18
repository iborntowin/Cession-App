<script>
  import { formatCurrency } from '$lib/utils/formatters';

  export let payments = [];
  
  $: totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  $: averageAmount = payments.length > 0 ? totalAmount / payments.length : 0;
  $: totalPayments = payments.length;
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-medium text-gray-900">Total Payments</h3>
    <p class="mt-2 text-3xl font-semibold text-gray-900">{totalPayments}</p>
      </div>
  
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-medium text-gray-900">Total Amount</h3>
    <p class="mt-2 text-3xl font-semibold text-gray-900">{formatCurrency(totalAmount)}</p>
    </div>
  
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-medium text-gray-900">Average Payment</h3>
    <p class="mt-2 text-3xl font-semibold text-gray-900">{formatCurrency(averageAmount)}</p>
    </div>
</div>