<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  // Arabic months
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  
  // Get current date
  const currentDate = new Date();
  
  // Calculate next month by default
  const nextMonth = new Date(currentDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  
  // Initialize with next month's values
  export let selectedMonth = nextMonth.getMonth(); // 0-11
  export let selectedYear = nextMonth.getFullYear();
  export let selectedDay = 20; // Default day
  
  // Reactive value for display
  $: formattedDate = `${selectedDay} ${arabicMonths[selectedMonth]} ${selectedYear}`;
  $: fullDateString = `${arabicMonths[selectedMonth]} ${selectedYear}`;
  
  // Generate years (current year + 2 years)
  $: years = [selectedYear - 1, selectedYear, selectedYear + 1, selectedYear + 2];
  
  // Days in month
  $: daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  $: days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Ensure day is valid for the selected month
  $: if (selectedDay > daysInMonth) {
    selectedDay = daysInMonth;
  }
  
  // Dispatch changes
  $: {
    dispatch('change', {
      month: selectedMonth,
      year: selectedYear,
      day: selectedDay,
      formatted: formattedDate,
      fullDate: fullDateString
    });
  }
</script>

<div class="deduction-date-picker" dir="rtl">
  <div class="date-picker-container">
    <div class="date-preview">
      <div class="preview-label">تاريخ بداية سريان أول اقتطاع من الأجر</div>
      <div class="preview-value">{formattedDate}</div>
    </div>
    
    <div class="date-controls">
      <div class="control-group">
        <label for="month-select">الشهر</label>
        <select 
          id="month-select" 
          bind:value={selectedMonth}
          class="month-select"
        >
          {#each arabicMonths as month, index}
            <option value={index}>{month}</option>
          {/each}
        </select>
      </div>
      
      <div class="control-group">
        <label for="day-select">اليوم</label>
        <input 
          id="day-select"
          type="number" 
          bind:value={selectedDay}
          min="1"
          max={daysInMonth}
          class="day-input"
        />
      </div>
      
      <div class="control-group">
        <label for="year-select">السنة</label>
        <select 
          id="year-select"
          bind:value={selectedYear}
          class="year-select"
        >
          {#each years as year}
            <option value={year}>{year}</option>
          {/each}
        </select>
      </div>
    </div>
    
    <div class="quick-actions">
      <button 
        type="button"
        on:click={() => {
          const next = new Date(currentDate);
          next.setMonth(next.getMonth() + 1);
          selectedMonth = next.getMonth();
          selectedYear = next.getFullYear();
          selectedDay = 20;
        }}
        class="quick-btn"
      >
        الشهر القادم (افتراضي)
      </button>
      
      <button 
        type="button"
        on:click={() => {
          const after2 = new Date(currentDate);
          after2.setMonth(after2.getMonth() + 2);
          selectedMonth = after2.getMonth();
          selectedYear = after2.getFullYear();
        }}
        class="quick-btn"
      >
        بعد شهرين
      </button>
    </div>
  </div>
</div>

<style>
  .deduction-date-picker {
    width: 100%;
    direction: rtl;
    text-align: right;
  }
  
  .date-picker-container {
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    border-radius: 12px;
    padding: 1.5rem;
    border: 2px solid #e2e8f0;
  }
  
  .date-preview {
    background: white;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .preview-label {
    font-size: 0.875rem;
    color: #64748b;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  .preview-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
    font-family: 'Arial', sans-serif;
  }
  
  .date-controls {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .control-group {
    display: flex;
    flex-direction: column;
  }
  
  .control-group label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
    margin-bottom: 0.5rem;
  }
  
  .month-select,
  .year-select,
  .day-input {
    padding: 0.75rem;
    border: 2px solid #cbd5e1;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    background: white;
    transition: all 0.2s;
    text-align: right;
  }
  
  .month-select:focus,
  .year-select:focus,
  .day-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .day-input {
    text-align: center;
    font-size: 1.125rem;
  }
  
  .quick-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  
  .quick-btn {
    flex: 1;
    min-width: 150px;
    padding: 0.75rem 1rem;
    background: white;
    border: 2px solid #cbd5e1;
    border-radius: 8px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
  }
  
  .quick-btn:hover {
    background: #f1f5f9;
    border-color: #3b82f6;
    color: #3b82f6;
  }
  
  .quick-btn:active {
    transform: scale(0.98);
  }
  
  /* Mobile responsive */
  @media (max-width: 640px) {
    .date-controls {
      grid-template-columns: 1fr;
    }
    
    .quick-btn {
      min-width: 100%;
    }
  }
</style>
