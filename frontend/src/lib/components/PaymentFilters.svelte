<script>
  import { format, subMonths } from 'date-fns';
  import { debounce } from '$lib/utils/helpers';

  export let onFilterChange = () => {};
  
  let startDate = format(subMonths(new Date(), 1), 'yyyy-MM-dd');
  let endDate = format(new Date(), 'yyyy-MM-dd');
  let minAmount = null;
  let maxAmount = null;
  let clientSearch = '';
  let isSearchVisible = false;

  function toggleSearch() {
    isSearchVisible = !isSearchVisible;
    if (!isSearchVisible) {
      clientSearch = '';
      onFilterChange({ clientSearch: '' });
    }
  }

  function handleDateChange() {
    onFilterChange({ startDate, endDate });
  }

  function handleAmountChange() {
    onFilterChange({ minAmount, maxAmount });
  }

  function handleClientSearch() {
    debouncedSearch();
  }

  const debouncedSearch = debounce(() => {
    onFilterChange({ clientSearch });
  }, 300);

  function resetFilters() {
    startDate = format(subMonths(new Date(), 1), 'yyyy-MM-dd');
    endDate = format(new Date(), 'yyyy-MM-dd');
    minAmount = null;
    maxAmount = null;
    clientSearch = '';
    onFilterChange({ startDate, endDate, minAmount, maxAmount, clientSearch });
  }
</script>

<div class="bg-white shadow rounded-lg p-4">
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-lg font-medium text-gray-900">Filters</h2>
    <div class="flex space-x-2">
      <button
        type="button"
        class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        on:click={toggleSearch}
      >
        {isSearchVisible ? 'Hide Search' : 'Show Search'}
      </button>
      <button
        type="button"
        class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        on:click={resetFilters}
      >
        Reset
      </button>
    </div>
    </div>

  <div class="space-y-4">
    {#if isSearchVisible}
      <div class="transition-all duration-200 ease-in-out">
        <label for="clientSearch" class="block text-sm font-medium text-gray-700">Search by Client</label>
        <div class="mt-1">
          <input
        type="text"
            id="clientSearch"
            bind:value={clientSearch}
            on:input={handleClientSearch}
            class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="Enter client name..."
      />
    </div>
      </div>
    {/if}

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label for="startDate" class="block text-sm font-medium text-gray-700">Start Date</label>
        <input
          type="date"
          id="startDate"
          bind:value={startDate}
          on:change={handleDateChange}
          class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      />
    </div>
      <div>
        <label for="endDate" class="block text-sm font-medium text-gray-700">End Date</label>
        <input
          type="date"
          id="endDate"
          bind:value={endDate}
          on:change={handleDateChange}
          class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      />
    </div>
  </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label for="minAmount" class="block text-sm font-medium text-gray-700">Min Amount</label>
        <input
          type="number"
          id="minAmount"
          bind:value={minAmount}
          on:change={handleAmountChange}
          class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Enter minimum amount"
      />
    </div>
      <div>
        <label for="maxAmount" class="block text-sm font-medium text-gray-700">Max Amount</label>
        <input
          type="number"
          id="maxAmount"
          bind:value={maxAmount}
          on:change={handleAmountChange}
          class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Enter maximum amount"
        />
      </div>
    </div>
  </div>
</div>