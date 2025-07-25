<script>
   import { t } from '$lib/i18n';
  import { formatCurrency } from '$lib/utils';
  export let cessions = [];
  export let clients = [];
  export let payments = [];
  let analytics = {
    revenueAnalysis: {
      totalRevenue: 0,
      averageTransactionValue: 0,
      revenueGrowthRate: 0,
      quarterlyRevenue: [],
      revenueByClient: []
    },
    clientAnalysis: {
      totalClients: 0,
      activeClients: 0,
      clientRetentionRate: 0,
      averageClientValue: 0,
      clientSegments: [],
      clientLifetimeValue: 0
    },
    performanceMetrics: {
      conversionRate: 0,
      paymentSuccessRate: 0,
      averagePaymentTime: 0,
      riskScore: 0,
      efficiencyScore: 0
    }
  };
  $: if (cessions.length > 0 || clients.length > 0 || payments.length > 0) {
    calculateAdvancedAnalytics();
  }

  // Fixed the typo: 'funct ion' -> 'function'
  function calculateAdvancedAnalytics() {
    // Revenue Analysis
    const totalRevenue = cessions.reduce((sum, c) => sum + (c.amount || 0), 0);
    const averageTransactionValue = cessions.length > 0 ? totalRevenue / cessions.length : 0;
    // Calculate quarterly revenue and growth
    const quarterlyData = calculateQuarterlyRevenue();
    const revenueGrowthRate = calculateRevenueGrowthRate();
    // Revenue by client
    const revenueByClient = calculateRevenueByClient();
    analytics.revenueAnalysis = {
      totalRevenue,
      averageTransactionValue,
      revenueGrowthRate,
      quarterlyRevenue: quarterlyData,
      revenueByClient
    };
    // Client Analysis
    const activeClients = getActiveClientsCount();
    const clientRetentionRate = calculateClientRetentionRate();
    const averageClientValue = clients.length > 0 ? totalRevenue / clients.length : 0;
    const clientSegments = calculateClientSegments();
    const clientLifetimeValue = calculateClientLifetimeValue();
    analytics.clientAnalysis = {
      totalClients: clients.length,
      activeClients,
      clientRetentionRate,
      averageClientValue,
      clientSegments,
      clientLifetimeValue
    };
    // Performance Metrics
    const conversionRate = calculateConversionRate();
    const paymentSuccessRate = calculatePaymentSuccessRate();
    const averagePaymentTime = calculateAveragePaymentTime();
    const riskScore = calculateRiskScore();
    const efficiencyScore = calculateEfficiencyScore();
    analytics.performanceMetrics = {
      conversionRate,
      paymentSuccessRate,
      averagePaymentTime,
      riskScore,
      efficiencyScore
    };
  }

  function calculateQuarterlyRevenue() {
    const quarters = new Map();
    const currentYear = new Date().getFullYear();
    // Initialize quarters
    for (let q = 1; q <= 4; q++) {
      quarters.set(`Q${q} ${currentYear}`, { revenue: 0, count: 0 });
    }
    cessions.forEach(cession => {
      const date = new Date(cession.createdAt);
      if (date.getFullYear() === currentYear) {
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        const key = `Q${quarter} ${currentYear}`;
        const data = quarters.get(key);
        data.revenue += cession.amount || 0;
        data.count += 1;
      }
    });
    return Array.from(quarters.entries()).map(([quarter, data], index) => {
      const prevQuarter = index > 0 ? Array.from(quarters.values())[index - 1].revenue : 0;
      const growth = prevQuarter > 0 ? ((data.revenue - prevQuarter) / prevQuarter) * 100 : 0;
      return { quarter, revenue: data.revenue, growth };
    });
  }

  function calculateRevenueGrowthRate() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthRevenue = cessions
      .filter(c => {
        const date = new Date(c.createdAt);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    const lastMonthRevenue = cessions
      .filter(c => {
        const date = new Date(c.createdAt);
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const year = currentMonth === 0 ? currentYear - 1 : currentYear;
        return date.getMonth() === lastMonth && date.getFullYear() === year;
      })
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    return lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
  }

  function calculateRevenueByClient() {
    const clientRevenue = new Map();
    const totalRevenue = cessions.reduce((sum, c) => sum + (c.amount || 0), 0);
    cessions.forEach(cession => {
      const clientId = cession.clientId;
      const client = clients.find(c => c.id === clientId);
      const clientName = client?.name || 'Unknown Client';
      if (!clientRevenue.has(clientId)) {
        clientRevenue.set(clientId, { clientName, revenue: 0 });
      }
      clientRevenue.get(clientId).revenue += cession.amount || 0;
    });
    return Array.from(clientRevenue.entries())
      .map(([clientId, data]) => ({
        clientId,
        clientName: data.clientName,
        revenue: data.revenue,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  function getActiveClientsCount() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeClientIds = new Set();
    cessions.forEach(cession => {
      if (new Date(cession.createdAt) >= thirtyDaysAgo) {
        activeClientIds.add(cession.clientId);
      }
    });
    return activeClientIds.size;
  }

  function calculateClientRetentionRate() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const oldClients = new Set();
    const recentClients = new Set();
    cessions.forEach(cession => {
      const date = new Date(cession.createdAt);
      if (date <= sixMonthsAgo && date >= threeMonthsAgo) {
        oldClients.add(cession.clientId);
      }
      if (date >= threeMonthsAgo) {
        recentClients.add(cession.clientId);
      }
    });
    const retainedClients = Array.from(oldClients).filter(id => recentClients.has(id));
    return oldClients.size > 0 ? (retainedClients.length / oldClients.size) * 100 : 0;
  }

  function calculateClientSegments() {
    const segments = [
      { segment: 'High Value', min: 50000, count: 0, revenue: 0 },
      { segment: 'Medium Value', min: 10000, max: 49999, count: 0, revenue: 0 },
      { segment: 'Low Value', min: 0, max: 9999, count: 0, revenue: 0 }
    ];
    const clientRevenues = new Map();
    cessions.forEach(cession => {
      const revenue = clientRevenues.get(cession.clientId) || 0;
      clientRevenues.set(cession.clientId, revenue + (cession.amount || 0));
    });
    clientRevenues.forEach(revenue => {
      for (const segment of segments) {
        if (revenue >= segment.min && (!segment.max || revenue <= segment.max)) {
          segment.count++;
          segment.revenue += revenue;
          break;
        }
      }
    });
    return segments;
  }

  function calculateClientLifetimeValue() {
    const clientRevenues = new Map();
    const clientFirstTransaction = new Map();
    cessions.forEach(cession => {
      const clientId = cession.clientId;
      const revenue = clientRevenues.get(clientId) || 0;
      clientRevenues.set(clientId, revenue + (cession.amount || 0));
      const firstTransaction = clientFirstTransaction.get(clientId);
      const currentDate = new Date(cession.createdAt);
      if (!firstTransaction || currentDate < firstTransaction) {
        clientFirstTransaction.set(clientId, currentDate);
      }
    });
    let totalLifetimeValue = 0;
    let clientCount = 0;
    clientRevenues.forEach((revenue, clientId) => {
      const firstTransaction = clientFirstTransaction.get(clientId);
      if (firstTransaction) {
        const monthsActive = Math.max(1, (Date.now() - firstTransaction.getTime()) / (1000 * 60 * 60 * 24 * 30));
        const monthlyValue = revenue / monthsActive;
        const estimatedLifetime = 24; // Assume 24 months average lifetime
        totalLifetimeValue += monthlyValue * estimatedLifetime;
        clientCount++;
      }
    });
    return clientCount > 0 ? totalLifetimeValue / clientCount : 0;
  }

  function calculateConversionRate() {
    const totalCessions = cessions.length;
    const paidCessions = payments.filter(p => p.status === 'completed').length;
    return totalCessions > 0 ? (paidCessions / totalCessions) * 100 : 0;
  }

  function calculatePaymentSuccessRate() {
    const totalPayments = payments.length;
    const successfulPayments = payments.filter(p => p.status === 'completed').length;
    return totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;
  }

  function calculateAveragePaymentTime() {
    const completedPayments = payments.filter(p => p.status === 'completed' && p.createdAt && p.updatedAt);
    if (completedPayments.length === 0) return 0;
    const totalTime = completedPayments.reduce((sum, payment) => {
      const created = new Date(payment.createdAt);
      const completed = new Date(payment.updatedAt);
      return sum + (completed.getTime() - created.getTime());
    }, 0);
    return totalTime / completedPayments.length / (1000 * 60 * 60 * 24); // Convert to days
  }

  function calculateRiskScore() {
    const pendingPayments = payments.filter(p => p.status === 'pending').length;
    const totalPayments = payments.length;
    const overduePayments = payments.filter(p => {
      if (p.status !== 'pending') return false;
      const dueDate = new Date(p.dueDate || p.createdAt);
      dueDate.setDate(dueDate.getDate() + 30); // Assume 30 days payment term
      return new Date() > dueDate;
    }).length;
    const pendingRatio = totalPayments > 0 ? pendingPayments / totalPayments : 0;
    const overdueRatio = totalPayments > 0 ? overduePayments / totalPayments : 0;
    return Math.min(100, (pendingRatio * 50) + (overdueRatio * 50));
  }

  function calculateEfficiencyScore() {
    const paymentSuccessRate = calculatePaymentSuccessRate();
    const conversionRate = calculateConversionRate();
    const avgPaymentTime = calculateAveragePaymentTime();
    const timeScore = Math.max(0, 100 - (avgPaymentTime * 2)); // Lower time = higher score
    const efficiencyScore = (paymentSuccessRate * 0.4) + (conversionRate * 0.4) + (timeScore * 0.2);
    return Math.min(100, efficiencyScore);
  }

  /**
   * Gets the color associated with a risk score.
   * @param {number} score - The risk score (0-100).
   * @returns {string} The hex color code.
   */
  function getRiskColor(score) {
    if (score >= 70) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    return '#10b981';
  }

  /**
   * Gets the color associated with an efficiency score.
   * @param {number} score - The efficiency score (0-100).
   * @returns {string} The hex color code.
   */
  function getEfficiencyColor(score) {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  }
</script>

<div class="advanced-analytics">
  <!-- Revenue Analysis Section -->
  <div class="analytics-section">
    <div class="section-header">
      <h3>Revenue Intelligence</h3>
      <div class="section-icon">📊</div>
    </div>
    <div class="metrics-row">
      <div class="metric-card premium">
        <div class="metric-header">
          <span class="metric-label">Total Revenue</span>
          <div class="metric-trend positive">
            ↗ {analytics.revenueAnalysis.revenueGrowthRate.toFixed(1)}%
          </div>
        </div>
        <div class="metric-value">{formatCurrency(analytics.revenueAnalysis.totalRevenue)}</div>
        <div class="metric-subtitle">
          Avg: {formatCurrency(analytics.revenueAnalysis.averageTransactionValue)}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">Quarterly Performance</span>
        </div>
        <div class="quarterly-chart">
          {#each analytics.revenueAnalysis.quarterlyRevenue as quarter}
            <div class="quarter-item">
              <div class="quarter-bar" style="height: {Math.max(20, (quarter.revenue / Math.max(...analytics.revenueAnalysis.quarterlyRevenue.map(q => q.revenue || 0))) * 100)}%"></div>
              <span class="quarter-label">{quarter.quarter}</span>
              <span class="quarter-growth" class:positive={quarter.growth > 0} class:negative={quarter.growth < 0}>
                {quarter.growth > 0 ? '+' : ''}{quarter.growth.toFixed(1)}%
              </span>
            </div>
          {/each}
        </div>
      </div>
    </div>
    <!-- Revenue Distribution -->
    <div class="revenue-distribution">
      <h4>Revenue by Client</h4>
      <div class="distribution-list">
        {#each analytics.revenueAnalysis.revenueByClient.slice(0, 5) as client}
          <div class="distribution-item">
            <div class="client-info">
              <span class="client-name">{client.clientName}</span>
              <div class="progress-bar">
                <div class="progress-fill" style="width: {client.percentage}%"></div>
              </div>
            </div>
            <div class="client-metrics">
              <span class="revenue">{formatCurrency(client.revenue)}</span>
              <span class="percentage">{client.percentage.toFixed(1)}%</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
  <!-- Client Analysis Section -->
  <div class="analytics-section">
    <div class="section-header">
      <h3>Client Intelligence</h3>
      <div class="section-icon">👥</div>
    </div>
    <div class="metrics-row">
      <div class="metric-card">
        <div class="metric-label">Active Clients</div>
        <div class="metric-value">{analytics.clientAnalysis.activeClients}</div>
        <div class="metric-subtitle">of {analytics.clientAnalysis.totalClients} total</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Retention Rate</div>
        <div class="metric-value">{analytics.clientAnalysis.clientRetentionRate.toFixed(1)}%</div>
        <div class="retention-indicator" style="background: conic-gradient(#10b981 0deg {Math.max(0, Math.min(360, analytics.clientAnalysis.clientRetentionRate * 3.6))}deg, #e5e7eb {Math.max(0, Math.min(360, analytics.clientAnalysis.clientRetentionRate * 3.6))}deg 360deg)"></div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Lifetime Value</div>
        <div class="metric-value">{formatCurrency(analytics.clientAnalysis.clientLifetimeValue)}</div>
        <div class="metric-subtitle">per client</div>
      </div>
    </div>
    <!-- Client Segments -->
    <div class="client-segments">
      <h4>Client Segments</h4>
      <div class="segments-grid">
        {#each analytics.clientAnalysis.clientSegments as segment}
          <div class="segment-card">
            <div class="segment-header">
              <span class="segment-name">{segment.segment}</span>
              <span class="segment-count">{segment.count}</span>
            </div>
            <div class="segment-revenue">{formatCurrency(segment.revenue)}</div>
            <div class="segment-bar">
              <div class="segment-fill" style="width: {(analytics.revenueAnalysis.totalRevenue > 0 ? (segment.revenue / analytics.revenueAnalysis.totalRevenue) * 100 : 0)}%"></div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
  <!-- Performance Metrics Section -->
  <div class="analytics-section">
    <div class="section-header">
      <h3>Performance Metrics</h3>
      <div class="section-icon">⚡</div>
    </div>
    <div class="performance-grid">
      <div class="performance-card">
        <div class="performance-header">
          <span class="performance-label">Conversion Rate</span>
          <div class="performance-score">{analytics.performanceMetrics.conversionRate.toFixed(1)}%</div>
        </div>
        <div class="performance-bar">
          <div class="performance-fill" style="width: {analytics.performanceMetrics.conversionRate}%; background: #10b981"></div>
        </div>
      </div>
      <div class="performance-card">
        <div class="performance-header">
          <span class="performance-label">Payment Success</span>
          <div class="performance-score">{analytics.performanceMetrics.paymentSuccessRate.toFixed(1)}%</div>
        </div>
        <div class="performance-bar">
          <div class="performance-fill" style="width: {analytics.performanceMetrics.paymentSuccessRate}%; background: #3b82f6"></div>
        </div>
      </div>
      <div class="performance-card">
        <div class="performance-header">
          <span class="performance-label">Risk Score</span>
          <div class="performance-score" style="color: {getRiskColor(analytics.performanceMetrics.riskScore)}">
            {analytics.performanceMetrics.riskScore.toFixed(0)}
          </div>
        </div>
        <div class="performance-bar">
          <div class="performance-fill" style="width: {analytics.performanceMetrics.riskScore}%; background: {getRiskColor(analytics.performanceMetrics.riskScore)}"></div>
        </div>
      </div>
      <div class="performance-card">
        <div class="performance-header">
          <span class="performance-label">Efficiency Score</span>
          <div class="performance-score" style="color: {getEfficiencyColor(analytics.performanceMetrics.efficiencyScore)}">
            {analytics.performanceMetrics.efficiencyScore.toFixed(0)}
          </div>
        </div>
        <div class="performance-bar">
          <div class="performance-fill" style="width: {analytics.performanceMetrics.efficiencyScore}%; background: {getEfficiencyColor(analytics.performanceMetrics.efficiencyScore)}"></div>
        </div>
      </div>
    </div>
    <div class="performance-insights">
      <div class="insight-item">
        <span class="insight-icon">⏱️</span>
        <div class="insight-content">
          <span class="insight-label">Average Payment Time</span>
          <span class="insight-value">{analytics.performanceMetrics.averagePaymentTime.toFixed(1)} days</span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .advanced-analytics {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  .analytics-section {
    background: rgba(255, 255, 255, 0.8);
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
  .metrics-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
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
  .metric-card.premium {
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
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.2);
  }
  .metric-trend.positive {
    color: #10b981;
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
  .quarterly-chart {
    display: flex;
    gap: 1rem;
    height: 120px;
    align-items: end;
  }
  .quarter-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .quarter-bar {
    width: 100%;
    background: linear-gradient(to top, #3b82f6, #60a5fa);
    border-radius: 0.25rem;
    min-height: 20px;
    transition: all 0.3s ease;
  }
  .quarter-bar:hover {
    opacity: 0.8;
  }
  .quarter-label {
    font-size: 0.75rem;
    font-weight: 500;
  }
  .quarter-growth {
    font-size: 0.75rem;
    font-weight: 600;
  }
  .quarter-growth.positive {
    color: #10b981;
  }
  .quarter-growth.negative {
    color: #ef4444;
  }
  .revenue-distribution h4 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
  }
  .distribution-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .distribution-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
  .client-info {
    flex: 1;
    margin-right: 1rem;
  }
  .client-name {
    font-weight: 500;
    display: block;
    margin-bottom: 0.5rem;
  }
  .progress-bar {
    width: 100%;
    height: 4px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    border-radius: 2px;
    transition: width 0.3s ease;
  }
  .client-metrics {
    display: flex;
    flex-direction: column;
    align-items: end;
    gap: 0.25rem;
  }
  .revenue {
    font-weight: 600;
    color: #1f2937;
  }
  .percentage {
    font-size: 0.875rem;
    color: #6b7280;
  }
  .retention-indicator {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-top: 0.5rem;
  }
  .client-segments h4 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
  }
  .segments-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  .segment-card {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 0.75rem;
    padding: 1rem;
  }
  .segment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .segment-name {
    font-weight: 500;
  }
  .segment-count {
    font-size: 0.875rem;
    color: #6b7280;
  }
  .segment-revenue {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  .segment-bar {
    width: 100%;
    height: 4px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }
  .segment-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #34d399);
    border-radius: 2px;
    transition: width 0.3s ease;
  }
  .performance-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
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
  .performance-insights {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .insight-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 0.75rem;
  }
  .insight-icon {
    font-size: 1.25rem;
  }
  .insight-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .insight-label {
    font-size: 0.875rem;
    color: #6b7280;
  }
  .insight-value {
    font-weight: 600;
  }
  @media (max-width: 768px) {
    .metrics-row {
      grid-template-columns: 1fr;
    }
    .quarterly-chart {
      height: 80px;
    }
    .segments-grid {
      grid-template-columns: 1fr;
    }
    .performance-grid {
      grid-template-columns: 1fr;
    }
  }
</style>