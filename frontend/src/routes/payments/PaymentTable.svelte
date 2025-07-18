<script>
  import { formatCurrency, formatDate } from '$lib/utils/formatters';
  import { createEventDispatcher } from 'svelte';

  export let payments = [];
  export let currentPage = 1;
  export let totalPages = 1;
  export let onPageChange = () => {};
  export let onSort = () => {};
  export let sortField = '';
  export let sortOrder = 'asc';
  export let onAction = () => {};

  const dispatch = createEventDispatcher();

  function handleSort(field) {
    if (sortField === field) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortOrder = 'asc';
    }
    onSort(field, sortOrder);
  }

  function handleAction(action, payment) {
    if (action === 'delete') {
      if (confirm('Are you sure you want to delete this payment?')) {
        dispatch('action', { type: 'delete', payment });
      }
    } else {
      dispatch('action', { type: action, payment });
    }
  }
</script>

<div class="overflow-x-auto bg-white rounded-lg shadow">
  <table class="min-w-full divide-y divide-gray-200">
    <thead class="bg-gray-50">
      <tr>
        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" on:click={() => handleSort('cessionClientName')}>
          Client {#if sortField === 'cessionClientName'}{sortOrder === 'asc' ? '↑' : '↓'}{/if}
        </th>
        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" on:click={() => handleSort('amount')}>
          Amount {#if sortField === 'amount'}{sortOrder === 'asc' ? '↑' : '↓'}{/if}
        </th>
        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" on:click={() => handleSort('paymentDate')}>
          Date {#if sortField === 'paymentDate'}{sortOrder === 'asc' ? '↑' : '↓'}{/if}
        </th>
        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Notes
        </th>
        <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
          Actions
        </th>
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-gray-200">
      {#each payments as payment}
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            {payment.cessionClientName}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(payment.amount)}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatDate(payment.paymentDate)}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {payment.notes || 'No notes'}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <div class="flex justify-end space-x-2">
              <button
                type="button"
                class="text-indigo-600 hover:text-indigo-900"
                on:click={() => handleAction('view', payment)}
              >
                View
              </button>
              <button
                type="button"
                class="text-blue-600 hover:text-blue-900"
                on:click={() => handleAction('edit', payment)}
              >
                Edit
              </button>
              <button
                type="button"
                class="text-red-600 hover:text-red-900"
                on:click={() => handleAction('delete', payment)}
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<div class="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
  <div class="flex justify-between flex-1 sm:hidden">
    <button
      type="button"
      class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={currentPage === 1}
      on:click={() => onPageChange(currentPage - 1)}
    >
      Previous
    </button>
    <button
      type="button"
      class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={currentPage === totalPages}
      on:click={() => onPageChange(currentPage + 1)}
    >
      Next
    </button>
  </div>
  <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
    <div>
      <p class="text-sm text-gray-700">
        Page <span class="font-medium">{currentPage}</span> of <span class="font-medium">{totalPages}</span>
      </p>
    </div>
    <div>
      <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
        <button
          type="button"
          class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={currentPage === 1}
          on:click={() => onPageChange(currentPage - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={currentPage === totalPages}
          on:click={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
      </nav>
    </div>
  </div>
</div>