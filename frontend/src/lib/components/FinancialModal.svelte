<script>
  import { createEventDispatcher } from 'svelte';
  import ExpenseForm from './ExpenseForm.svelte';
  import IncomeForm from './IncomeForm.svelte';

  export let show = false;
  export let type = 'expense'; // 'expense' or 'income'

  const dispatch = createEventDispatcher();

  function handleClose() {
    show = false;
  }

  function handleSuccess(data) {
    dispatch('success', data);
    show = false;
  }
</script>

{#if show}
  <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" on:click={handleClose}></div>

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                Add {type === 'expense' ? 'Expense' : 'Income'}
              </h3>
              <div class="mt-4">
                {#if type === 'expense'}
                  <ExpenseForm on:success={handleSuccess} />
                {:else}
                  <IncomeForm on:success={handleSuccess} />
                {/if}
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            on:click={handleClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if} 