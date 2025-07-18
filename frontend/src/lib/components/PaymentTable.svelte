<script>
  import { formatCurrency, formatDate } from '$lib/utils';
  import { createEventDispatcher } from 'svelte';
  import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
  import Button from '@smui/button';
  import Menu from '@smui/menu';
  import List, { Item } from '@smui/list';
  import Select from '@smui/select';
  
  import '@material/data-table/dist/mdc.data-table.css';
  import '@material/menu/dist/mdc.menu.css';
  import '@material/list/dist/mdc.list.css';

  const dispatch = createEventDispatcher();

  export let payments = [];
  export let loading = false;

  let sortField = 'paymentDate';
  let sortDirection = 'desc';
  let itemsPerPage = 10;
  let currentPage = 1;
  let menu;

  const statusColors = {
    completed: 'green',
    pending: 'yellow',
    failed: 'red',
    default: 'blue'
  };

  function getStatusBadgeColor(status) {
    return statusColors[status?.toLowerCase()] || statusColors.default;
  }

  function handleSort(field) {
    if (sortField === field) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = 'asc';
    }
  }

  function getSortIcon(field) {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  }

  $: sortedPayments = [...payments].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'amount') {
      comparison = a.amount - b.amount;
    } else if (sortField === 'paymentDate') {
      comparison = new Date(a.paymentDate) - new Date(b.paymentDate);
    } else {
      comparison = String(a[sortField]).localeCompare(String(b[sortField]));
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  $: paginatedPayments = sortedPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  $: totalPages = Math.ceil(sortedPayments.length / itemsPerPage);

  function handlePageChange(page) {
    currentPage = page;
  }

  function handleItemsPerPageChange(items) {
    itemsPerPage = items;
    currentPage = 1;
  }
</script>

<div class="mdc-data-table">
  <div class="flex justify-end mb-4 gap-4">
    <div class="flex items-center gap-2">
      <span class="mdc-typography--body2">Items per page:</span>
      <Select
        class="w-24"
        variant="outlined"
        bind:value={itemsPerPage}
      >
        <Option value={10}>10</Option>
        <Option value={25}>25</Option>
        <Option value={50}>50</Option>
        <Option value={100}>100</Option>
      </Select>
    </div>
  </div>

  <DataTable table$aria-label="Payment list" style="width: 100%;">
    <Head>
      <Row>
        <Cell>
          <Button
            class="mdc-data-table__header-cell-label"
            on:click={() => handleSort('paymentDate')}
          >
            Date {getSortIcon('paymentDate')}
          </Button>
        </Cell>
        <Cell>
          <Button
            class="mdc-data-table__header-cell-label"
            on:click={() => handleSort('amount')}
          >
            Amount {getSortIcon('amount')}
          </Button>
        </Cell>
        <Cell>
          <Button
            class="mdc-data-table__header-cell-label"
            on:click={() => handleSort('status')}
          >
            Status {getSortIcon('status')}
          </Button>
        </Cell>
        <Cell>
          <Button
            class="mdc-data-table__header-cell-label"
            on:click={() => handleSort('type')}
          >
            Type {getSortIcon('type')}
          </Button>
        </Cell>
        <Cell>Notes</Cell>
        <Cell>Actions</Cell>
      </Row>
    </Head>
    <Body>
      {#each paginatedPayments as payment (payment.id)}
        <Row>
          <Cell>{formatDate(payment.paymentDate)}</Cell>
          <Cell>{formatCurrency(payment.amount)}</Cell>
          <Cell>
            <span class="mdc-typography--caption px-2 py-1 rounded border" style="color: var(--mdc-theme-{getStatusBadgeColor(payment.status)}); border-color: var(--mdc-theme-{getStatusBadgeColor(payment.status)})">
              {payment.status || 'Completed'}
            </span>
          </Cell>
          <Cell>
            <span class="mdc-typography--caption px-2 py-1 rounded border" style="color: var(--mdc-theme-primary); border-color: var(--mdc-theme-primary)">
              {payment.type || 'Regular'}
            </span>
          </Cell>
          <Cell class="max-w-xs truncate">{payment.notes || '-'}</Cell>
          <Cell>
            <div class="relative">
              <Button
                variant="outlined"
                size="small"
                on:click={() => menu.setOpen(true)}
              >
                Actions
              </Button>
              <Menu bind:this={menu} anchorCorner="TOP_LEFT">
                <List>
                  <Item on:SMUI:action={() => dispatch('view', payment)}>View Details</Item>
                  <Item on:SMUI:action={() => dispatch('edit', payment)}>Edit</Item>
                  <Item on:SMUI:action={() => dispatch('delete', payment)} class="text-error">Delete</Item>
                </List>
              </Menu>
            </div>
          </Cell>
        </Row>
      {/each}
    </Body>
  </DataTable>

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="flex justify-center items-center gap-2 mt-4">
      <Button
        variant="outlined"
        size="small"
        disabled={currentPage === 1}
        on:click={() => handlePageChange(currentPage - 1)}
      >
        <span class="material-icons">chevron_left</span>
        Previous
      </Button>

      {#each Array(totalPages) as _, i}
        <Button
          variant={currentPage === i + 1 ? 'raised' : 'outlined'}
          size="small"
          on:click={() => handlePageChange(i + 1)}
        >
          {i + 1}
        </Button>
      {/each}

      <Button
        variant="outlined"
        size="small"
        disabled={currentPage === totalPages}
        on:click={() => handlePageChange(currentPage + 1)}
      >
        Next
        <span class="material-icons">chevron_right</span>
      </Button>
    </div>
  {/if}
</div>