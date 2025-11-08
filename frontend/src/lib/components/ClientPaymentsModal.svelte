<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  export let isOpen = false;
  export let payments = [];
  export let clientName = '';
  export let onClose = () => {};
  export let inline = false; // New prop for inline display
  
  let searchQuery = '';
  let sortField = 'date';
  let sortDirection = 'desc';
  let selectedCession = 'all';
  let selectedStatus = 'all';
  let dateFrom = '';
  let dateTo = '';
  let currentPage = 1;
  let itemsPerPage = 20;
  
  // Get unique cessions for filter with monthly payment info
  $: uniqueCessions = [...new Set(payments.map(p => p.cessionId))].map(id => {
    const payment = payments.find(p => p.cessionId === id);
    return {
      id,
      monthlyPayment: payment?.monthlyPayment || 0,
      cessionNumber: payment?.cessionNumber || payment?.cessionName
    };
  });
  
  // Filter and sort payments
  $: filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      searchQuery === '' ||
      payment.amount?.toString().includes(searchQuery) ||
      payment.cessionName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCession = selectedCession === 'all' || payment.cessionId === selectedCession;
    const matchesStatus = selectedStatus === 'all' || payment.status === selectedStatus;
    
    const dateStr = payment.paymentDate || payment.date;
    const paymentDate = dateStr ? new Date(dateStr) : null;
    const matchesDateFrom = !dateFrom || !paymentDate || paymentDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || !paymentDate || paymentDate <= new Date(dateTo);
    
    return matchesSearch && matchesCession && matchesStatus && matchesDateFrom && matchesDateTo;
  }).sort((a, b) => {
    let aVal, bVal;
    
    switch(sortField) {
      case 'date':
        const aDateStr = a.paymentDate || a.date;
        const bDateStr = b.paymentDate || b.date;
        aVal = aDateStr ? new Date(aDateStr) : new Date(0);
        bVal = bDateStr ? new Date(bDateStr) : new Date(0);
        break;
      case 'amount':
        aVal = a.amount || 0;
        bVal = b.amount || 0;
        break;
      case 'cession':
        aVal = a.cessionName || '';
        bVal = b.cessionName || '';
        break;
      case 'status':
        aVal = a.status || '';
        bVal = b.status || '';
        break;
      default:
        return 0;
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  
  // Pagination
  $: totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  $: paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Statistics
  $: totalAmount = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  $: averageAmount = filteredPayments.length > 0 ? totalAmount / filteredPayments.length : 0;
  $: onTimePayments = filteredPayments.filter(p => p.isOnTime).length;
  $: latePayments = filteredPayments.filter(p => !p.isOnTime && p.status === 'paid').length;
  
  function handleSort(field) {
    if (sortField === field) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = 'desc';
    }
  }
  
  function resetFilters() {
    searchQuery = '';
    selectedCession = 'all';
    selectedStatus = 'all';
    dateFrom = '';
    dateTo = '';
    currentPage = 1;
  }
  
  function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(amount);
  }
  
  function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ar-TN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  function getStatusBadge(status) {
    const badges = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      late: 'bg-red-100 text-red-800',
      partial: 'bg-blue-100 text-blue-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  }
  
  function exportToCSV() {
    const headers = ['Date', 'Cession', 'Amount', 'Status', 'Days Delay', 'Notes'];
    const rows = filteredPayments.map(p => [
      formatDate(p.paymentDate || p.date),
      getCessionLabel(p),
      p.amount || 0,
      p.status || '',
      p.daysDelay || 0,
      (p.notes || '').replace(/,/g, ';')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${clientName}_payments_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  function exportToPrint() {
    window.print();
  }
  
  function viewCession(cessionId) {
    if (cessionId) {
      goto(`/cessions/${cessionId}`);
    }
  }
  
  function getCessionLabel(payment) {
    if (payment.monthlyPayment) {
      return `${formatCurrency(payment.monthlyPayment)}/month`;
    }
    return payment.cessionNumber || payment.cessionName || 'Unknown';
  }
  
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
  
  onMount(() => {
    if (isOpen && !inline) {
      document.addEventListener('keydown', handleKeydown);
      return () => document.removeEventListener('keydown', handleKeydown);
    }
  });
  
  $: if (!inline && isOpen) {
    document.body.style.overflow = 'hidden';
  } else if (!inline) {
    document.body.style.overflow = '';
  }
</script>

{#if isOpen || inline}
  <div class={inline ? "inline-content" : "modal-overlay"} on:click={inline ? null : onClose}>
    <div class={inline ? "" : "modal-content"} on:click|stopPropagation={inline ? null : true}>
      <!-- Header -->
      <div class={inline ? "inline-header" : "modal-header"}>
        <div>
          <h2 class="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Payment History Details
          </h2>
          <p class="text-sm text-gray-600 mt-1">{clientName}</p>
        </div>
        {#if !inline}
          <button
            on:click={onClose}
            class="close-button"
            aria-label="Close"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        {/if}
      </div>
      
      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon bg-blue-100 text-blue-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-600">Total Payments</p>
            <p class="text-2xl font-bold text-gray-900">{filteredPayments.length}</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon bg-green-100 text-green-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-600">Total Amount</p>
            <p class="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon bg-purple-100 text-purple-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-600">Average Amount</p>
            <p class="text-2xl font-bold text-purple-600">{formatCurrency(averageAmount)}</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon bg-emerald-100 text-emerald-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-600">On-Time Payments</p>
            <p class="text-2xl font-bold text-emerald-600">
              {onTimePayments} <span class="text-sm text-gray-500">/ {latePayments} late</span>
            </p>
          </div>
        </div>
      </div>
      
      <!-- Filters -->
      <div class="filters-section">
        <div class="filters-grid">
          <!-- Search -->
          <div class="filter-item">
            <label class="filter-label">Search</label>
            <div class="search-input-wrapper">
              <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search by amount, cession, notes..."
                class="filter-input pl-10"
              />
            </div>
          </div>
          
          <!-- Cession Filter -->
          <div class="filter-item">
            <label class="filter-label">Filter by Cession</label>
            <select bind:value={selectedCession} class="filter-input">
              <option value="all">All Cessions</option>
              {#each uniqueCessions as cession}
                <option value={cession.id}>
                  {cession.monthlyPayment ? `${formatCurrency(cession.monthlyPayment)}/month` : (cession.cessionNumber || 'Unknown')}
                </option>
              {/each}
            </select>
          </div>
          
          <!-- Status Filter -->
          <div class="filter-item">
            <label class="filter-label">Filter by Status</label>
            <select bind:value={selectedStatus} class="filter-input">
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="late">Late</option>
              <option value="partial">Partial</option>
            </select>
          </div>
          
          <!-- Date From -->
          <div class="filter-item">
            <label class="filter-label">Date From</label>
            <input type="date" bind:value={dateFrom} class="filter-input" />
          </div>
          
          <!-- Date To -->
          <div class="filter-item">
            <label class="filter-label">Date To</label>
            <input type="date" bind:value={dateTo} class="filter-input" />
          </div>
          
          <!-- Reset Button -->
          <div class="filter-item flex items-end">
            <button on:click={resetFilters} class="reset-button">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Reset Filters
            </button>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="action-buttons">
          <button on:click={exportToCSV} class="action-button bg-green-600 hover:bg-green-700">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Export to CSV
          </button>
          
          <button on:click={exportToPrint} class="action-button bg-blue-600 hover:bg-blue-700">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Print
          </button>
        </div>
      </div>
      
      <!-- Table -->
      <div class="table-container">
        <table class="payments-table">
          <thead>
            <tr>
              <th on:click={() => handleSort('date')} class="sortable">
                <div class="th-content">
                  Date
                  <svg class="sort-icon" class:rotate={sortField === 'date' && sortDirection === 'asc'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </th>
              <th on:click={() => handleSort('cession')} class="sortable">
                <div class="th-content">
                  Cession
                  <svg class="sort-icon" class:rotate={sortField === 'cession' && sortDirection === 'asc'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </th>
              <th on:click={() => handleSort('amount')} class="sortable text-right">
                <div class="th-content justify-end">
                  Amount
                  <svg class="sort-icon" class:rotate={sortField === 'amount' && sortDirection === 'asc'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </th>
              <th on:click={() => handleSort('status')} class="sortable">
                <div class="th-content">
                  Status
                  <svg class="sort-icon" class:rotate={sortField === 'status' && sortDirection === 'asc'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </th>
              <th class="text-center">Delay</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {#if paginatedPayments.length === 0}
              <tr>
                <td colspan="6" class="text-center py-8 text-gray-500">
                  No payments found matching your filters
                </td>
              </tr>
            {:else}
              {#each paginatedPayments as payment}
                <tr class="payment-row">
                  <td class="whitespace-nowrap">{formatDate(payment.paymentDate || payment.date)}</td>
                  <td>
                    <button
                      on:click={() => viewCession(payment.cessionId)}
                      class="cession-link truncate max-w-xs text-left"
                      title="Click to view cession details"
                    >
                      {getCessionLabel(payment)}
                    </button>
                  </td>
                  <td class="text-right font-semibold text-gray-900">
                    {formatCurrency(payment.amount || 0)}
                  </td>
                  <td>
                    <span class="status-badge {getStatusBadge(payment.status)}">
                      {payment.status || 'paid'}
                    </span>
                  </td>
                  <td class="text-center">
                    {#if payment.daysDelay}
                      <span class="delay-badge" class:text-red-600={payment.daysDelay > 0} class:text-green-600={payment.daysDelay <= 0}>
                        {payment.daysDelay > 0 ? '+' : ''}{payment.daysDelay}d
                      </span>
                    {:else}
                      -
                    {/if}
                  </td>
                  <td>
                    <div class="truncate max-w-xs text-sm text-gray-600" title={payment.notes}>
                      {payment.notes || '-'}
                    </div>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="pagination">
          <button
            on:click={() => currentPage = Math.max(1, currentPage - 1)}
            disabled={currentPage === 1}
            class="pagination-button"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Previous
          </button>
          
          <div class="pagination-info">
            <span class="text-sm text-gray-700">
              Page <span class="font-semibold">{currentPage}</span> of <span class="font-semibold">{totalPages}</span>
            </span>
            <span class="text-xs text-gray-500 ml-2">
              ({filteredPayments.length} total payments)
            </span>
          </div>
          
          <button
            on:click={() => currentPage = Math.min(totalPages, currentPage + 1)}
            disabled={currentPage === totalPages}
            class="pagination-button"
          >
            Next
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      {/if}
    </div> <!-- Close inner div (empty class for inline, modal-content for modal) -->
  </div> <!-- Close outer div (inline-content or modal-overlay) -->
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    padding: 1rem;
    animation: fadeIn 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .modal-content {
    background: white;
    border-radius: 1.5rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    max-width: 90vw;
    max-height: 90vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease-out;
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    padding: 2rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .close-button {
    padding: 0.5rem;
    border-radius: 0.75rem;
    color: #6b7280;
    transition: all 0.2s;
    background: transparent;
    border: none;
    cursor: pointer;
  }
  
  .close-button:hover {
    background: #f3f4f6;
    color: #1f2937;
    transform: scale(1.1);
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    padding: 1.5rem 2rem;
    background: linear-gradient(135deg, #f0fdfa 0%, #f0f9ff 100%);
  }
  
  .stat-card {
    display: flex;
    gap: 1rem;
    padding: 1.25rem;
    background: white;
    border-radius: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.3s;
  }
  
  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
  
  .stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 0.75rem;
    flex-shrink: 0;
  }
  
  .filters-section {
    padding: 1.5rem 2rem;
    border-bottom: 1px solid #e5e7eb;
    background: #fafafa;
  }
  
  .filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .filter-item {
    display: flex;
    flex-direction: column;
  }
  
  .filter-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }
  
  .filter-input {
    padding: 0.625rem 0.875rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    transition: all 0.2s;
  }
  
  .filter-input:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }
  
  .search-input-wrapper {
    position: relative;
  }
  
  .search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.25rem;
    height: 1.25rem;
    color: #9ca3af;
    pointer-events: none;
  }
  
  .reset-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.625rem 1rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  }
  
  .reset-button:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }
  
  .action-buttons {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  
  .action-button {
    display: flex;
    align-items: center;
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: white;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .table-container {
    overflow-x: auto;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  
  .payments-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .payments-table thead {
    background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
    color: white;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  .payments-table th {
    padding: 1rem;
    text-align: left;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .payments-table th.sortable {
    cursor: pointer;
    user-select: none;
    transition: background 0.2s;
  }
  
  .payments-table th.sortable:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .th-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .sort-icon {
    width: 1rem;
    height: 1rem;
    transition: transform 0.2s;
  }
  
  .sort-icon.rotate {
    transform: rotate(180deg);
  }
  
  .payments-table td {
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    font-size: 0.875rem;
  }
  
  .payment-row {
    transition: background 0.2s;
  }
  
  .payment-row:hover {
    background: #f9fafb;
  }
  
  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: capitalize;
  }
  
  .delay-badge {
    font-weight: 600;
    font-size: 0.875rem;
  }
  
  .cession-link {
    background: none;
    border: none;
    color: #3b82f6;
    font-weight: 500;
    cursor: pointer;
    padding: 0;
    text-decoration: none;
    transition: all 0.2s;
    display: inline-block;
  }
  
  .cession-link:hover {
    color: #2563eb;
    text-decoration: underline;
  }
  
  .cession-link:active {
    color: #1d4ed8;
  }
  
  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-top: 1px solid #e5e7eb;
    background: #fafafa;
  }
  
  .pagination-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .pagination-button:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #10b981;
    color: #10b981;
  }
  
  .pagination-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .pagination-info {
    display: flex;
    align-items: center;
  }
  
  @media (max-width: 768px) {
    .modal-content {
      max-width: 95vw;
      max-height: 95vh;
    }
    
    .modal-header {
      padding: 1.5rem;
    }
    
    .stats-grid {
      grid-template-columns: 1fr;
      padding: 1rem;
    }
    
    .filters-grid {
      grid-template-columns: 1fr;
    }
    
    .pagination {
      flex-direction: column;
      gap: 1rem;
    }
    
    .payments-table {
      font-size: 0.75rem;
    }
    
    .payments-table th,
    .payments-table td {
      padding: 0.5rem;
    }
  }
  
  @media print {
    .modal-overlay {
      background: white;
      backdrop-filter: none;
    }
    
    .close-button,
    .filters-section,
    .pagination,
    .action-buttons {
      display: none !important;
    }
    
    .modal-content {
      max-width: 100%;
      max-height: 100%;
      box-shadow: none;
    }
  }
  
  /* Inline Version Styles */
  .inline-content {
    background: white;
    border-radius: 1.5rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    width: 100%;
    display: flex;
    flex-direction: column;
    margin-bottom: 2rem;
  }
  
  .inline-header {
    padding: 2rem;
    border-bottom: 1px solid #e5e7eb;
  }
</style>

