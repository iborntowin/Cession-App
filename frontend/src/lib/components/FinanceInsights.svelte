<script>
  import { t } from '$lib/i18n';
  import { formatCurrency } from '$lib/utils';
  import { fade, fly } from 'svelte/transition';

  export let expenses = [];
  export let sales = [];
  export let selectedMonth = '';

  let insights = {
    businessInsights: [],
    recommendations: [],
    alerts: [],
    predictions: [],
    trends: [],
    opportunities: []
  };

  $: if (expenses.length > 0 || sales.length > 0) {
    generateInsights();
  }

  function generateInsights() {
    generateBusinessInsights();
    generateRecommendations();
    generateAlerts();
    generatePredictions();
    generateTrends();
    generateOpportunities();
  }

  function generateBusinessInsights() {
    const totalRevenue = sales.reduce((sum, sale) => sum + ((sale.sellingPriceAtSale || 0) * (sale.quantity || 0)), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const businessInsights = [];

    if (profitMargin > 20) {
      businessInsights.push({
        type: 'success',
        title: 'High Profitability',
        description: `Your profit margin of ${profitMargin.toFixed(1)}% is excellent`,
        icon: '💰',
        priority: 'high'
      });
    } else if (profitMargin < 5) {
      businessInsights.push({
        type: 'warning',
        title: 'Low Profitability',
        description: `Your profit margin of ${profitMargin.toFixed(1)}% needs improvement`,
        icon: '⚠️',
        priority: 'high'
      });
    }

    const revenueGrowth = calculateRevenueGrowth();
    if (revenueGrowth > 10) {
      businessInsights.push({
        type: 'success',
        title: 'Strong Growth',
        description: `Revenue growing at ${revenueGrowth.toFixed(1)}% month-over-month`,
        icon: '📈',
        priority: 'medium'
      });
    } else if (revenueGrowth < -5) {
      businessInsights.push({
        type: 'danger',
        title: 'Declining Revenue',
        description: `Revenue declined by ${Math.abs(revenueGrowth).toFixed(1)}% this month`,
        icon: '📉',
        priority: 'high'
      });
    }

    insights.businessInsights = businessInsights;
  }

  function generateRecommendations() {
    const recommendations = [];
    const totalRevenue = sales.reduce((sum, sale) => sum + ((sale.sellingPriceAtSale || 0) * (sale.quantity || 0)), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    const highestExpenseCategory = getHighestExpenseCategory();
    if (highestExpenseCategory && highestExpenseCategory.amount > totalExpenses * 0.3) {
      recommendations.push({
        category: 'cost_optimization',
        title: 'Optimize Expenses',
        description: `Focus on reducing ${highestExpenseCategory.category} expenses`,
        impact: 'high',
        effort: 'medium',
        savings: highestExpenseCategory.amount * 0.15,
        icon: '💡'
      });
    }

    insights.recommendations = recommendations;
  }

  function generateAlerts() {
    const alerts = [];
    const totalRevenue = sales.reduce((sum, sale) => sum + ((sale.sellingPriceAtSale || 0) * (sale.quantity || 0)), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    if (netProfit < 0) {
      alerts.push({
        type: 'critical',
        title: 'Negative Profit',
        description: `You have a loss of ${formatCurrency(Math.abs(netProfit))} this month`,
        action: 'Review expenses immediately',
        icon: '🚨',
        urgency: 'immediate'
      });
    }

    insights.alerts = alerts;
  }

  function generatePredictions() {
    const predictions = [];
    const monthlyRevenues = getMonthlyRevenues();
    
    if (monthlyRevenues.length >= 3) {
      const nextMonthRevenue = predictNextMonthRevenue(monthlyRevenues);
      predictions.push({
        type: 'revenue',
        title: 'Next Month Revenue',
        value: formatCurrency(nextMonthRevenue),
        confidence: 75,
        trend: nextMonthRevenue > monthlyRevenues[monthlyRevenues.length - 1] ? 'up' : 'down',
        icon: '🔮'
      });
    }

    insights.predictions = predictions;
  }

  function generateTrends() {
    const trends = [];
    const revenueGrowth = calculateRevenueGrowth();
    
    trends.push({
      metric: 'Revenue',
      value: revenueGrowth.toFixed(1) + '%',
      direction: revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'stable',
      description: revenueGrowth > 0 ? 'Revenue is growing' : revenueGrowth < 0 ? 'Revenue is declining' : 'Revenue is stable',
      icon: revenueGrowth > 0 ? '📈' : revenueGrowth < 0 ? '📉' : '➡️'
    });

    insights.trends = trends;
  }

  function generateOpportunities() {
    const opportunities = [];
    const totalRevenue = sales.reduce((sum, sale) => sum + ((sale.sellingPriceAtSale || 0) * (sale.quantity || 0)), 0);

    const topProducts = getTopProducts();
    if (topProducts.length > 0) {
      opportunities.push({
        category: 'product',
        title: 'Expand Top Products',
        description: `Focus on promoting ${topProducts[0].name}`,
        potential: topProducts[0].revenue * 0.3,
        timeframe: '1-3 months',
        effort: 'low',
        icon: '🚀'
      });
    }

    insights.opportunities = opportunities;
  }

  // Helper functions
  function calculateRevenueGrowth() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthRevenue = sales
      .filter(sale => {
        const date = new Date(sale.createdAt);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, sale) => sum + ((sale.sellingPriceAtSale || 0) * (sale.quantity || 0)), 0);

    const lastMonthRevenue = sales
      .filter(sale => {
        const date = new Date(sale.createdAt);
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const year = currentMonth === 0 ? currentYear - 1 : currentYear;
        return date.getMonth() === lastMonth && date.getFullYear() === year;
      })
      .reduce((sum, sale) => sum + ((sale.sellingPriceAtSale || 0) * (sale.quantity || 0)), 0);

    return lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
  }

  function getHighestExpenseCategory() {
    const categories = {};
    expenses.forEach(expense => {
      const category = expense.category || 'Other';
      categories[category] = (categories[category] || 0) + (expense.amount || 0);
    });
    
    const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    return sortedCategories.length > 0 ? { category: sortedCategories[0][0], amount: sortedCategories[0][1] } : null;
  }

  function getMonthlyRevenues() {
    const monthlyData = {};
    sales.forEach(sale => {
      const date = new Date(sale.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + ((sale.sellingPriceAtSale || 0) * (sale.quantity || 0));
    });
    
    return Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, revenue]) => revenue)
      .slice(-6);
  }

  function getTopProducts() {
    const products = {};
    sales.forEach(sale => {
      const productName = sale.productName || 'Unknown Product';
      if (!products[productName]) {
        products[productName] = { name: productName, revenue: 0 };
      }
      products[productName].revenue += (sale.sellingPriceAtSale || 0) * (sale.quantity || 0);
    });
    
    return Object.values(products).sort((a, b) => b.revenue - a.revenue).slice(0, 3);
  }

  function predictNextMonthRevenue(monthlyRevenues) {
    if (monthlyRevenues.length < 2) return 0;
    
    const lastMonth = monthlyRevenues[monthlyRevenues.length - 1];
    const secondLastMonth = monthlyRevenues[monthlyRevenues.length - 2];
    const trend = lastMonth - secondLastMonth;
    
    return Math.max(0, lastMonth + trend);
  }
