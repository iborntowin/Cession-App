<script>
  import { formatCurrency, formatDate } from '$lib/utils';
  import { createEventDispatcher } from 'svelte';
  import Dialog, { Title, Content, Actions } from '@smui/dialog';
  import Button from '@smui/button';
  import Textfield from '@smui/textfield';
  import Select from '@smui/select';
  import { Option } from '@smui/list';
  
  import '@material/dialog/dist/mdc.dialog.css';
  import '@material/button/dist/mdc.button.css';
  import '@material/textfield/dist/mdc.textfield.css';
  import '@material/select/dist/mdc.select.css';
  import '@material/floating-label/dist/mdc.floating-label.css';
  import '@material/line-ripple/dist/mdc.line-ripple.css';
  import '@material/notched-outline/dist/mdc.notched-outline.css';

  const dispatch = createEventDispatcher();

  export let payment = null;
  export let show = false;
  export let mode = 'view'; // 'view' or 'edit'

  let editedPayment = {};
  let saving = false;
  let error = '';

  $: if (payment && mode === 'edit') {
    editedPayment = { ...payment };
  }

  const paymentTypes = [
    { value: 'regular', label: 'Regular Payment' },
    { value: 'extra', label: 'Extra Payment' },
    { value: 'late', label: 'Late Payment' },
    { value: 'partial', label: 'Partial Payment' }
  ];

  const paymentStatuses = [
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' }
  ];

  async function handleSave() {
    try {
      saving = true;
      error = '';
      dispatch('save', editedPayment);
      show = false;
    } catch (err) {
      error = err.message;
    } finally {
      saving = false;
    }
  }

  function handleClose() {
    show = false;
    error = '';
    dispatch('close');
  }
</script>

<Dialog
  bind:open={show}
  aria-labelledby="payment-dialog-title"
  aria-describedby="payment-dialog-content"
  surface$style="width: 800px; max-width: 100%;"
>
  <Title id="payment-dialog-title">
    {mode === 'view' ? 'Payment Details' : 'Edit Payment'}
  </Title>

  <Content id="payment-dialog-content">
    {#if error}
      <div class="mdc-typography--body2 text-error mb-4 p-4 bg-error-surface rounded">
        {error}
      </div>
    {/if}

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Amount -->
      <div>
        {#if mode === 'edit'}
          <Textfield
            variant="outlined"
            label="Amount"
            type="number"
            required
            bind:value={editedPayment.amount}
            class="w-full"
          />
        {:else}
          <div class="mdc-typography--subtitle1">
            <span class="mdc-typography--caption">Amount</span><br>
            {formatCurrency(payment?.amount)}
          </div>
        {/if}
      </div>

      <!-- Payment Date -->
      <div>
        {#if mode === 'edit'}
          <Textfield
            variant="outlined"
            label="Payment Date"
            type="date"
            required
            bind:value={editedPayment.paymentDate}
            class="w-full"
          />
        {:else}
          <div class="mdc-typography--subtitle1">
            <span class="mdc-typography--caption">Payment Date</span><br>
            {formatDate(payment?.paymentDate)}
          </div>
        {/if}
      </div>

      <!-- Payment Type -->
      <div>
        {#if mode === 'edit'}
          <Select
            variant="outlined"
            label="Payment Type"
            required
            class="w-full"
            bind:value={editedPayment.type}
          >
            {#each paymentTypes as type}
              <Option value={type.value}>{type.label}</Option>
            {/each}
          </Select>
        {:else}
          <div class="mdc-typography--subtitle1">
            <span class="mdc-typography--caption">Payment Type</span><br>
            {payment?.type || 'Regular Payment'}
          </div>
        {/if}
      </div>

      <!-- Status -->
      <div>
        {#if mode === 'edit'}
          <Select
            variant="outlined"
            label="Status"
            required
            class="w-full"
            bind:value={editedPayment.status}
          >
            {#each paymentStatuses as status}
              <Option value={status.value}>{status.label}</Option>
            {/each}
          </Select>
        {:else}
          <div class="mdc-typography--subtitle1">
            <span class="mdc-typography--caption">Status</span><br>
            {payment?.status || 'Completed'}
          </div>
        {/if}
      </div>

      <!-- Notes -->
      <div class="col-span-full">
        {#if mode === 'edit'}
          <Textfield
            variant="outlined"
            label="Notes"
            type="textarea"
            bind:value={editedPayment.notes}
            class="w-full"
            input$rows="3"
          />
        {:else}
          <div class="mdc-typography--body1">
            <span class="mdc-typography--caption">Notes</span><br>
            {payment?.notes || 'No notes provided'}
          </div>
        {/if}
      </div>
    </div>
  </Content>

  <Actions>
    <Button variant="outlined" on:click={handleClose}>Cancel</Button>
    {#if mode === 'edit'}
      <Button
        variant="raised"
        disabled={saving}
        on:click={handleSave}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    {/if}
  </Actions>
</Dialog>