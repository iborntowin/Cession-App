<script>
  import { onMount } from 'svelte';
  import { formatCurrency, formatDate } from '$lib/utils/formatters';
  import { goto } from '$app/navigation';
  import { user, showAlert } from '$lib/stores';
  import PaymentFilters from '$lib/components/PaymentFilters.svelte';
  import PaymentStats from '$lib/components/PaymentStats.svelte';
  import PaymentTable from './PaymentTable.svelte';
  import PaymentDetailsModal from './PaymentDetailsModal.svelte';
  import { paymentsApi } from '$lib/api';

  let payments = [];
  let filteredPayments = [];
  let loading = true;
  let error = null;
  let currentPage = 1;
  let totalPages = 1;
  let sortField = '';
  let sortOrder = 'asc';
  let filters = {
    startDate: null,
    endDate: null,
    minAmount: null,
    maxAmount: null,
    clientSearch: ''
  };

  // Modal state
  let showModal = false;
  let selectedPayment = null;
  let modalMode = 'view';

  onMount(async () => {
    // Check if user has admin role
    const currentUser = $user;
    if (!currentUser || currentUser.role !== 'ADMIN') {
      showAlert('You do not have permission to access this page', 'error');
      goto('/');
      return;
    }

    await loadPayments();
  });

  async function loadPayments() {
    try {
      loading = true;
      error = null;
      const response = await paymentsApi.getAllPayments();
      if (response.success) {
        payments = response.data;
        applyFilters();
      } else {
        error = response.error;
      }
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function handleFilterChange(newFilters) {
    filters = { ...filters, ...newFilters };
    applyFilters();
  }

  function applyFilters() {
    filteredPayments = payments.filter(payment => {
      // Client search filter
      if (filters.clientSearch && !payment.cessionClientName.toLowerCase().includes(filters.clientSearch.toLowerCase())) {
        return false;
      }

      // Date range filter
      if (filters.startDate && new Date(payment.paymentDate) < new Date(filters.startDate)) {
        return false;
      }
      if (filters.endDate && new Date(payment.paymentDate) > new Date(filters.endDate)) {
        return false;
      }

      // Amount range filter
      if (filters.minAmount && payment.amount < filters.minAmount) {
        return false;
      }
      if (filters.maxAmount && payment.amount > filters.maxAmount) {
        return false;
      }

      return true;
    });

    // Apply sorting
    if (sortField) {
      filteredPayments.sort((a, b) => {
        let comparison = 0;
        if (sortField === 'cessionClientName') {
          comparison = a.cessionClientName.localeCompare(b.cessionClientName);
        } else if (sortField === 'amount') {
          comparison = a.amount - b.amount;
        } else if (sortField === 'paymentDate') {
          comparison = new Date(a.paymentDate) - new Date(b.paymentDate);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    // Calculate pagination
    totalPages = Math.ceil(filteredPayments.length / 10);
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * 10;
    filteredPayments = filteredPayments.slice(start, start + 10);
  }

  function handleSort(field) {
    if (sortField === field) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortOrder = 'asc';
    }
    applyFilters();
  }

  function handlePageChange(page) {
    currentPage = page;
    applyFilters();
  }

  function handlePaymentAction(event) {
    const { type, payment } = event.detail;
    if (type === 'delete') {
      handlePaymentDelete(payment);
    } else {
      selectedPayment = payment;
      modalMode = type;
      showModal = true;
    }
  }

  async function handlePaymentSave(event) {
    const updatedPayment = event.detail;
    try {
      const response = await paymentsApi.update(updatedPayment.id, updatedPayment);
      if (response.success) {
        showAlert('Payment updated successfully', 'success');
        await loadPayments();
      } else {
        showAlert(response.error || 'Failed to update payment', 'error');
      }
    } catch (err) {
      showAlert(err.message || 'Failed to update payment', 'error');
    }
  }

  async function handlePaymentDelete(payment) {
    try {
      const response = await paymentsApi.delete(payment.id);
      if (response.success) {
        showAlert('Payment deleted successfully', 'success');
        await loadPayments();
      } else {
        showAlert(response.error || 'Failed to delete payment', 'error');
      }
    } catch (err) {
      showAlert(err.message || 'Failed to delete payment', 'error');
    }
  }
</script>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-gray-900 mb-8">Payments</h1>

  {#if loading}
    <div class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 border-l-4 border-red-400 p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-700">{error}</p>
        </div>
      </div>
    </div>
  {:else}
    <div class="space-y-6">
      <PaymentStats {payments} />
      <PaymentFilters onFilterChange={handleFilterChange} />
      <PaymentTable
        payments={filteredPayments}
        {currentPage}
        {totalPages}
        onPageChange={handlePageChange}
        onSort={handleSort}
        {sortField}
        {sortOrder}
        on:action={handlePaymentAction}
      />
    </div>
  {/if}
</div>

<PaymentDetailsModal
  bind:show={showModal}
  payment={selectedPayment}
  mode={modalMode}
  on:save={handlePaymentSave}
  on:delete={handlePaymentDelete}
  on:close={() => showModal = false}
/>