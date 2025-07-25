<script>
  import { t } from '$lib/i18n';
  import { formatCurrency } from '$lib/utils';
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  export let expenses = [];
  export let sales = [];
  export let selectedMonth = '';

  let reportType = 'summary';
  let dateRange = 'current';
  let exportFormat = 'pdf';
  let includeCharts = true;
  let includeDetails = true;

  let reports = {
    summary: {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      transactionCount: 0,
      averageTransaction: 0,
      profitMargin: 0
    },
    detailed: {
      salesReport: [],
      expenseReport: [],
      categoryAnalysis: [],
      monthlyComparison: []
    },
    financial: {
      incomeStatement: {},
      cashFlow: {},
      balanceSheet: {}
    }
  };

  $: if (expenses.length > 0 || sales.length > 0) {
    generateReports();
  }

  function generateReports() {
    generateSummaryReport();
    generateDetailedReport();
    generateFinancialReport();
  }

  function generateSummaryReport() {
    const totalRevenue = sales.reduce((sum, sale) => sum + ((sale.sellingPriceAtSale || 0) * (sale.quantity || 0)), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const transactionCount = sales.length + expenses.length;
    const averageTransaction = transactionCount > 0 ? totalRevenue / sales.length : 0;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    reports.summary = {
      totalRevenue,
      totalExpenses,
      netProfit,
      transactionCount,
      averageTransaction,
      profitMargin
    };
  }

  function generateDetailedReport() {
    // Sales Report
    const salesReport = sales.map(sale => ({
      date: new Date(sale.createdAt).toLocaleDateString(),
      product: sale.productName || 'Unknown Product',
      quantity: sale.quantity || 0,
      unitPrice: sale.sellingPriceAtSale || 0,
      totalAmount: (sale.sellingPriceAtSale || 0) * (sale.quantity || 0),
      profit: sale.profit || 0,
      profitMargin: sale.sellingPriceAtSale > 0 ? ((sale.profit || 0) / sale.sellingPriceAtSale) * 100 : 0
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Expense Report
    const expenseReport = expenses.map(expense => ({
      date: new Date(expense.date).toLocaleDateString(),
      category: expense.category || 'Other',
      description: expense.description || 'No description',
      amount: expense.amount || 0,
      type: expense.type || 'General'
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Category Analysis
    const categoryTotals = {};
    expenses.forEach(expense => {
      const category = expense.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + (expense.amount || 0);
    });

    const categoryAnalysis = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: reports.summary.totalExpenses > 0 ? (amount / reports.summary.totalExpenses) * 100 : 0,
        count: expenses.filter(exp => (exp.category || 'Other') === category).length
      }))
      .sort((a, b) => b.amount - a.amount);

    // Monthly Comparison
    const monthlyComparison = generateMonthlyComparison();

    reports.detailed = {
      salesReport,
      expenseReport,
      categoryAnalysis,
      monthlyComparison
    };
  }

  function generateFinancialReport() {
    const totalRevenue = reports.summary.totalRevenue;
    const totalExpenses = reports.summary.totalExpenses;
    const grossProfit = sales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
    const netProfit = reports.summary.netProfit;

    // Income Statement
    const incomeStatement = {
      revenue: {
        salesRevenue: totalRevenue,
        otherIncome: 0,
        totalRevenue: totalRevenue
      },
      expenses: {
        costOfGoodsSold: totalRevenue - grossProfit,
        operatingExpenses: totalExpenses,
        totalExpenses: totalExpenses
      },
      profit: {
        grossProfit: grossProfit,
        operatingProfit: grossProfit - totalExpenses,
        netProfit: netProfit
      }
    };

    // Cash Flow
    const cashFlow = {
      operatingActivities: {
        netIncome: netProfit,
        adjustments: 0,
        netCashFromOperations: netProfit
      },
      investingActivities: {
        capitalExpenditures: expenses.filter(exp => exp.category === 'Equipment' || exp.category === 'Assets').reduce((sum, exp) => sum + (exp.amount || 0), 0),
        netCashFromInvesting: -expenses.filter(exp => exp.category === 'Equipment' || exp.category === 'Assets').reduce((sum, exp) => sum + (exp.amount || 0), 0)
      },
      financingActivities: {
        netCashFromFinancing: 0
      }
    };

    reports.financial = {
      incomeStatement,
      cashFlow,
      balanceSheet: {} // Placeholder for balance sheet
    };
  }

  function generateMonthlyComparison() {
    const monthlyData = {};
    
    // Process sales
    sales.forEach(sale => {
      const date = new Date(sale.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, expenses: 0, profit: 0, transactions: 0 };
      }
      monthlyData[monthKey].revenue += (sale.sellingPriceAtSale || 0) * (sale.quantity || 0);
      monthlyData[monthKey].profit += sale.profit || 0;
      monthlyData[monthKey].transactions += 1;
    });

    // Process expenses
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, expenses: 0, profit: 0, transactions: 0 };
      }
      monthlyData[monthKey].expenses += expense.amount || 0;
      monthlyData[monthKey].transactions += 1;
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        ...data,
        netProfit: data.revenue - data.expenses,
        profitMargin: data.revenue > 0 ? ((data.revenue - data.expenses) / data.revenue) * 100 : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  }

  function exportReport() {
    // Placeholder for export functionality
    console.log('Exporting report:', { reportType, dateRange, exportFormat, includeCharts, includeDetails });
    // In a real implementation, this would generate and download the report
  }

  function printReport() {
    window.print();
  }

  function getMonthName(monthKey) {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
</script>

<div class="reports-container" transition:fade={{ duration: 300 }}>
  <!-- Report Controls -->
  <div class="report-controls" transition:fly={{ y: -20, duration: 400 }}>
    <div class="controls-section">
      <h3>{$$t('finance.reports.report_type')}</h3>
      <div class="control-group">
        <button 
          class="control-btn {reportType === 'summary' ? 'active' : ''}"
          on:click={() => reportType = 'summary'}
        >
          {$$t('finance.reports.summary_report')}
        </button>
        <button 
          class="control-btn {reportType === 'detailed' ? 'active' : ''}"
          on:click={() => reportType = 'detailed'}
        >
          {$$t('finance.reports.detailed_report')}
        </button>
        <button 
          class="control-btn {reportType === 'financial' ? 'active' : ''}"
          on:click={() => reportType = 'financial'}
        >
          {$$t('finance.reports.financial_statements')}
        </button>
      </div>
    </div>

    <div class="controls-section">
      <h3>{$$t('finance.reports.export_options')}</h3>
      <div class="export-controls">
        <select bind:value={exportFormat} class="export-select">
          <option value="pdf">PDF</option>
          <option value="excel">Excel</option>
          <option value="csv">CSV</option>
        </select>
        <button class="export-btn" on:click={exportReport}>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          {$$t('finance.reports.export')}
        </button>
        <button class="print-btn" on:click={printReport}>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
          </svg>
          {$$t('finance.reports.print')}
        </button>
      </div>
    </div>
  </div>

  <!-- Report Content -->
  <div class="report-content">
    {#if reportType === 'summary'}
      <!-- Summary Report -->
      <div class="summary-report" transition:fly={{ x: -20, duration: 400 }}>
        <div class="report-header">
          <h2>{$$t('finance.reports.summary_report')}</h2>
          <p class="report-period">{$$t('finance.reports.period')}: {getMonthName(selectedMonth)}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-card revenue">
            <div class="summary-icon">💰</div>
            <div class="summary-content">
              <h3>{$$t('finance.reports.total_revenue')}</h3>
              <div class="summary-value">{formatCurrency(reports.summary.totalRevenue)}</div>
            </div>
          </div>

          <div class="summary-card expenses">
            <div class="summary-icon">💸</div>
            <div class="summary-content">
              <h3>{$$t('finance.reports.total_expenses')}</h3>
              <div class="summary-value">{formatCurrency(reports.summary.totalExpenses)}</div>
            </div>
          </div>

          <div class="summary-card profit">
            <div class="summary-icon">📈</div>
            <div class="summary-content">
              <h3>{$$t('finance.reports.net_profit')}</h3>
              <div class="summary-value {reports.summary.netProfit >= 0 ? 'positive' : 'negative'}">
                {formatCurrency(reports.summary.netProfit)}
              </div>
            </div>
          </div>

          <div class="summary-card margin">
            <div class="summary-icon">📊</div>
            <div class="summary-content">
              <h3>{$$t('finance.reports.profit_margin')}</h3>
              <div class="summary-value">{reports.summary.profitMargin.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        <div class="summary-details">
          <div class="detail-item">
            <span class="detail-label">{$$t('finance.reports.total_transactions')}</span>
            <span class="detail-value">{reports.summary.transactionCount}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{$$t('finance.reports.avg_transaction')}</span>
            <span class="detail-value">{formatCurrency(reports.summary.averageTransaction)}</span>
          </div>
        </div>
      </div>

    {:else if reportType === 'detailed'}
      <!-- Detailed Report -->
      <div class="detailed-report" transition:fly={{ x: -20, duration: 400 }}>
        <div class="report-header">
          <h2>{$$t('finance.reports.detailed_report')}</h2>
          <p class="report-period">{$$t('finance.reports.period')}: {getMonthName(selectedMonth)}</p>
        </div>

        <!-- Sales Report -->
        <div class="report-section">
          <h3>{$$t('finance.reports.sales_report')}</h3>
          <div class="table-container">
            <table class="report-table">
              <thead>
                <tr>
                  <th>{$$t('finance.reports.date')}</th>
                  <th>{$$t('finance.reports.product')}</th>
                  <th>{$$t('finance.reports.quantity')}</th>
                  <th>{$$t('finance.reports.unit_price')}</th>
                  <th>{$$t('finance.reports.total_amount')}</th>
                  <th>{$$t('finance.reports.profit')}</th>
                </tr>
              </thead>
              <tbody>
                {#each reports.detailed.salesReport.slice(0, 10) as sale}
                  <tr>
                    <td>{sale.date}</td>
                    <td>{sale.product}</td>
                    <td>{sale.quantity}</td>
                    <td>{formatCurrency(sale.unitPrice)}</td>
                    <td>{formatCurrency(sale.totalAmount)}</td>
                    <td class="{sale.profit >= 0 ? 'positive' : 'negative'}">{formatCurrency(sale.profit)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Expense Report -->
        <div class="report-section">
          <h3>{$$t('finance.reports.expense_report')}</h3>
          <div class="table-container">
            <table class="report-table">
              <thead>
                <tr>
                  <th>{$$t('finance.reports.date')}</th>
                  <th>{$$t('finance.reports.category')}</th>
                  <th>{$$t('finance.reports.description')}</th>
                  <th>{$$t('finance.reports.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {#each reports.detailed.expenseReport.slice(0, 10) as expense}
                  <tr>
                    <td>{expense.date}</td>
                    <td>{expense.category}</td>
                    <td>{expense.description}</td>
                    <td>{formatCurrency(expense.amount)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Category Analysis -->
        <div class="report-section">
          <h3>{$$t('finance.reports.category_analysis')}</h3>
          <div class="category-analysis">
            {#each reports.detailed.categoryAnalysis as category}
              <div class="category-item">
                <div class="category-info">
                  <span class="category-name">{category.category}</span>
                  <span class="category-count">{category.count} {$$t('finance.reports.transactions')}</span>
                </div>
                <div class="category-metrics">
                  <span class="category-amount">{formatCurrency(category.amount)}</span>
                  <span class="category-percentage">{category.percentage.toFixed(1)}%</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

    {:else if reportType === 'financial'}
      <!-- Financial Statements -->
      <div class="financial-report" transition:fly={{ x: -20, duration: 400 }}>
        <div class="report-header">
          <h2>{$$t('finance.reports.financial_statements')}</h2>
          <p class="report-period">{$$t('finance.reports.period')}: {getMonthName(selectedMonth)}</p>
        </div>

        <!-- Income Statement -->
        <div class="financial-statement">
          <h3>{$$t('finance.reports.income_statement')}</h3>
          <div class="statement-section">
            <h4>{$$t('finance.reports.revenue')}</h4>
            <div class="statement-line">
              <span>{$$t('finance.reports.sales_revenue')}</span>
              <span>{formatCurrency(reports.financial.incomeStatement.revenue?.salesRevenue || 0)}</span>
            </div>
            <div class="statement-line total">
              <span>{$$t('finance.reports.total_revenue')}</span>
              <span>{formatCurrency(reports.financial.incomeStatement.revenue?.totalRevenue || 0)}</span>
            </div>
          </div>

          <div class="statement-section">
            <h4>{$$t('finance.reports.expenses')}</h4>
            <div class="statement-line">
              <span>{$$t('finance.reports.cost_of_goods')}</span>
              <span>{formatCurrency(reports.financial.incomeStatement.expenses?.costOfGoodsSold || 0)}</span>
            </div>
            <div class="statement-line">
              <span>{$$t('finance.reports.operating_expenses')}</span>
              <span>{formatCurrency(reports.financial.incomeStatement.expenses?.operatingExpenses || 0)}</span>
            </div>
            <div class="statement-line total">
              <span>{$$t('finance.reports.total_expenses')}</span>
              <span>{formatCurrency(reports.financial.incomeStatement.expenses?.totalExpenses || 0)}</span>
            </div>
          </div>

          <div class="statement-section">
            <h4>{$$t('finance.reports.profit')}</h4>
            <div class="statement-line">
              <span>{$$t('finance.reports.gross_profit')}</span>
              <span>{formatCurrency(reports.financial.incomeStatement.profit?.grossProfit || 0)}</span>
            </div>
            <div class="statement-line">
              <span>{$$t('finance.reports.operating_profit')}</span>
              <span>{formatCurrency(reports.financial.incomeStatement.profit?.operatingProfit || 0)}</span>
            </div>
            <div class="statement-line total">
              <span>{$$t('finance.reports.net_profit')}</span>
              <span class="{(reports.financial.incomeStatement.profit?.netProfit || 0) >= 0 ? 'positive' : 'negative'}">
                {formatCurrency(reports.financial.incomeStatement.profit?.netProfit || 0)}
              </span>
            </div>
          </div>
        </div>

        <!-- Monthly Comparison -->
        <div class="monthly-comparison">
          <h3>{$$t('finance.reports.monthly_comparison')}</h3>
          <div class="comparison-table">
            <table class="report-table">
              <thead>
                <tr>
                  <th>{$$t('finance.reports.month')}</th>
                  <th>{$$t('finance.reports.revenue')}</th>
                  <th>{$$t('finance.reports.expenses')}</th>
                  <th>{$$t('finance.reports.net_profit')}</th>
                  <th>{$$t('finance.reports.profit_margin')}</th>
                </tr>
              </thead>
              <tbody>
                {#each reports.detailed.monthlyComparison as month}
                  <tr>
                    <td>{getMonthName(month.month)}</td>
                    <td>{formatCurrency(month.revenue)}</td>
                    <td>{formatCurrency(month.expenses)}</td>
                    <td class="{month.netProfit >= 0 ? 'positive' : 'negative'}">{formatCurrency(month.netProfit)}</td>
                    <td>{month.profitMargin.toFixed(1)}%</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .reports-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .report-controls {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 1.5rem;
    padding: 2rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .controls-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #374151;
  }

  .control-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .control-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .control-btn:hover {
    background: #f3f4f6;
  }

  .control-btn.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .export-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .export-select {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    background: white;
  }

  .export-btn, .print-btn {
    display: flex;
    align-items: center;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .export-btn {
    background: #10b981;
    color: white;
  }

  .export-btn:hover {
    background: #059669;
  }

  .print-btn {
    background: #6b7280;
    color: white;
  }

  .print-btn:hover {
    background: #4b5563;
  }

  .report-content {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 1.5rem;
    padding: 2rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  .report-header {
    margin-bottom: 2rem;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 1rem;
  }

  .report-header h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
  }

  .report-period {
    margin: 0;
    color: #6b7280;
    font-size: 0.875rem;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .summary-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    border-radius: 1rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  }

  .summary-card.revenue {
    background: linear-gradient(135deg, #10b981, #34d399);
    color: white;
  }

  .summary-card.expenses {
    background: linear-gradient(135deg, #ef4444, #f87171);
    color: white;
  }

  .summary-card.profit {
    background: linear-gradient(135deg, #3b82f6, #60a5fa);
    color: white;
  }

  .summary-card.margin {
    background: linear-gradient(135deg, #8b5cf6, #a78bfa);
    color: white;
  }

  .summary-icon {
    font-size: 2rem;
  }

  .summary-content h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    opacity: 0.9;
  }

  .summary-value {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .summary-value.positive {
    color: #10b981;
  }

  .summary-value.negative {
    color: #ef4444;
  }

  .summary-details {
    display: flex;
    gap: 2rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail-label {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .detail-value {
    font-weight: 600;
    color: #111827;
  }

  .report-section {
    margin-bottom: 2rem;
  }

  .report-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .table-container {
    overflow-x: auto;
  }

  .report-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .report-table th {
    background: #f9fafb;
    padding: 0.75rem;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
  }

  .report-table td {
    padding: 0.75rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .report-table td.positive {
    color: #10b981;
    font-weight: 600;
  }

  .report-table td.negative {
    color: #ef4444;
    font-weight: 600;
  }

  .category-analysis {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .category-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .category-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .category-name {
    font-weight: 600;
    color: #111827;
  }

  .category-count {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .category-metrics {
    display: flex;
    flex-direction: column;
    align-items: end;
    gap: 0.25rem;
  }

  .category-amount {
    font-weight: 600;
    color: #111827;
  }

  .category-percentage {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .financial-statement {
    margin-bottom: 2rem;
  }

  .financial-statement h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .statement-section {
    margin-bottom: 1.5rem;
  }

  .statement-section h4 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
  }

  .statement-line {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .statement-line.total {
    font-weight: 600;
    border-bottom: 2px solid #e5e7eb;
    border-top: 1px solid #e5e7eb;
    margin-top: 0.5rem;
  }

  .statement-line .positive {
    color: #10b981;
  }

  .statement-line .negative {
    color: #ef4444;
  }

  @media (max-width: 768px) {
    .report-controls {
      flex-direction: column;
    }

    .summary-grid {
      grid-template-columns: 1fr;
    }

    .summary-details {
      flex-direction: column;
      gap: 1rem;
    }

    .export-controls {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>