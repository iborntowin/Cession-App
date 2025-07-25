<script>
  import { onMount } from 'svelte';
  import { cessionsApi, clientsApi, paymentsApi } from '$lib/api';
  import { t } from '$lib/i18n';
  import StatCard from './StatCard.svelte';
  import AdvancedAnalytics from './AdvancedAnalytics.svelte';
  import PredictiveInsights from './PredictiveInsights.svelte';
  import { formatCurrency } from '$lib/utils';
  
  let stats = {
    totalCessions: 0,
    totalClients: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    monthlyGrowth: 0,
    topClients: [],
    recentActivity: [],
    paymentTrends: []
  };
  
  let loading = true;
  let error = '';
  let activeTab = 'overview';
  let cessions = [];
  let clients = [];
  let payments = [];

  async function loadDashboardData() {
    try {
      loading = true;
      error = '';

      // Load all data in parallel
      const [cessionsData, clientsData, paymentsResponse] = await Promise.all([
        cessionsApi.getAll(),
        clientsApi.getAll(),
        paymentsApi.getAllPayments()
      ]);

      // Extract payments data from response
      const paymentsData = paymentsResponse.success ? paymentsResponse.data : [];

      cessions = cessionsData;
      clients = clientsData;
      payments = paymentsData;

      // Calculate basic stats
      stats.totalCessions = cessions.length;
      stats.totalClients = clients.length;
      stats.totalRevenue = cessions.reduce((sum, c) => sum + (c.amount || 0), 0);
      stats.pendingPayments = payments.filter(p => p.status === 'pending').length;

      // Calculate monthly growth
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const currentMonthCessions = cessions.filter(c => {
        const date = new Date(c.createdAt);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });
      const lastMonthCessions = cessions.filter(c => {
        const date = new Date(c.createdAt);
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const year = currentMonth === 0 ? currentYear - 1 : currentYear;
        return date.getMonth() === lastMonth && date.getFullYear() === year;
      });
      
      const currentMonthRevenue = currentMonthCessions.reduce((sum, c) => sum + (c.amount || 0), 0);
      const lastMonthRevenue = lastMonthCessions.reduce((sum, c) => sum + (c.amount || 0), 0);
      
      if (lastMonthRevenue > 0) {
        stats.monthlyGrowth = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
      }

      // Calculate top clients
      const clientStats = new Map();
      cessions.forEach(cession => {
        const clientId = cession.clientId;
        if (!clientStats.has(clientId)) {
          const client = clients.find(c => c.id === clientId);
          clientStats.set(clientId, {
            id: clientId,
            name: client?.name || 'Unknown Client',
            totalAmount: 0,
            cessionCount: 0
          });
        }
        const clientStat = clientStats.get(clientId);
        clientStat.totalAmount += cession.amount || 0;
        clientStat.cessionCount += 1;
      });

      stats.topClients = Array.from(clientStats.values())
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5);

      // Generate recent activity
      const activities = [];
      
      // Recent cessions
      const recentCessions = cessions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3);
      
      recentCessions.forEach(cession => {
        const client = clients.find(c => c.id === cession.clientId);
        activities.push({
          type: 'cession',
          description: `New cession for ${client?.name || 'Unknown Client'}`,
          amount: cession.amount,
          date: cession.createdAt
        });
      });

      // Recent payments
      const recentPayments = payments
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 2);
      
      recentPayments.forEach(payment => {
        activities.push({
          type: 'payment',
          description: `Payment received`,
          amount: payment.amount,
          date: payment.createdAt
        });
      });

      stats.recentActivity = activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      // Generate payment trends (last 6 months)
      const trends = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        const monthPayments = payments.filter(p => {
          const paymentDate = new Date(p.createdAt);
          return paymentDate.getMonth() === date.getMonth() && 
                 paymentDate.getFullYear() === date.getFullYear();
        });
        
        const monthAmount = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        trends.push({ month, amount: monthAmount });
      }
      
      stats.paymentTrends = trends;

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      error = 'Failed to load dashboard data';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadDashboardData();
  });

  function getActivityIcon(type) {
    switch (type) {
      case 'cession': return '📄';
      case 'payment': return '💰';
      case 'client': return '👤';
      default: return '📊';
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
  }
</script>
<div class="smart-dashboard">
  <!-- Premium Header -->
  <div class="dashboard-header">
    <div class="header-content">
      <div class="header-title">
        <h1>Business Intelligence</h1>
        <p class="header-subtitle">Advanced analytics and insights for your business</p>
      </div>
      <div class="header-actions">
        <button class="refresh-btn" on:click={loadDashboardData} disabled={loading}>
          <span class="refresh-icon" class:spinning={loading}>↻</span>
          <span>Refresh</span>
        </button>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="loading-state">
      <div class="loading-animation">
        <div class="loading-dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
        <p>Loading insights...</p>
      </div>
    </div>
  {:else if error}
    <div class="error-state">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <h3>Unable to load data</h3>
        <p>{error}</p>
        <button class="retry-btn" on:click={loadDashboardData}>Try Again</button>
      </div>
    </div>
  {:else}
    <!-- Navigation Tabs -->
    <div class="dashboard-nav">
      <div class="nav-tabs">
        <button 
          class="nav-tab" 
          class:active={activeTab === 'overview'}
          on:click={() => activeTab = 'overview'}
        >
          <span class="tab-icon">📊</span>
          <span>Overview</span>
        </button>
        <button 
          class="nav-tab" 
          class:active={activeTab === 'analytics'}
          on:click={() => activeTab = 'analytics'}
        >
          <span class="tab-icon">📈</span>
          <span>Analytics</span>
        </button>
        <button 
          class="nav-tab" 
          class:active={activeTab === 'insights'}
          on:click={() => activeTab = 'insights'}
        >
          <span class="tab-icon">🔮</span>
          <span>Predictions</span>
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      {#if activeTab === 'overview'}
        <!-- Overview Tab -->
        <div class="overview-section">
          <!-- Hero Metrics -->
          <div class="hero-metrics">
            <div class="hero-card primary">
              <div class="hero-content">
                <div class="hero-label">Total Revenue</div>
                <div class="hero-value">{formatCurrency(stats.totalRevenue)}</div>
                <div class="hero-trend" class:positive={stats.monthlyGrowth > 0} class:negative={stats.monthlyGrowth < 0}>
                  <span class="trend-icon">{stats.monthlyGrowth > 0 ? '↗' : stats.monthlyGrowth < 0 ? '↘' : '→'}</span>
                  <span>{Math.abs(stats.monthlyGrowth).toFixed(1)}% this month</span>
                </div>
              </div>
              <div class="hero-visual">
                <div class="revenue-ring">
                  <svg viewBox="0 0 100 100" class="ring-svg">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="8"/>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="white" stroke-width="8" 
                            stroke-dasharray="283" stroke-dashoffset="{283 - (Math.abs(stats.monthlyGrowth) / 100) * 283}"
                            transform="rotate(-90 50 50)"/>
                  </svg>
                  <div class="ring-center">
                    <span class="ring-percentage">{Math.abs(stats.monthlyGrowth).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-icon">👥</div>
                <div class="metric-content">
                  <div class="metric-value">{stats.totalClients}</div>
                  <div class="metric-label">Active Clients</div>
                </div>
              </div>
              <div class="metric-card">
                <div class="metric-icon">📄</div>
                <div class="metric-content">
                  <div class="metric-value">{stats.totalCessions}</div>
                  <div class="metric-label">Total Cessions</div>
                </div>
              </div>
              <div class="metric-card">
                <div class="metric-icon">⏳</div>
                <div class="metric-content">
                  <div class="metric-value">{stats.pendingPayments}</div>
                  <div class="metric-label">Pending Payments</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Dashboard Grid -->
          <div class="dashboard-grid">
            <!-- Top Clients -->
            <div class="dashboard-card">
              <div class="card-header">
                <h3>Top Performing Clients</h3>
                <div class="card-badge">🏆</div>
              </div>
              <div class="clients-list">
                {#each stats.topClients.slice(0, 5) as client, index}
                  <div class="client-row">
                    <div class="client-rank">#{index + 1}</div>
                    <div class="client-info">
                      <div class="client-name">{client.name}</div>
                      <div class="client-stats">{client.cessionCount} cessions</div>
                    </div>
                    <div class="client-amount">{formatCurrency(client.totalAmount)}</div>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Recent Activity -->
            <div class="dashboard-card">
              <div class="card-header">
                <h3>Recent Activity</h3>
                <div class="card-badge">📈</div>
              </div>
              <div class="activity-feed">
                {#each stats.recentActivity.slice(0, 5) as activity}
                  <div class="activity-row">
                    <div class="activity-icon">{getActivityIcon(activity.type)}</div>
                    <div class="activity-content">
                      <div class="activity-description">{activity.description}</div>
                      <div class="activity-time">{formatDate(activity.date)}</div>
                    </div>
                    {#if activity.amount}
                      <div class="activity-amount">{formatCurrency(activity.amount)}</div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>

            <!-- Payment Trends Chart -->
            <div class="dashboard-card chart-card">
              <div class="card-header">
                <h3>Payment Trends</h3>
                <div class="card-badge">📊</div>
              </div>
              <div class="chart-container">
                {#if stats.paymentTrends.length > 0}
                  <div class="trend-chart">
                    {#each stats.paymentTrends as trend, index}
                      <div class="trend-column">
                        <div class="trend-bar" 
                             style="height: {Math.max(20, (trend.amount / Math.max(...stats.paymentTrends.map(t => t.amount))) * 100)}%">
                          <div class="bar-fill"></div>
                        </div>
                        <div class="trend-label">{trend.month}</div>
                        <div class="trend-value">{formatCurrency(trend.amount)}</div>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="empty-chart">
                    <div class="empty-icon">📈</div>
                    <p>No trend data available</p>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="dashboard-card actions-card">
              <div class="card-header">
                <h3>Quick Actions</h3>
                <div class="card-badge">⚡</div>
              </div>
              <div class="actions-grid">
                <a href="/cessions/new" class="action-item primary">
                  <div class="action-icon">➕</div>
                  <div class="action-label">New Cession</div>
                </a>
                <a href="/clients/new" class="action-item">
                  <div class="action-icon">👤</div>
                  <div class="action-label">Add Client</div>
                </a>
                <a href="/payments" class="action-item">
                  <div class="action-icon">💰</div>
                  <div class="action-label">Payments</div>
                </a>
                <a href="/finance" class="action-item">
                  <div class="action-icon">📊</div>
                  <div class="action-label">Finance</div>
                </a>
              </div>
            </div>
          </div>
        </div>
      {:else if activeTab === 'analytics'}
        <!-- Advanced Analytics Tab -->
        <div class="analytics-section">
          <AdvancedAnalytics {cessions} {clients} {payments} />
        </div>
      {:else if activeTab === 'insights'}
        <!-- Predictive Insights Tab -->
        <div class="insights-section">
          <PredictiveInsights {cessions} {clients} {payments} />
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .smart-dashboard {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 0;
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Premium Header */
  .dashboard-header {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding: 2rem;
    margin-bottom: 0;
  }

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-title h1 {
    margin: 0;
    font-size: 2.5rem;
    font-weight: 700;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .header-subtitle {
    margin: 0.5rem 0 0 0;
    font-size: 1.125rem;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 400;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 1rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
  }

  .refresh-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .refresh-icon {
    font-size: 1.25rem;
    transition: transform 0.3s ease;
  }

  .refresh-icon.spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Loading State */
  .loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
    padding: 3rem;
  }

  .loading-animation {
    text-align: center;
    color: white;
  }

  .loading-dots {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .dot {
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    animation: bounce 1.4s ease-in-out infinite both;
  }

  .dot:nth-child(1) { animation-delay: -0.32s; }
  .dot:nth-child(2) { animation-delay: -0.16s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }

  /* Error State */
  .error-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
    padding: 3rem;
  }

  .error-content {
    text-align: center;
    color: white;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 1.5rem;
    padding: 3rem;
  }

  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .error-content h3 {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .retry-btn {
    margin-top: 1.5rem;
    padding: 0.75rem 1.5rem;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 0.75rem;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
  }

  .retry-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* Navigation */
  .dashboard-nav {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0 2rem;
  }

  .nav-tabs {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    gap: 0;
  }

  .nav-tab {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 2rem;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.3s ease;
    border-bottom: 3px solid transparent;
  }

  .nav-tab:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }

  .nav-tab.active {
    color: white;
    border-bottom-color: white;
    background: rgba(255, 255, 255, 0.1);
  }

  .tab-icon {
    font-size: 1.125rem;
  }

  /* Tab Content */
  .tab-content {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  /* Overview Section */
  .overview-section {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* Hero Metrics */
  .hero-metrics {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .hero-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 2rem;
    padding: 2.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: white;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  .hero-content {
    flex: 1;
  }

  .hero-label {
    font-size: 1rem;
    opacity: 0.8;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .hero-value {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 1rem;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .hero-trend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
  }

  .hero-trend.positive {
    color: #34d399;
  }

  .hero-trend.negative {
    color: #f87171;
  }

  .trend-icon {
    font-size: 1.25rem;
  }

  .hero-visual {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .revenue-ring {
    position: relative;
    width: 120px;
    height: 120px;
  }

  .ring-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }

  .ring-percentage {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .metric-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 1.5rem;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    color: white;
    transition: all 0.3s ease;
  }

  .metric-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }

  .metric-icon {
    font-size: 2rem;
    opacity: 0.8;
  }

  .metric-content {
    flex: 1;
  }

  .metric-value {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }

  .metric-label {
    font-size: 0.875rem;
    opacity: 0.8;
  }

  /* Dashboard Grid */
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
  }

  .dashboard-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 1.5rem;
    padding: 2rem;
    color: white;
    transition: all 0.3s ease;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  .dashboard-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .card-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .card-badge {
    font-size: 1.25rem;
    opacity: 0.7;
  }

  /* Clients List */
  .clients-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .client-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    transition: all 0.3s ease;
  }

  .client-row:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .client-rank {
    width: 2rem;
    height: 2rem;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .client-info {
    flex: 1;
  }

  .client-name {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .client-stats {
    font-size: 0.875rem;
    opacity: 0.8;
  }

  .client-amount {
    font-weight: 700;
    font-size: 1.125rem;
  }

  /* Activity Feed */
  .activity-feed {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .activity-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    transition: all 0.3s ease;
  }

  .activity-row:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .activity-icon {
    width: 2.5rem;
    height: 2.5rem;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
  }

  .activity-content {
    flex: 1;
  }

  .activity-description {
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .activity-time {
    font-size: 0.875rem;
    opacity: 0.8;
  }

  .activity-amount {
    font-weight: 700;
    color: #34d399;
  }

  /* Chart */
  .chart-card {
    grid-column: 1 / -1;
  }

  .chart-container {
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .trend-chart {
    display: flex;
    align-items: end;
    gap: 1.5rem;
    height: 250px;
    width: 100%;
    padding: 1rem 0;
  }

  .trend-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .trend-bar {
    width: 100%;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    min-height: 20px;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .trend-bar:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .bar-fill {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: linear-gradient(to top, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.4));
    border-radius: 0.5rem;
  }

  .trend-label {
    font-size: 0.875rem;
    font-weight: 500;
    opacity: 0.8;
  }

  .trend-value {
    font-size: 0.75rem;
    font-weight: 600;
  }

  .empty-chart {
    text-align: center;
    opacity: 0.6;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  /* Actions */
  .actions-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .action-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    text-decoration: none;
    color: white;
    transition: all 0.3s ease;
    text-align: center;
  }

  .action-item:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  .action-item.primary {
    background: rgba(255, 255, 255, 0.2);
  }

  .action-icon {
    width: 3rem;
    height: 3rem;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }

  .action-label {
    font-weight: 500;
    font-size: 0.875rem;
  }

  /* Analytics and Insights Sections */
  .analytics-section,
  .insights-section {
    color: white;
  }

  /* Responsive Design */
  @media (max-width: 1200px) {
    .hero-metrics {
      grid-template-columns: 1fr;
    }

    .dashboard-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .dashboard-header {
      padding: 1.5rem;
    }

    .header-content {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .header-title h1 {
      font-size: 2rem;
    }

    .nav-tabs {
      flex-direction: column;
    }

    .nav-tab {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      border-right: none;
    }

    .nav-tab.active {
      border-bottom-color: rgba(255, 255, 255, 0.1);
      border-left: 3px solid white;
    }

    .tab-content {
      padding: 1rem;
    }

    .hero-card {
      flex-direction: column;
      text-align: center;
      gap: 1.5rem;
    }

    .metrics-grid {
      grid-template-columns: 1fr;
    }

    .actions-grid {
      grid-template-columns: 1fr;
    }

    .trend-chart {
      height: 200px;
      gap: 1rem;
    }
  }

  @media (max-width: 480px) {
    .dashboard-header {
      padding: 1rem;
    }

    .header-title h1 {
      font-size: 1.75rem;
    }

    .hero-value {
      font-size: 2rem;
    }

    .dashboard-card {
      padding: 1.5rem;
    }

    .client-row,
    .activity-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
  }
</style>