</script><div
 class="insights-container" transition:fade={{ duration: 300 }}>
  <!-- Business Insights -->
  <div class="insights-section" transition:fly={{ y: 20, duration: 400, delay: 0 }}>
    <div class="section-header">
      <h3>Business Insights</h3>
      <div class="section-icon">💡</div>
    </div>
    
    <div class="insights-grid">
      {#each insights.businessInsights as insight}
        <div class="insight-card {insight.type}">
          <div class="insight-header">
            <span class="insight-icon">{insight.icon}</span>
            <span class="insight-title">{insight.title}</span>
            <span class="priority-badge {insight.priority}">{insight.priority}</span>
          </div>
          <p class="insight-description">{insight.description}</p>
        </div>
      {/each}
    </div>
  </div>

  <!-- Alerts -->
  {#if insights.alerts.length > 0}
    <div class="insights-section" transition:fly={{ y: 20, duration: 400, delay: 100 }}>
      <div class="section-header">
        <h3>Alerts</h3>
        <div class="section-icon">🚨</div>
      </div>
      
      <div class="alerts-list">
        {#each insights.alerts as alert}
          <div class="alert-card alert-{alert.type}">
            <div class="alert-header">
              <span class="alert-icon">{alert.icon}</span>
              <div class="alert-content">
                <h4 class="alert-title">{alert.title}</h4>
                <p class="alert-description">{alert.description}</p>
              </div>
              <span class="urgency-badge {alert.urgency}">{alert.urgency}</span>
            </div>
            <div class="alert-action">
              <button class="action-btn">{alert.action}</button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Recommendations -->
  {#if insights.recommendations.length > 0}
    <div class="insights-section" transition:fly={{ y: 20, duration: 400, delay: 200 }}>
      <div class="section-header">
        <h3>Recommendations</h3>
        <div class="section-icon">🎯</div>
      </div>
      
      <div class="recommendations-grid">
        {#each insights.recommendations as recommendation}
          <div class="recommendation-card rec-{recommendation.impact}">
            <div class="recommendation-header">
              <span class="recommendation-icon">{recommendation.icon}</span>
              <div class="recommendation-content">
                <h4 class="recommendation-title">{recommendation.title}</h4>
                <p class="recommendation-description">{recommendation.description}</p>
              </div>
            </div>
            <div class="recommendation-metrics">
              <div class="metric">
                <span class="metric-label">Impact</span>
                <span class="metric-value impact-{recommendation.impact}">{recommendation.impact}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Effort</span>
                <span class="metric-value">{recommendation.effort}</span>
              </div>
              {#if recommendation.savings > 0}
                <div class="metric">
                  <span class="metric-label">Potential Savings</span>
                  <span class="metric-value savings">{formatCurrency(recommendation.savings)}</span>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Predictions -->
  {#if insights.predictions.length > 0}
    <div class="insights-section" transition:fly={{ y: 20, duration: 400, delay: 300 }}>
      <div class="section-header">
        <h3>Predictions</h3>
        <div class="section-icon">🔮</div>
      </div>
      
      <div class="predictions-grid">
        {#each insights.predictions as prediction}
          <div class="prediction-card">
            <div class="prediction-header">
              <span class="prediction-icon">{prediction.icon}</span>
              <h4 class="prediction-title">{prediction.title}</h4>
            </div>
            <div class="prediction-value trend-{prediction.trend}">{prediction.value}</div>
            <div class="prediction-confidence">
              <span class="confidence-label">Confidence</span>
              <div class="confidence-bar">
                <div class="confidence-fill" style="width: {prediction.confidence}%"></div>
              </div>
              <span class="confidence-value">{prediction.confidence}%</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Trends -->
  <div class="insights-section" transition:fly={{ y: 20, duration: 400, delay: 400 }}>
    <div class="section-header">
      <h3>Trends</h3>
      <div class="section-icon">📈</div>
    </div>
    
    <div class="trends-grid">
      {#each insights.trends as trend}
        <div class="trend-card">
          <div class="trend-header">
            <span class="trend-icon">{trend.icon}</span>
            <span class="trend-metric">{trend.metric}</span>
          </div>
          <div class="trend-value trend-{trend.direction}">{trend.value}</div>
          <p class="trend-description">{trend.description}</p>
        </div>
      {/each}
    </div>
  </div>

  <!-- Opportunities -->
  {#if insights.opportunities.length > 0}
    <div class="insights-section" transition:fly={{ y: 20, duration: 400, delay: 500 }}>
      <div class="section-header">
        <h3>Opportunities</h3>
        <div class="section-icon">🚀</div>
      </div>
      
      <div class="opportunities-grid">
        {#each insights.opportunities as opportunity}
          <div class="opportunity-card">
            <div class="opportunity-header">
              <span class="opportunity-icon">{opportunity.icon}</span>
              <div class="opportunity-content">
                <h4 class="opportunity-title">{opportunity.title}</h4>
                <p class="opportunity-description">{opportunity.description}</p>
              </div>
            </div>
            <div class="opportunity-metrics">
              <div class="opportunity-potential">
                <span class="potential-label">Potential</span>
                <span class="potential-value">{formatCurrency(opportunity.potential)}</span>
              </div>
              <div class="opportunity-details">
                <span class="detail-item">Timeframe: {opportunity.timeframe}</span>
                <span class="detail-item">Effort: {opportunity.effort}</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div><style
>
  .insights-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .insights-section {
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
  }

  .insights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
  }

  .insight-card {
    padding: 1.5rem;
    border-radius: 1rem;
    border-left: 4px solid;
  }

  .insight-card.success {
    background: #f0fdf4;
    border-left-color: #10b981;
  }

  .insight-card.warning {
    background: #fffbeb;
    border-left-color: #f59e0b;
  }

  .insight-card.danger {
    background: #fef2f2;
    border-left-color: #ef4444;
  }

  .insight-card.info {
    background: #eff6ff;
    border-left-color: #3b82f6;
  }

  .insight-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .insight-icon {
    font-size: 1.25rem;
  }

  .insight-title {
    font-weight: 600;
    flex: 1;
  }

  .priority-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-weight: 500;
    color: white;
  }

  .priority-badge.high {
    background: #ef4444;
  }

  .priority-badge.medium {
    background: #f59e0b;
  }

  .priority-badge.low {
    background: #10b981;
  }

  .insight-description {
    margin: 0;
    color: #6b7280;
    line-height: 1.5;
  }

  .alerts-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .alert-card {
    padding: 1.5rem;
    border-radius: 1rem;
    border: 1px solid;
  }

  .alert-card.alert-critical {
    background: #fef2f2;
    border-color: #fecaca;
  }

  .alert-card.alert-warning {
    background: #fffbeb;
    border-color: #fed7aa;
  }

  .alert-card.alert-info {
    background: #eff6ff;
    border-color: #bfdbfe;
  }

  .alert-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .alert-icon {
    font-size: 1.5rem;
  }

  .alert-content {
    flex: 1;
  }

  .alert-title {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .alert-description {
    margin: 0;
    color: #6b7280;
  }

  .urgency-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-weight: 500;
    color: white;
  }

  .urgency-badge.immediate {
    background: #dc2626;
  }

  .urgency-badge.high {
    background: #ea580c;
  }

  .urgency-badge.medium {
    background: #d97706;
  }

  .action-btn {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.2s ease;
  }

  .action-btn:hover {
    background: #2563eb;
  }

  .recommendations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .recommendation-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .recommendation-card.rec-high {
    border-left: 4px solid #10b981;
  }

  .recommendation-card.rec-medium {
    border-left: 4px solid #f59e0b;
  }

  .recommendation-card.rec-low {
    border-left: 4px solid #6b7280;
  }

  .recommendation-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .recommendation-icon {
    font-size: 1.5rem;
  }

  .recommendation-title {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .recommendation-description {
    margin: 0;
    color: #6b7280;
    line-height: 1.5;
  }

  .recommendation-metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #f3f4f6;
  }

  .metric {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .metric-label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
    font-weight: 500;
  }

  .metric-value {
    font-weight: 600;
  }

  .metric-value.impact-high {
    color: #10b981;
  }

  .metric-value.impact-medium {
    color: #f59e0b;
  }

  .metric-value.impact-low {
    color: #6b7280;
  }

  .metric-value.savings {
    color: #10b981;
  }

  .predictions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .prediction-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 1rem;
    padding: 1.5rem;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .prediction-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .prediction-icon {
    font-size: 1.25rem;
  }

  .prediction-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .prediction-value {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  .prediction-value.trend-up {
    color: #10b981;
  }

  .prediction-value.trend-down {
    color: #ef4444;
  }

  .prediction-confidence {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .confidence-label {
    color: #6b7280;
  }

  .confidence-bar {
    flex: 1;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    overflow: hidden;
  }

  .confidence-fill {
    height: 100%;
    background: #3b82f6;
    transition: width 0.3s ease;
  }

  .confidence-value {
    font-weight: 600;
    color: #3b82f6;
  }

  .trends-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .trend-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 1rem;
    padding: 1.5rem;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .trend-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .trend-icon {
    font-size: 1.25rem;
  }

  .trend-metric {
    font-weight: 600;
    color: #374151;
  }

  .trend-value {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .trend-value.trend-up {
    color: #10b981;
  }

  .trend-value.trend-down {
    color: #ef4444;
  }

  .trend-value.trend-stable {
    color: #6b7280;
  }

  .trend-description {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .opportunities-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .opportunity-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .opportunity-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .opportunity-icon {
    font-size: 1.5rem;
  }

  .opportunity-title {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .opportunity-description {
    margin: 0;
    color: #6b7280;
    line-height: 1.5;
  }

  .opportunity-metrics {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #f3f4f6;
  }

  .opportunity-potential {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .potential-label {
    font-weight: 500;
    color: #374151;
  }

  .potential-value {
    font-size: 1.125rem;
    font-weight: 700;
    color: #10b981;
  }

  .opportunity-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail-item {
    font-size: 0.875rem;
    color: #6b7280;
  }

  @media (max-width: 768px) {
    .insights-grid {
      grid-template-columns: 1fr;
    }

    .recommendations-grid {
      grid-template-columns: 1fr;
    }

    .predictions-grid {
      grid-template-columns: 1fr;
    }

    .trends-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .opportunities-grid {
      grid-template-columns: 1fr;
    }
  }
</style>