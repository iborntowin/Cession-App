<script>
    import { onMount } from 'svelte';
    import { cessionsApi, clientsApi } from '$lib/api';
    import { showAlert, loading } from '$lib/stores';
    import { goto } from '$app/navigation';
    
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
    
    onMount(async () => {
      console.log('New Cession Page - Client ID:', data.clientId);
      if (!data.clientId) {
        console.error('No client ID provided');
        showAlert('Invalid client ID', 'error');
        goto('/clients');
        return;
      }
      await loadClient();
    });
    
    async function loadClient() {
      $loading = true;
      try {
        console.log('Loading client with ID:', data.clientId);
        const result = await clientsApi.getById(data.clientId);
        if (result.success) {
          client = result.data;
          console.log('Client loaded successfully:', client);
          // Update cession with client data
          cession.clientId = client.id;
        } else {
          console.error('Failed to load client:', result.error);
          showAlert(result.error || 'Failed to load client details', 'error');
          goto('/clients');
        }
      } catch (error) {
        console.error('Error loading client:', error);
        showAlert(error.message || 'Failed to load client details', 'error');
        goto('/clients');
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
        showAlert('Please enter valid numbers for amounts', 'error');
        return;
      }
      
      $loading = true;
      try {
        console.log('Creating cession with data:', cession);
        const result = await cessionsApi.create(cession);
        if (result.success) {
          showAlert('Cession created successfully', 'success');
          goto(`/clients/${data.clientId}/cessions/${result.data.id}`);
        } else {
          console.error('Failed to create cession:', result.error);
          showAlert(result.error || 'Failed to create cession', 'error');
        }
      } catch (error) {
        console.error('Error creating cession:', error);
        showAlert(error.message || 'Failed to create cession', 'error');
      } finally {
        $loading = false;
      }
    }
  </script>
  
  <svelte:head>
    <title>New Cession | Cession Management</title>
  </svelte:head>
  
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div class="mb-6">
      <a href={`/clients/${data.clientId}/cessions`} class="text-primary-600 hover:text-primary-800 mb-2 inline-block">
        &larr; Back to Cessions
      </a>
      <h1 class="text-2xl font-bold text-gray-800">New Cession</h1>
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
    
    <form on:submit|preventDefault={saveCession} class="card">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label for="bankOrAgency" class="block text-sm font-medium text-gray-700">Bank or Agency</label>
          <input
            type="text"
            id="bankOrAgency"
            bind:value={cession.bankOrAgency}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            required
          />
        </div>
        
        <div>
          <label for="totalLoanAmount" class="block text-sm font-medium text-gray-700">Total Loan Amount</label>
          <input
            type="number"
            id="totalLoanAmount"
            bind:value={cession.totalLoanAmount}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            required
          />
        </div>
        
        <div>
          <label for="monthlyPayment" class="block text-sm font-medium text-gray-700">Monthly Payment</label>
          <input
            type="number"
            id="monthlyPayment"
            bind:value={cession.monthlyPayment}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            required
          />
        </div>
        
        <div>
          <label for="startDate" class="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            id="startDate"
            bind:value={cession.startDate}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            required
          />
        </div>
      </div>
      
      <div class="mt-6 flex justify-end space-x-3">
        <a
          href={`/clients/${data.clientId}/cessions`}
          class="btn btn-secondary"
        >
          Cancel
        </a>
        <button
          type="submit"
          class="btn btn-primary"
          disabled={$loading}
        >
          Create Cession
        </button>
      </div>
    </form>
  </div>