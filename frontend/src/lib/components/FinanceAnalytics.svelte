<script>
  import { t } from '$lib/i18n';
  import { formatCurrency } from '$lib/utils';
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  export let expenses = [];
  export let sales = [];
  export let selectedMonth = '';

  let analytics = {
    revenueAnalysis: {
      totalRevenue: 0,
      averageTransactionValue: 0,
      revenueGrowthRate: 0,
      monthlyTrend: [],
      topProducts: []
    },
    expenseAnalysis: {
      totalExpenses: 0,
      averageExpense: 0,
      expenseGrowthRate: 0,
      categoryBreakdown: [],
      monthlyTrend: []
    },
    profitabilityAnalysis: {
      grossProfit: 0,
      netProfit: 0,
      profitMargin: 0,
      roi: 0,
      breakEvenPoint: 0
    },
    performanceMetrics: {
      salesGrowth: 0,
      expenseGrowth: 0,
      efficiency: 0,
      cashFlow: 0
    }
  };

  let filteredSales = [];
  let filteredExpenses = [];

  $: {
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      filteredSales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate.getFullYear() === year && saleDate.getMonth() === month - 1;
      });
      filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getFullYear() === year && expenseDate.getMonth() === month - 1;
      });
    } else {
      filteredSales = sales;
      filteredExpenses = expenses;
    }
    calculateAnalytics();
  }

  function calculateAnalytics() {
    // Revenue Analysis
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + ((sale.sellingPriceAtSale || 0) * (sale.quantity || 0)), 0);
    const averageTransactionValue = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
    
    // Expense Analysis
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const averageExpense = filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0;
    
    // Category breakdown
    const categoryBreakdown = calculateCategoryBreakdown();
    
    // Top products
    const topProducts = calculateTopProducts();
    
    // Monthly trends
    const monthlyTrend = calculateMonthlyTrend();
    
    // Profitability
    const grossProfit = filteredSales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const roi = totalExpenses > 0 ? (netProfit / totalExpenses) * 100 : 0;
    
    // Performance metrics
    const salesGrowth = calculateGrowthRate('sales');
    const expenseGrowth = calculateGrowthRate('expenses');
    const efficiency = totalExpenses > 0 ? (totalRevenue / totalExpenses) * 100 : 0;
    const cashFlow = netProfit;

    analytics = {
      revenueAnalysis: {
        totalRevenue,
        averageTransactionValue,
        revenueGrowthRate: salesGrowth,
        monthlyTrend,
        topProducts
      },
      expenseAnalysis: {
        totalExpenses,
        averageExpense,
        expenseGrowthRate: expenseGrowth,
        categoryBreakdown,
        monthlyTrend: calculateExpenseMonthlyTrend()
      },
      profitabilityAnalysis: {
        grossProfit,
        netProfit,
        profitMargin,
        roi,
        breakEvenPoint: calculateBreakEvenPoint()
      },
      performanceMetrics: {
        salesGrowth,
        expenseGrowth,
        efficiency,
        cashFlow
      }
    };
  }

  function calculateCategoryBreakdown() {
    const categories = {};
    filteredExpenses.forEach(expense => {
      const category = expense.category || 'Other';
      categories[category] = (categories[category] || 0) + (expense.amount || 0);
    });
    
    return Object.entries(categories)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  function calculateTopProducts() {
    const products = {};
    filteredSales.forEach(sale => {
      const productName = sale.productName || 'Unknown Product';
      if (!products[productName]) {
        products[productName] = {
          name: productName,
          revenue: 0,
          quantity: 0,
          profit: 0
        };
      }
      products[productName].revenue += (sale.sellingPriceAtSale || 0) * (sale.quantity || 0);
      products[productName].quantity += sale.quantity || 0;
      products[productName].profit += sale.profit || 0;
    });
    
    return Object.values(products)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  function calculateMonthlyTrend() {
    const monthlyData = {};
    filteredSales.forEach(sale => {
      const date = new Date(sale.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, count: 0 };
      }
      monthlyData[monthKey].revenue += (sale.sellingPriceAtSale || 0) * (sale.quantity || 0);
      monthlyData[monthKey].count += 1;
    });
    
    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  }

  function calculateExpenseMonthlyTrend() {
    const monthlyData = {};
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { amount: 0, count: 0 };
      }
      monthlyData[monthKey].amount += expense.amount || 0;
      monthlyData[monthKey].count += 1;
    });
    
    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  }

  function calculateGrowthRate(type) {
    // Simplified growth calculation - compare current month to previous month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const data = type === 'sales' ? filteredSales : filteredExpenses;
    const currentMonthData = data.filter(item => {
      const date = new Date(type === 'sales' ? item.createdAt : item.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const previousMonthData = data.filter(item => {
      const date = new Date(type === 'sales' ? item.createdAt : item.date);
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
    });
    
    const currentValue = type === 'sales' 
      ? currentMonthData.reduce((sum, sale) => sum + ((sale.sellingPriceAtSale || 0) * (sale.quantity || 0)), 0)
      : currentMonthData.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      
    const previousValue = type === 'sales'
      ? previousMonthData.reduce((sum, sale) => sum + ((sale.sellingPriceAtSale || 0) * (sale.quantity || 0)), 0)
      : previousMonthData.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
    return previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
  }

  function calculateBreakEvenPoint() {
    const totalFixedCosts = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const averageSellingPrice = filteredSales.length > 0 
      ? filteredSales.reduce((sum, sale) => sum + (sale.sellingPriceAtSale || 0), 0) / filteredSales.length 
      : 0;
    const averageCost = filteredSales.length > 0 
      ? filteredSales.reduce((sum, sale) => sum + (sale.purchasePriceAtSale || 0), 0) / filteredSales.length 
      : 0;
    
    const contributionMargin = averageSellingPrice - averageCost;
    return contributionMargin > 0 ? totalFixedCosts / contributionMargin : 0;
  }

  function getGrowthColor(value) {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  }

  function getGrowthIcon(value) {
    if (value > 0) return 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6';
    if (value < 0) return 'M17 13l-5 5m0 0l-5-5m5 5V6';
    return 'M5 12h14';
  }
</script>

<div class="analytics-container" transition:fade={{ duration: 300 }}>
  <!-- Revenue Analysis -->
  <div class="analytics-section" transition:fly={{ y: 20, duration: 400, delay: 0 }}>
    <div class="section-header">
      <h3>{$t('finance.analytics.revenue_analysis')}</h3>
      <div class="section-icon">📈</div>
    </div>
    
    <div class="metrics-grid">
      <div class="metric-card primary">
        <div class="metric-header">
          <span class="metric-label">{$t('finance.analytics.total_revenue')}</span>
          <div class="metric-trend {getGrowthColor(analytics.revenueAnalysis.revenueGrowthRate)}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="{getGrowthIcon(analytics.revenueAnalysis.revenueGrowthRate)}"/>
            </svg>
            {analytics.revenueAnalysis.revenueGrowthRate.toFixed(1)}%
          </div>
        </div>
        <div class="metric-value">{formatCurrency(analytics.revenueAnalysis.totalRevenue)}</div>
        <div class="metric-subtitle">
          {$t('finance.analytics.avg_transaction')}: {formatCurrency(analytics.revenueAnalysis.averageTransactionValue)}
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">{$t('finance.analytics.top_products')}</div>
        <div class="top-products-list">
          {#each analytics.revenueAnalysis.topProducts.slice(0, 3) as product}
            <div class="product-item">
              <span class="product-name">{product.name}</span>
              <span class="product-revenue">{formatCurrency(product.revenue)}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- Expense Analysis -->
  <div class="analytics-section" transition:fly={{ y: 20, duration: 400, delay: 100 }}>
    <div class="section-header">
      <h3>{$t('finance.analytics.expense_analysis')}</h3>
      <div class="section-icon">💸</div>
    </div>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">{$t('finance.analytics.total_expenses')}</span>
          <div class="metric-trend {getGrowthColor(analytics.expenseAnalysis.expenseGrowthRate)}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="{getGrowthIcon(analytics.expenseAnalysis.expenseGrowthRate)}"/>
            </svg>
            {analytics.expenseAnalysis.expenseGrowthRate.toFixed(1)}%
          </div>
        </div>
        <div class="metric-value">{formatCurrency(analytics.expenseAnalysis.totalExpenses)}</div>
        <div class="metric-subtitle">
          {$t('finance.analytics.avg_expense')}: {formatCurrency(analytics.expenseAnalysis.averageExpense)}
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">{$t('finance.analytics.expense_categories')}</div>
        <div class="category-breakdown">
          {#each analytics.expenseAnalysis.categoryBreakdown.slice(0, 4) as category}
            <div class="category-item">
              <span class="category-name">{category.category}</span>
              <span class="category-amount">{formatCurrency(category.amount)}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- Profitability Analysis -->
  <div class="analytics-section" transition:fly={{ y: 20, duration: 400, delay: 200 }}>
    <div class="section-header">
      <h3>{$t('finance.analytics.profitability_analysis')}</h3>
      <div class="section-icon">💰</div>
    </div>
    
    <div class="profitability-grid">
      <div class="profit-card">
        <div class="profit-label">{$t('finance.analytics.gross_profit')}</div>
        <div class="profit-value">{formatCurrency(analytics.profitabilityAnalysis.grossProfit)}</div>
      </div>
      
      <div class="profit-card">
        <div class="profit-label">{$t('finance.analytics.net_profit')}</div>
        <div class="profit-value {analytics.profitabilityAnalysis.netProfit >= 0 ? 'positive' : 'negative'}">
          {formatCurrency(analytics.profitabilityAnalysis.netProfit)}
        </div>
      </div>
      
      <div class="profit-card">
        <div class="profit-label">{$t('finance.analytics.profit_margin')}</div>
        <div class="profit-value">{analytics.profitabilityAnalysis.profitMargin.toFixed(1)}%</div>
      </div>
      
      <div class="profit-card">
        <div class="profit-label">{$t('finance.analytics.roi')}</div>
        <div class="profit-value">{analytics.profitabilityAnalysis.roi.toFixed(1)}%</div>
      </div>
    </div>
  </div>

  <!-- Performance Metrics -->
  <div class="analytics-section" transition:fly={{ y: 20, duration: 400, delay: 300 }}>
    <div class="section-header">
      <h3>{$t('finance.analytics.performance_metrics')}</h3>
      <div class="section-icon">⚡</div>
    </div>
    
    <div class="performance-grid">
      <div class="performance-card">
        <div class="performance-header">
          <span class="performance-label">{$t('finance.analytics.sales_growth')}</span>
          <div class="performance-score {getGrowthColor(analytics.performanceMetrics.salesGrowth)}">
            {analytics.performanceMetrics.salesGrowth.toFixed(1)}%
          </div>
        </div>
        <div class="performance-bar">
          <div class="performance-fill" style="width: {Math.abs(analytics.performanceMetrics.salesGrowth)}%; background: {analytics.performanceMetrics.salesGrowth >= 0 ? '#10b981' : '#ef4444'}"></div>
        </div>
      </div>

      <div class="performance-card">
        <div class="performance-header">
          <span class="performance-label">{$t('finance.analytics.efficiency_ratio')}</span>
          <div class="performance-score">{analytics.performanceMetrics.efficiency.toFixed(1)}%</div>
        </div>
        <div class="performance-bar">
          <div class="performance-fill" style="width: {Math.min(100, analytics.performanceMetrics.efficiency)}%; background: #3b82f6"></div>
        </div>
      </div>

      <div class="performance-card">
        <div class="performance-header">
          <span class="performance-label">{$t('finance.analytics.cash_flow')}</span>
          <div class="performance-score {analytics.performanceMetrics.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}">
            {formatCurrency(analytics.performanceMetrics.cashFlow)}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .analytics-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .analytics-section {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 1.5rem;
    padding: 2rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-header h3 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .section-icon {
    font-size: 1.5rem;
    opacity: 0.7;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .metric-card {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
  }

  .metric-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }

  .metric-card.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .metric-label {
    font-size: 0.875rem;
    font-weight: 500;
    opacity: 0.8;
  }

  .metric-trend {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.2);
  }

  .metric-value {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .metric-subtitle {
    font-size: 0.875rem;
    opacity: 0.7;
  }

  .top-products-list, .category-breakdown {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .product-item, .category-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 0.5rem;
  }

  .product-name, .category-name {
    font-weight: 500;
    font-size: 0.875rem;
  }

  .product-revenue, .category-amount {
    font-weight: 600;
    font-size: 0.875rem;
    color: #10b981;
  }

  .profitability-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .profit-card {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 0.75rem;
    padding: 1rem;
    text-align: center;
  }

  .profit-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }

  .profit-value {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .profit-value.positive {
    color: #10b981;
  }

  .profit-value.negative {
    color: #ef4444;
  }

  .performance-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .performance-card {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 0.75rem;
    padding: 1rem;
  }

  .performance-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .performance-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
  }

  .performance-score {
    font-size: 1.25rem;
    font-weight: 700;
  }

  .performance-bar {
    width: 100%;
    height: 6px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .performance-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  @media (max-width: 768px) {
    .metrics-grid {
      grid-template-columns: 1fr;
    }

    .profitability-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .performance-grid {
      grid-template-columns: 1fr;
    }
  }
</style>