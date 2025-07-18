<!-- Income Form Component -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { financialApi } from '$lib/api';
  import { showAlert } from '$lib/stores';

  export let income = {
    amount: '',
    source: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  };

  const dispatch = createEventDispatcher();
  let loading = false;
  let error = null;

  const sources = [
    'salary',
    'commission',
    'investment',
    'rental',
    'other'
  ];

  async function handleSubmit() {
    try {
      loading = true;
      error = null;

      // Validate required fields
      if (!income.amount || !income.date) {
        throw new Error('Please fill in all required fields');
      }

      // Validate amount is a positive number
      const amount = parseFloat(income.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      const response = await financialApi.createIncome({
        ...income,
        amount: amount
      });

      if (response.success) {
        showAlert('Income added successfully', 'success');
        dispatch('submit', response.data);
        // Reset form
        income = {
          amount: '',
          source: '',
          date: new Date().toISOString().split('T')[0],
          description: ''
        };
      } else {
        throw new Error(response.error);
      }
    } catch (err) {
      console.error('Error creating income:', err);
      error = err.message;
      showAlert(error, 'error');
    } finally {
      loading = false;
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4">
  {#if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <span class="block sm:inline">{error}</span>
    </div>
  {/if}

  <div>
    <label for="source" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Source</label>
    <select
      id="source"
      bind:value={income.source}
      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
    >
      <option value="">Select a source</option>
      {#each sources as source}
        <option value={source}>{source.charAt(0).toUpperCase() + source.slice(1)}</option>
      {/each}
    </select>
  </div>

  <div>
    <label for="amount" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (TND) *</label>
    <input
      type="number"
      id="amount"
      bind:value={income.amount}
      min="0"
      step="0.01"
      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      required
    />
  </div>

  <div>
    <label for="date" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Date *</label>
    <input
      type="date"
      id="date"
      bind:value={income.date}
      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      required
    />
  </div>

  <div>
    <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Additional Notes</label>
    <textarea
      id="description"
      bind:value={income.description}
      rows="3"
      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      placeholder="Add any additional details about this income..."
    ></textarea>
  </div>

  <div class="flex justify-end">
    <button
      type="submit"
      class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
      disabled={loading}
    >
      {#if loading}
        <span class="inline-block animate-spin mr-2">⟳</span>
      {/if}
      Add Income
    </button>
  </div>
</form>

<style>
  /* Add any component-specific styles here */
</style> 