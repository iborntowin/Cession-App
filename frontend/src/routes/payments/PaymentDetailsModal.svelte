<script>
  import { formatCurrency, formatDate } from '$lib/utils/formatters';
  import { createEventDispatcher } from 'svelte';
  import { t } from '$lib/i18n';
  
  export let show = false;
  export let payment = null;
  export let mode = 'view'; // 'view' or 'edit'

  const dispatch = createEventDispatcher();
  let editedPayment = {};
  let error = '';
  let loading = false;

  $: if (payment && mode === 'edit') {
    editedPayment = { ...payment };
  }

  async function handleSave() {
    try {
      loading = true;
      error = '';
      dispatch('save', editedPayment);
      show = false;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function handleClose() {
    show = false;
    error = '';
    dispatch('close');
  }

  async function handleDelete() {
    if (confirm($t('payments.modal.confirm_delete'))) {
      try {
        loading = true;
        error = '';
        dispatch('delete', payment);
        show = false;
      } catch (err) {
        error = err.message;
      } finally {
        loading = false;
      }
    }
  }
</script>

{#if show}
<div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40"></div>

<div class="fixed inset-0 z-50 overflow-y-auto">
  <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
    <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
      <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
        <div class="sm:flex sm:items-start">
          <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
            <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
              {mode === 'view' ? $t('payments.modal.payment_details') : $t('payments.modal.edit_payment')}
            </h3>

            {#if error}
              <div class="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
                {error}
              </div>
            {/if}

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">{$t('payments.modal.client')}</label>
                <p class="mt-1 text-sm text-gray-900">{payment?.cessionClientName}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">{$t('payments.modal.amount')}</label>
                {#if mode === 'edit'}
                  <input
                    type="number"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    bind:value={editedPayment.amount}
                  />
                {:else}
                  <p class="mt-1 text-sm text-gray-900">{formatCurrency(payment?.amount)}</p>
                {/if}
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">{$t('payments.modal.payment_date')}</label>
                {#if mode === 'edit'}
                  <input
                    type="date"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    bind:value={editedPayment.paymentDate}
                  />
                {:else}
                  <p class="mt-1 text-sm text-gray-900">{formatDate(payment?.paymentDate)}</p>
                {/if}
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">{$t('payments.modal.notes')}</label>
                {#if mode === 'edit'}
                  <textarea
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    rows="3"
                    bind:value={editedPayment.notes}
                  ></textarea>
                {:else}
                  <p class="mt-1 text-sm text-gray-900">{payment?.notes || $t('payments.modal.no_notes')}</p>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
        {#if mode === 'view'}
          <button
            type="button"
            class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
            on:click={() => mode = 'edit'}
          >
            {$t('payments.modal.edit')}
          </button>
          <button
            type="button"
            class="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
            on:click={handleDelete}
            disabled={loading}
          >
            {loading ? $t('payments.modal.deleting') : $t('payments.modal.delete')}
          </button>
        {:else}
          <button
            type="button"
            class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
            on:click={handleSave}
            disabled={loading}
          >
            {loading ? $t('payments.modal.saving') : $t('payments.modal.save_changes')}
          </button>
        {/if}
        <button
          type="button"
          class="mt-3 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          on:click={handleClose}
        >
          {mode === 'edit' ? $t('payments.modal.cancel') : $t('payments.modal.close')}
        </button>
      </div>
    </div>
  </div>
</div>
{/if}