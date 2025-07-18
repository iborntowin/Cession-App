<!-- Expense Form Component -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { financialApi } from '$lib/api';
  import { showAlert, user } from '$lib/stores';
  import { get } from 'svelte/store';

  export let expense = {
    category: '',
    label: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  };

  const dispatch = createEventDispatcher();
  let loading = false;
  let error = null;

  const categories = [
    'WATER',
    'ELECTRICITY',
    'TRANSPORT',
    'RENT',
    'SUPPLIES',
    'MAINTENANCE',
    'SALARIES',
    'INSURANCE',
    'TAXES',
    'MARKETING',
    'OTHER'
  ];

  async function handleSubmit() {
    try {
      loading = true;
      error = null;

      // Validate required fields
      if (!expense.category || !expense.label || !expense.amount || !expense.date) {
        throw new Error('Please fill in all required fields');
      }

      // Validate amount is a positive number
      const amount = parseFloat(expense.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      const currentUser = get(user);
      if (!currentUser || !currentUser.id) {
        throw new Error('User not authenticated');
      }

      const response = await financialApi.createExpense({
        ...expense,
        amount: amount,
        userId: currentUser.id
      });

      if (response.success) {
        showAlert('Expense added successfully', 'success');
        dispatch('submit', response.data);
        // Reset form
        expense = {
          category: '',
          label: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          description: ''
        };
      } else {
        throw new Error(response.error);
      }
    } catch (err) {
      console.error('Error creating expense:', err);
      error = err.message;
      showAlert(error, 'error');
    } finally {
      loading = false;
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4 bg-white p-6 rounded-lg shadow-md border border-gray-100">
  {#if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <span class="block sm:inline">{error}</span>
    </div>
  {/if}

  <div>
    <label for="category" class="block text-sm font-medium text-primary-700 mb-1">Category *</label>
    <select
      id="category"
      bind:value={expense.category}
      class="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white text-gray-900"
      required
    >
      <option value="">Select a category</option>
      {#each categories as category}
        <option value={category}>{category.charAt(0) + category.slice(1).toLowerCase().replace('_', ' ')}</option>
      {/each}
    </select>
  </div>

  <div>
    <label for="label" class="block text-sm font-medium text-primary-700 mb-1">Description *</label>
    <input
      type="text"
      id="label"
      bind:value={expense.label}
      class="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white text-gray-900"
      required
    />
  </div>

  <div>
    <label for="amount" class="block text-sm font-medium text-primary-700 mb-1">Amount (TND) *</label>
    <input
      type="number"
      id="amount"
      bind:value={expense.amount}
      min="0"
      step="0.01"
      class="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white text-gray-900"
      required
    />
  </div>

  <div>
    <label for="date" class="block text-sm font-medium text-primary-700 mb-1">Date *</label>
    <input
      type="date"
      id="date"
      bind:value={expense.date}
      class="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white text-gray-900"
      required
    />
  </div>

  <div>
    <label for="description" class="block text-sm font-medium text-primary-700 mb-1">Additional Notes</label>
    <textarea
      id="description"
      bind:value={expense.description}
      rows="3"
      class="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white text-gray-900"
      placeholder="Add any additional details about this expense..."
    ></textarea>
  </div>

  <div class="flex justify-end">
    <button
      type="submit"
      class="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors duration-200"
      disabled={loading}
    >
      {#if loading}
        <span class="inline-block animate-spin mr-2">⟳</span>
      {/if}
      Add Expense
    </button>
  </div>
</form>

<style>
  /* Remove dark mode and use white/blue theme */
</style> 