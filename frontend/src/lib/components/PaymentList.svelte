<script>
    import { onMount } from 'svelte';
    import { paymentsApi } from '$lib/api';
    import { formatCurrency, formatDate } from '$lib/utils/formatters';

    export let cessionId;
    export let onPaymentUpdate = () => {};

    let payments = [];
    let loading = true;
    let error = '';

    async function loadPayments() {
        try {
            loading = true;
            const result = await paymentsApi.getCessionPayments(cessionId);
            payments = result.success ? result.data : [];
            error = result.success ? '' : result.error || 'Failed to load payments';
        } catch (e) {
            error = 'Failed to load payments';
            console.error('Error loading payments:', e);
        } finally {
            loading = false;
        }
    }

    onMount(loadPayments);

    export function refresh() {
        loadPayments();
    }
</script>

<div class="bg-white rounded-lg shadow overflow-hidden">
    <div class="p-4 border-b">
        <h3 class="text-lg font-semibold">Payment History</h3>
    </div>

    {#if loading}
        <div class="p-4 text-center text-gray-500">
            Loading payments...
        </div>
    {:else if error}
        <div class="p-4 text-center text-red-500">
            {error}
        </div>
    {:else if payments.length === 0}
        <div class="p-4 text-center text-gray-500">
            No payments recorded yet.
        </div>
    {:else}
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Balance</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    {#each payments as payment}
                        <tr class="hover:bg-gray-50 transition-colors">
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(payment.paymentDate)}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(payment.amount)}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(payment.remainingBalanceAfterPayment)}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div class="flex items-center">
                                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            class="bg-blue-600 h-2.5 rounded-full"
                                            style="width: {payment.updatedProgress}%"
                                        ></div>
                                    </div>
                                    <span class="ml-2 text-sm text-gray-600">
                                        {payment.updatedProgress?.toFixed(1) ?? 0}%
                                    </span>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.notes || '-'}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>