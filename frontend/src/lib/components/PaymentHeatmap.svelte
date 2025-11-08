<script>
  import { onMount, afterUpdate } from 'svelte';
  import { formatCurrency } from '$lib/utils/formatters';
  
  export let payments = [];
  export let title = 'Payment Activity Heatmap';
  
  let heatmapData = [];
  let months = [];
  let maxAmount = 0;
  let selectedCell = null;
  
  // Process payments into heatmap data
  $: {
    if (payments && payments.length > 0) {
      processHeatmapData();
    }
  }
  
  function processHeatmapData() {
    // Filter out invalid payments and get date range
    const validPayments = payments.filter(p => {
      const dateStr = p.paymentDate || p.date;
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    });
    
    if (validPayments.length === 0) {
      // Initialize empty data
      const today = new Date();
      const startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 11);
      startDate.setDate(1);
      
      months = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.push({
          key: monthKey,
          label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          weeks: [],
          data: { total: 0, payments: [] }
        });
      }
      heatmapData = months;
      return;
    }
    
    // Generate 12-month rolling window
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1);
    
    months = [];
    const monthData = {};
    
    // Initialize months
    for (let i = 0; i < 12; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        key: monthKey,
        label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        weeks: []
      });
      monthData[monthKey] = { total: 0, payments: [] };
    }
    
    // Aggregate payments by month
    validPayments.forEach(payment => {
      const dateStr = payment.paymentDate || payment.date;
      const date = new Date(dateStr);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthData[monthKey]) {
        monthData[monthKey].total += payment.amount || 0;
        monthData[monthKey].payments.push(payment);
      }
    });
    
    // Calculate max amount for color scaling
    maxAmount = Math.max(...Object.values(monthData).map(m => m.total), 1);
    
    // Build heatmap grid (12 months)
    heatmapData = months.map(month => ({
      ...month,
      data: monthData[month.key]
    }));
  }
  
  function getColorIntensity(amount) {
    if (!amount || amount === 0) return 0;
    return Math.min((amount / maxAmount) * 100, 100);
  }
  
  function getCellColor(intensity) {
    if (intensity === 0) return '#f3f4f6';
    if (intensity < 20) return '#d1fae5';
    if (intensity < 40) return '#a7f3d0';
    if (intensity < 60) return '#6ee7b7';
    if (intensity < 80) return '#34d399';
    return '#10b981';
  }
  
  function handleCellClick(month) {
    if (month.data && month.data.payments.length > 0) {
      selectedCell = month;
    }
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
</script>

<div class="heatmap-container">
  <div class="heatmap-header">
    <h3 class="text-lg font-semibold text-gray-900">{title}</h3>
    <div class="legend">
      <span class="legend-label">Less</span>
      <div class="legend-colors">
        {#each [0, 20, 40, 60, 80, 100] as intensity}
          <div
            class="legend-color"
            style="background-color: {getCellColor(intensity)}"
            title="{intensity}%"
          />
        {/each}
      </div>
      <span class="legend-label">More</span>
    </div>
  </div>
  
  <div class="heatmap-grid">
    {#each heatmapData as month}
      {@const intensity = getColorIntensity(month.data?.total || 0)}
      {@const color = getCellColor(intensity)}
      <div
        class="heatmap-cell"
        class:has-data={month.data && month.data.total > 0}
        style="background-color: {color}"
        on:click={() => handleCellClick(month)}
        on:keydown={(e) => e.key === 'Enter' && handleCellClick(month)}
        role="button"
        tabindex="0"
        title="{month.label}: {formatCurrency(month.data?.total || 0)} ({month.data?.payments.length || 0} payments)"
      >
        <div class="cell-content">
          <div class="cell-month">{month.label.split(' ')[0]}</div>
          <div class="cell-amount">{month.data?.payments.length || 0}</div>
        </div>
      </div>
    {/each}
  </div>
  
  {#if selectedCell}
    <div class="selected-details">
      <div class="details-header">
        <h4 class="text-md font-semibold text-gray-900">{selectedCell.label}</h4>
        <button
          on:click={() => selectedCell = null}
          class="close-btn"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="details-summary">
        <div class="summary-item">
          <span class="summary-label">Total Amount:</span>
          <span class="summary-value text-green-600">{formatCurrency(selectedCell.data.total)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Payments:</span>
          <span class="summary-value">{selectedCell.data.payments.length}</span>
        </div>
      </div>
      <div class="details-list">
        {#each selectedCell.data.payments as payment}
          <div class="payment-item">
            <div class="payment-date">{formatDate(payment.paymentDate || payment.date)}</div>
            <div class="payment-cession">
              {payment.monthlyPayment ? formatCurrency(payment.monthlyPayment) + '/month' : (payment.cessionName || 'Unknown')}
            </div>
            <div class="payment-amount">{formatCurrency(payment.amount)}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .heatmap-container {
    background: white;
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .heatmap-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .legend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .legend-label {
    font-size: 0.75rem;
    color: #6b7280;
  }
  
  .legend-colors {
    display: flex;
    gap: 0.25rem;
  }
  
  .legend-color {
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
  
  .heatmap-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  
  .heatmap-cell {
    aspect-ratio: 1;
    border-radius: 0.5rem;
    border: 2px solid rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
  }
  
  .heatmap-cell:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10;
  }
  
  .heatmap-cell.has-data {
    border-color: rgba(16, 185, 129, 0.3);
  }
  
  .cell-content {
    text-align: center;
  }
  
  .cell-month {
    font-size: 0.75rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.25rem;
  }
  
  .cell-amount {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1f2937;
  }
  
  .selected-details {
    background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%);
    border-radius: 0.75rem;
    padding: 1.25rem;
    border: 2px solid #10b981;
    animation: slideIn 0.3s ease-out;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .details-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .close-btn {
    padding: 0.25rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .close-btn:hover {
    background: #f3f4f6;
    color: #1f2937;
  }
  
  .details-summary {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(16, 185, 129, 0.2);
  }
  
  .summary-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .summary-label {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
  }
  
  .summary-value {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1f2937;
  }
  
  .details-list {
    max-height: 300px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .payment-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.75rem;
    align-items: center;
    background: white;
    padding: 0.75rem;
    border-radius: 0.5rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    transition: all 0.2s;
  }
  
  .payment-item:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transform: translateX(4px);
  }
  
  .payment-date {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
    white-space: nowrap;
  }
  
  .payment-cession {
    font-size: 0.875rem;
    color: #374151;
    truncate: true;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .payment-amount {
    font-size: 0.875rem;
    font-weight: 700;
    color: #10b981;
    white-space: nowrap;
  }
  
  @media (max-width: 768px) {
    .heatmap-grid {
      grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
      gap: 0.5rem;
    }
    
    .cell-month {
      font-size: 0.625rem;
    }
    
    .cell-amount {
      font-size: 1rem;
    }
    
    .details-summary {
      grid-template-columns: 1fr;
    }
    
    .payment-item {
      grid-template-columns: 1fr;
      gap: 0.25rem;
    }
  }
</style>
