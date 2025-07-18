<script>
  export let filters = {
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    searchQuery: ''
  };
  export let onFilterChange = () => {};

  function resetFilters() {
    filters = {
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      searchQuery: ''
    };
    onFilterChange();
  }
</script>

<div class="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
  <div class="flex flex-col">
    <label for="search" class="block text-sm font-medium text-gray-700 mb-1">Search</label>
    <input
      type="text"
      id="search"
      class="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
      placeholder="Search payments..."
      bind:value={filters.searchQuery}
      on:input={onFilterChange}
    />
  </div>

  <div class="flex flex-col">
    <label for="minAmount" class="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
    <input
      type="number"
      id="minAmount"
      class="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
      placeholder="Min amount"
      bind:value={filters.minAmount}
      on:input={onFilterChange}
    />
  </div>

  <div class="flex flex-col">
    <label for="maxAmount" class="block text-sm font-medium text-gray-700 mb-1">Max Amount</label>
    <input
      type="number"
      id="maxAmount"
      class="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
      placeholder="Max amount"
      bind:value={filters.maxAmount}
      on:input={onFilterChange}
    />
  </div>

  <div class="flex flex-col">
    <label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
    <input
      type="date"
      id="startDate"
      class="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
      bind:value={filters.startDate}
      on:change={onFilterChange}
    />
  </div>

  <div class="flex flex-col">
    <label for="endDate" class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
    <input
      type="date"
      id="endDate"
      class="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
      bind:value={filters.endDate}
      on:change={onFilterChange}
    />
  </div>

  <div class="col-span-1 md:col-span-2 lg:col-span-5 flex justify-end">
    <button
      type="button"
      class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      on:click={resetFilters}
    >
      Reset Filters
    </button>
  </div>
</div>