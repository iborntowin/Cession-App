<script>
  import { onMount } from 'svelte';
  import { cessionsApi, clientsApi } from '$lib/api';
  import { showAlert, loading } from '$lib/stores';
  
  export let data;
  
  let client = null;
  let cession = {
    clientId: data.clientId,
    totalLoanAmount: '',
    monthlyPayment: '',
    startDate: new Date().toISOString().split('T')[0], // Today's date as default
    bankOrAgency: '',
    status: 'ACTIVE'
  };
  let isEdit = false;
  
  onMount(async () => {
    await loadClient();
    
    if (data.cessionId !== 'new') {
      isEdit = true;
      await loadCession();
    }
  });
  
  async function loadClient() {
    try {
      client = await clientsApi.getById(data.clientId);
    } catch (error) {
      showAlert(error.message || 'Failed to load client details', 'error');
    }
  }
  
  async function loadCession() {
    $loading = true;
    try {
      cession = await cessionsApi.getById(data.cessionId);
      
      // Format date for input field
      if (cession.startDate) {
        cession.startDate = new Date(cession.startDate).toISOString().split('T')[0];
      }
      if (cession.endDate) {
        cession.endDate = new Date(cession.endDate).toISOString().split('T')[0];
      }
    } catch (error) {
      showAlert(error.message || 'Failed to load cession details', 'error');
    } finally {
      $loading = false;
    }
  }
  
  async function saveCession() {
    // Validate form
    if (!cession.totalLoanAmount || !cession.monthlyPayment || !cession.startDate || !cession.bankOrAgency) {
      showAlert('Please fill in all required fields', 'error');
      return;
    }
    
    // Validate numbers
    if (isNaN(parseFloat(cession.totalLoanAmount)) || isNaN(parseFloat(cession.monthlyPayment))) {
      showAlert('Amount and monthly payment must be valid numbers', 'error');
      return;
    }
    
    // Ensure monthly payment is less than total amount
    if (parseFloat(cession.monthlyPayment) >= parseFloat(cession.totalLoanAmount)) {
      showAlert('Monthly payment must be less than the total loan amount', 'error');
      return;
    }
    
    $loading = true;
    try {
      if (isEdit) {
        await cessionsApi.update(data.cessionId, cession);
        showAlert('Cession updated successfully', 'success');
      } else {
        const newCession = await cessionsApi.create(cession);
        showAlert('Cession created successfully', 'success');
        // Redirect to the new cession's page
        window.location.href = `/clients/${data.clientId}/cessions/${newCession.id}`;
      }
    } catch (error) {
      showAlert(error.message || 'Failed to save cession', 'error');
    } finally {
      $loading = false;
    }
  }
</script>

<script context="module">
  export function load({ params }) {
    return {
      clientId: params.id,
      cessionId: params.cessionId
    };
  }
</script>

<svelte:head>
  <title>{isEdit ? 'Edit' : 'New'} Cession | Cession Management</title>
</svelte:head>

<div>
  <div class="mb-6">
    <a href={isEdit ? `/clients/${data.clientId}/cessions/${data.cessionId}` : `/clients/${data.clientId}/cessions`} class="text-primary-600 hover:text-primary-800 mb-2 inline-block">
      &larr; {isEdit ? 'Back to Cession Details' : 'Back to Cessions'}
    </a>
    <h1 class="text-2xl font-bold text-gray-800">{isEdit ? 'Edit' : 'New'} Cession</h1>
  </div>
  
  {#if client}
    <div class="card mb-6">
      <h2 class="text-lg font-semibold mb-2">Client Information</h2>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-500">Full Name</p>
          <p class="font-medium">{client.fullName}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">CIN (ID Number)</p>
          <p class="font-medium">{client.cin}</p>
        </div>
      </div>
    </div>
  {/if}
  
  {#if $loading && isEdit && !cession.bankOrAgency}
    <div class="text-center py-8">
      <p>Loading cession details...</p>
    </div>
  {:else}
    <div class="card max-w-2xl">
      <form on:submit|preventDefault={saveCession} class="space-y-4">
        <div>
          <label for="bankOrAgency" class="label">Bank / Agency</label>
          <input
            id="bankOrAgency"
            type="text"
            bind:value={cession.bankOrAgency}
            class="input"
            placeholder="Enter bank or agency name"
            disabled={$loading}
            required
          />
        </div>
        
        <div>
          <label for="totalLoanAmount" class="label">Total Loan Amount (TND)</label>
          <input
            id="totalLoanAmount"
            type="number"
            step="0.01"
            min="0"
            bind:value={cession.totalLoanAmount}
            class="input"
            placeholder="Enter total loan amount"
            disabled={$loading}
            required
          />
        </div>
        
        <div>
          <label for="monthlyPayment" class="label">Monthly Payment (TND)</label>
          <input
            id="monthlyPayment"
            type="number"
            step="0.01"
            min="0"
            bind:value={cession.monthlyPayment}
            class="input"
            placeholder="Enter monthly payment amount"
            disabled={$loading}
            required
          />
        </div>
        
        <div>
          <label for="startDate" class="label">Start Date</label>
          <input
            id="startDate"
            type="date"
            bind:value={cession.startDate}
            class="input"
            disabled={$loading}
            required
          />
        </div>
        
        <div>
          <label for="endDate" class="label">End Date (Optional)</label>
          <input
            id="endDate"
            type="date"
            bind:value={cession.endDate}
            class="input"
            disabled={$loading}
          />
          <p class="text-sm text-gray-500 mt-1">If not provided, will be calculated based on monthly payment.</p>
        </div>
        
        {#if isEdit}
          <div>
            <label for="status" class="label">Status</label>
            <select id="status" bind:value={cession.status} class="input" disabled={$loading}>
              <option value="ACTIVE">Active</option>
              <option value="FINISHED">Finished</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        {/if}
        
        <div class="pt-4">
          <button
            type="submit"
            class="btn btn-primary"
            disabled={$loading}
          >
            {$loading ? 'Saving...' : (isEdit ? 'Update Cession' : 'Create Cession')}
          </button>
        </div>
      </form>
    </div>
  {/if}
</div>
