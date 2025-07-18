<script>
    import { createEventDispatcher } from 'svelte';
    import { paymentsApi } from '$lib/api';
    import { formatCurrency } from '$lib/utils/formatters';
    import { format } from 'date-fns';

    export let cessionId;
    export let remainingBalance;

    const dispatch = createEventDispatcher();

    let amount = '';
    let paymentDate = format(new Date(), 'yyyy-MM-dd');
    let notes = '';
    let error = '';
    let loading = false;

    async function handleSubmit() {
        error = '';
        if (!amount || !paymentDate) {
            error = 'Please fill in all required fields';
            return;
        }

        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            error = 'Please enter a valid payment amount';
            return;
        }

        if (paymentAmount > remainingBalance) {
            error = 'Payment amount cannot exceed remaining balance';
            return;
        }

        loading = true;
        try {
            const payment = await paymentsApi.create({
                cessionId,
                amount: paymentAmount,
                paymentDate,
                notes
            });
            dispatch('paymentAdded', payment);
            // Reset form
            amount = '';
            paymentDate = format(new Date(), 'yyyy-MM-dd');
            notes = '';
        } catch (e) {
            error = e.response?.data?.message || 'Failed to add payment';
        } finally {
            loading = false;
        }
    }
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4 p-4 bg-white rounded-lg shadow">
    <h3 class="text-lg font-semibold mb-4">Add New Payment</h3>

    <div class="grid gap-4">
        <div>
            <label for="amount" class="block text-sm font-medium text-gray-700 mb-1">Amount*</label>
            <input
                id="amount"
                type="number"
                step="0.01"
                bind:value={amount}
                placeholder="Enter payment amount"
                required
                class="input"
            />
            <p class="text-sm text-gray-500 mt-1">
                Remaining balance: {formatCurrency(remainingBalance)}
            </p>
        </div>

        <div>
            <label for="paymentDate" class="block text-sm font-medium text-gray-700 mb-1">Payment Date*</label>
            <input
                id="paymentDate"
                type="date"
                bind:value={paymentDate}
                required
                class="input"
            />
        </div>

        <div>
            <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
                id="notes"
                type="text"
                bind:value={notes}
                placeholder="Add any additional notes"
                class="input"
            />
        </div>
    </div>

    {#if error}
        <div class="text-red-500 text-sm mt-2">{error}</div>
    {/if}

    <div class="flex justify-end gap-2 mt-4">
        <button type="submit" class="btn btn-primary" disabled={loading}>
            {loading ? 'Adding Payment...' : 'Add Payment'}
        </button>
    </div>
</form>