<script>
    import { t } from '$lib/i18n';
  import { formatCurrency } from '$lib/utils';
  export let cessions = [];
  export let clients = [];
  export let payments = [];
  let insights = {
    revenueForecasting: {
      nextMonthRevenue: 0,
      nextQuarterRevenue: 0,
      yearEndProjection: 0,
      confidence: 0,
      trendDirection: 'stable'
    },
    churnAnalysis: {
      highRiskClients: [],
      churnRate: 0,
      retentionOpportunities: []
    },
    growthOpportunities: {
      marketExpansion: [],
      crossSelling: [],
      seasonalTrends: []
    },
    riskAssessment: {
      paymentRisks: [],
      marketRisks: [],
      operationalRisks: []
    }
  };
  $: if (cessions.length > 0 || clients.length > 0 || payments.length > 0) {
    generatePredictiveInsights();
  }
  function generatePredictiveInsights() {
    // Revenue Forecasting
    const revenueForecasting = calculateRevenueForecasting();
    insights.revenueForecasting = revenueForecasting;
    // Churn Analysis
    const churnAnalysis = calculateChurnAnalysis();
    insights.churnAnalysis = churnAnalysis;
    // Growth Opportunities
    const growthOpportunities = identifyGrowthOpportunities();
    insights.growthOpportunities = growthOpportunities;
    // Risk Assessment
    const riskAssessment = assessRisks();
    insights.riskAssessment = riskAssessment;
  }
  function calculateRevenueForecasting() {
    const monthlyRevenues = getMonthlyRevenues();
    // Simple linear regression for trend analysis
    const { slope, intercept, confidence } = linearRegression(monthlyRevenues);
    const nextMonthRevenue = Math.max(0, slope * (monthlyRevenues.length + 1) + intercept);
    const nextQuarterRevenue = Math.max(0, (slope * (monthlyRevenues.length + 2) + intercept) +
                                            (slope * (monthlyRevenues.length + 3) + intercept) +
                                            nextMonthRevenue);
    // Year-end projection based on current trend
    const remainingMonths = 12 - new Date().getMonth();
    let yearEndProjection = 0;
    for (let i = 1; i <= remainingMonths; i++) {
      yearEndProjection += Math.max(0, slope * (monthlyRevenues.length + i) + intercept);
    }
    const trendDirection = slope > 100 ? 'up' : slope < -100 ? 'down' : 'stable';
    return {
      nextMonthRevenue,
      nextQuarterRevenue,
      yearEndProjection,
      confidence: Math.min(95, Math.max(60, confidence)),
      trendDirection
    };
  }
  function getMonthlyRevenues() {
    const revenues = [];
    const currentDate = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      const monthRevenue = cessions
        .filter(c => {
          const cessionDate = new Date(c.createdAt);
          return cessionDate.getMonth() === date.getMonth() &&
                 cessionDate.getFullYear() === date.getFullYear();
        })
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      revenues.push(monthRevenue);
    }
    return revenues;
  }

  /**
   * Performs linear regression on an array of numbers.
   * @param {number[]} values - The array of y-values (dependent variable).
   * @returns {{slope: number, intercept: number, confidence: number}} An object containing the slope, y-intercept, and R-squared confidence.
   */
  function linearRegression(values) {
    const n = values.length;
    // Ensure we have data points
    if (n === 0) {
        return { slope: 0, intercept: 0, confidence: 0 };
    }
    const x = Array.from({ length: n }, (_, i) => i + 1); // X values (1, 2, 3, ...)
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    // Prevent division by zero if all x values are the same (shouldn't happen with sequential x)
    const denominator = (n * sumXX - sumX * sumX);
    if (denominator === 0) {
        const meanY = n > 0 ? sumY / n : 0;
        return { slope: 0, intercept: meanY, confidence: 100 }; // Horizontal line at mean Y
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for confidence
    const yMean = sumY / n;
    let ssRes = 0; // Sum of squares of residuals
    let ssTot = 0; // Total sum of squares
    for (let i = 0; i < n; i++) {
        const predicted = slope * x[i] + intercept;
        ssRes += Math.pow(values[i] - predicted, 2);
        ssTot += Math.pow(values[i] - yMean, 2);
    }

    // Prevent division by zero if all y values are the same
    let rSquared = 0;
    if (ssTot !== 0) {
        rSquared = 1 - (ssRes / ssTot);
    } else if (ssRes === 0) {
        rSquared = 1; // Perfect fit if all points are the same
    }
    // Clamp R-squared between 0 and 1
    rSquared = Math.max(0, Math.min(1, rSquared));

    const confidence = rSquared * 100;
    return { slope, intercept, confidence };
  }


  function calculateChurnAnalysis() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const clientActivity = new Map();
    // Analyze client activity patterns
    cessions.forEach(cession => {
      const clientId = cession.clientId;
      const date = new Date(cession.createdAt);
      if (!clientActivity.has(clientId)) {
        const client = clients.find(c => c.id === clientId);
        clientActivity.set(clientId, {
          clientName: client?.name || 'Unknown Client',
          lastActivity: date,
          totalTransactions: 0,
          totalRevenue: 0,
          activityPattern: []
        });
      }
      const activity = clientActivity.get(clientId);
      if (date > activity.lastActivity) {
        activity.lastActivity = date;
      }
      activity.totalTransactions++;
      activity.totalRevenue += cession.amount || 0;
      activity.activityPattern.push(date);
    });
    // Calculate churn risk for each client
    const highRiskClients = Array.from(clientActivity.entries())
      .map(([clientId, activity]) => {
        const daysSinceLastActivity = (Date.now() - activity.lastActivity.getTime()) / (1000 * 60 * 60 * 24);
        const avgTransactionValue = activity.totalTransactions > 0 ? activity.totalRevenue / activity.totalTransactions : 0; // Prevent division by zero
        // Calculate activity frequency
        const activitySpan = activity.activityPattern.length > 1 ?
          (activity.activityPattern[activity.activityPattern.length - 1].getTime() - activity.activityPattern[0].getTime()) / (1000 * 60 * 60 * 24) : 0;
        const avgDaysBetweenTransactions = activitySpan > 0 && (activity.totalTransactions - 1) > 0 ? activitySpan / (activity.totalTransactions - 1) : 30; // Prevent division by zero
        let riskScore = 0;
        // Time since last activity risk
        if (daysSinceLastActivity > avgDaysBetweenTransactions * 2) riskScore += 40;
        else if (daysSinceLastActivity > avgDaysBetweenTransactions * 1.5) riskScore += 25;
        // Transaction frequency risk
        if (activity.totalTransactions < 3) riskScore += 30;
        else if (activity.totalTransactions < 5) riskScore += 15;
        // Transaction value risk
        if (avgTransactionValue < 5000) riskScore += 20;
        else if (avgTransactionValue < 10000) riskScore += 10;
        // Declining pattern risk (only if we have data for both periods)
        if (thirtyDaysAgo > sixtyDaysAgo) { // Sanity check
            const recentTransactions = activity.activityPattern.filter(date => date >= thirtyDaysAgo).length;
            const previousTransactions = activity.activityPattern.filter(date => date >= sixtyDaysAgo && date < thirtyDaysAgo).length;
            if (recentTransactions < previousTransactions) riskScore += 15;
        }
        // Predict churn date
        const predictedChurnDate = new Date();
        predictedChurnDate.setDate(predictedChurnDate.getDate() + Math.max(30, Math.round(avgDaysBetweenTransactions * 3))); // Round for clarity
        return {
          clientId,
          clientName: activity.clientName,
          riskScore: Math.min(100, Math.max(0, riskScore)), // Clamp risk score
          lastActivity: activity.lastActivity.toISOString(),
          predictedChurnDate: predictedChurnDate.toISOString(),
          potentialLoss: avgTransactionValue * 12 // Estimated annual loss based on average transaction value
        };
      })
      .filter(client => client.riskScore > 40)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    // Calculate overall churn rate
    const totalClients = clientActivity.size;
    const churnedClients = Array.from(clientActivity.values()).filter(activity => {
      const daysSinceLastActivity = (Date.now() - activity.lastActivity.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLastActivity > 90; // Consider churned if no activity for 90 days
    }).length;
    const churnRate = totalClients > 0 ? (churnedClients / totalClients) * 100 : 0;
    // Identify retention opportunities
    const totalPotentialLoss = highRiskClients.reduce((sum, client) => sum + (client.potentialLoss || 0), 0); // Calculate total potential loss first
    const retentionOpportunities = [
      {
        type: 'Personalized Outreach',
        description: 'Implement automated follow-up system for inactive clients',
        impact: totalPotentialLoss * 0.3,
        effort: 'medium'
      },
      {
        type: 'Loyalty Program',
        description: 'Create rewards program for frequent clients',
        impact: totalPotentialLoss * 0.2,
        effort: 'high'
      },
      {
        type: 'Service Enhancement',
        description: 'Improve service quality based on client feedback',
        impact: totalPotentialLoss * 0.4,
        effort: 'high'
      }
    ];
    return {
      highRiskClients,
      churnRate,
      retentionOpportunities
    };
  }
  function identifyGrowthOpportunities() {
    // Market expansion opportunities
    const marketExpansion = [
      {
        segment: 'Small Business',
        potential: calculateSegmentPotential('small'),
        timeframe: '3-6 months',
        requirements: ['Simplified onboarding', 'Competitive pricing', 'Digital marketing']
      },
      {
        segment: 'Enterprise',
        potential: calculateSegmentPotential('enterprise'),
        timeframe: '6-12 months',
        requirements: ['Advanced features', 'Dedicated support', 'Custom integrations']
      }
    ];
    // Cross-selling opportunities
    const crossSelling = identifyCrossSelling();
    // Seasonal trends
    const seasonalTrends = analyzeSeasonalTrends();
    return {
      marketExpansion,
      crossSelling,
      seasonalTrends
    };
  }
  function calculateSegmentPotential(segment) {
    const currentRevenue = cessions.reduce((sum, c) => sum + (c.amount || 0), 0);
    if (segment === 'small') {
      // Assume 30% growth potential in small business segment
      return currentRevenue * 0.3;
    } else if (segment === 'enterprise') {
      // Assume 50% growth potential in enterprise segment
      return currentRevenue * 0.5;
    }
    return 0;
  }
  function identifyCrossSelling() {
    const clientRevenues = new Map();
    cessions.forEach(cession => {
      const revenue = clientRevenues.get(cession.clientId) || 0;
      clientRevenues.set(cession.clientId, revenue + (cession.amount || 0));
    });
    return Array.from(clientRevenues.entries())
      .map(([clientId, revenue]) => {
        const client = clients.find(c => c.id === clientId);
        return {
          clientId,
          clientName: client?.name || 'Unknown Client',
          opportunity: revenue > 50000 ? 'Premium Services' : revenue > 20000 ? 'Additional Services' : 'Service Upgrade',
          estimatedValue: revenue * 0.2 // Assume 20% upsell potential
        };
      })
      .filter(opp => opp.estimatedValue > 1000)
      .sort((a, b) => b.estimatedValue - a.estimatedValue)
      .slice(0, 5);
  }
  function analyzeSeasonalTrends() {
    const monthlyData = new Map();
    cessions.forEach(cession => {
      const date = new Date(cession.createdAt);
      const month = date.getMonth();
      const revenue = monthlyData.get(month) || 0;
      monthlyData.set(month, revenue + (cession.amount || 0));
    });
    // Handle case where there might be no data
    const totalRevenue = Array.from(monthlyData.values()).reduce((sum, rev) => sum + rev, 0);
    const avgRevenue = monthlyData.size > 0 ? totalRevenue / 12 : 0; // Avoid division by zero if no data

    return [
      {
        period: 'Q1 (Jan-Mar)',
        expectedGrowth: avgRevenue > 0 ? (((monthlyData.get(0) || 0) + (monthlyData.get(1) || 0) + (monthlyData.get(2) || 0)) / (avgRevenue * 3) * 100 - 100) : 0,
        recommendations: ['New Year promotions', 'Budget planning services']
      },
      {
        period: 'Q4 (Oct-Dec)',
        expectedGrowth: avgRevenue > 0 ? (((monthlyData.get(9) || 0) + (monthlyData.get(10) || 0) + (monthlyData.get(11) || 0)) / (avgRevenue * 3) * 100 - 100) : 0,
        recommendations: ['Year-end services', 'Holiday promotions']
      }
    ];
  }
  function assessRisks() {
    const paymentRisks = [
      {
        type: 'Late Payments',
        probability: calculateLatePaymentProbability(),
        impact: 75,
        mitigation: 'Implement automated reminders and payment tracking'
      },
      {
        type: 'Payment Defaults',
        probability: calculateDefaultProbability(),
        impact: 90,
        mitigation: 'Enhanced credit checking and payment guarantees'
      }
    ];
    const marketRisks = [
      {
        factor: 'Economic Downturn',
        severity: 'medium',
        description: 'Potential reduction in client spending during economic uncertainty'
      },
      {
        factor: 'Competition',
        severity: 'high',
        description: 'Increased competition may impact pricing and client retention'
      }
    ];
    const operationalRisks = [
      {
        area: 'Client Concentration',
        riskLevel: calculateConcentrationRisk(),
        recommendation: 'Diversify client base to reduce dependency on top clients'
      },
      {
        area: 'Payment Processing',
        riskLevel: calculatePaymentProcessingRisk(),
        recommendation: 'Implement backup payment systems and improve automation'
      }
    ];
    return {
      paymentRisks,
      marketRisks,
      operationalRisks
    };
  }
  function calculateLatePaymentProbability() {
    const totalPayments = payments.length;
    // Ensure we are comparing valid dates and status
    const latePayments = payments.filter(p => {
      if (p.status === 'completed' && p.createdAt && p.updatedAt) {
        const created = new Date(p.createdAt);
        const completed = new Date(p.updatedAt);
         // Check if dates are valid
        if (isNaN(created.getTime()) || isNaN(completed.getTime())) {
            return false;
        }
        const daysDiff = (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff > 30; // Consider late if more than 30 days
      }
      return false;
    }).length;
    return totalPayments > 0 ? (latePayments / totalPayments) * 100 : 0;
  }
  function calculateDefaultProbability() {
    const totalPayments = payments.length;
    const defaultedPayments = payments.filter(p => p.status === 'failed' || p.status === 'cancelled').length;
    return totalPayments > 0 ? (defaultedPayments / totalPayments) * 100 : 0;
  }
  function calculateConcentrationRisk() {
    if (cessions.length === 0) return 0; // No revenue, no concentration risk
    const clientRevenues = new Map();
    let totalRevenue = 0;
    cessions.forEach(cession => {
      const amount = cession.amount || 0;
      totalRevenue += amount;
      const revenue = clientRevenues.get(cession.clientId) || 0;
      clientRevenues.set(cession.clientId, revenue + amount);
    });

    if (totalRevenue === 0) return 0; // Avoid division by zero

    const revenuesArray = Array.from(clientRevenues.values());
    const maxRevenue = Math.max(...revenuesArray, 0); // Ensure at least 0 if array is empty (shouldn't be)

    const concentrationRatio = (maxRevenue / totalRevenue) * 100;
    return Math.min(100, concentrationRatio); // Clamp to 100%
  }
  function calculatePaymentProcessingRisk() {
    const totalPayments = payments.length;
    const failedPayments = payments.filter(p => p.status === 'failed').length;
    return totalPayments > 0 ? (failedPayments / totalPayments) * 100 : 0;
  }
  function getRiskColor(level) {
    if (level >= 70) return '#ef4444';
    if (level >= 40) return '#f59e0b';
    return '#10b981';
  }
  function getConfidenceColor(confidence) {
    if (confidence >= 80) return '#10b981';
    if (confidence >= 60) return '#f59e0b';
    return '#ef4444';
  }
  function getTrendIcon(direction) {
    switch (direction) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  }
</script>

<div class="predictive-insights">
  <!-- Revenue Forecasting Section -->
  <div class="insights-section">
    <div class="section-header">
      <h3>Revenue Forecasting</h3>
      <div class="section-icon">{getTrendIcon(insights.revenueForecasting.trendDirection)}</div>
    </div>
    <div class="forecasting-grid">
      <div class="forecast-card primary">
        <div class="forecast-header">
          <span class="forecast-label">Next Month Projection</span>
          <div class="confidence-badge" style="background-color: {getConfidenceColor(insights.revenueForecasting.confidence)}">
            {insights.revenueForecasting.confidence.toFixed(0)}% confidence
          </div>
        </div>
        <div class="forecast-value">{formatCurrency(insights.revenueForecasting.nextMonthRevenue)}</div>
        <div class="forecast-trend">
          <span class="trend-icon">{getTrendIcon(insights.revenueForecasting.trendDirection)}</span>
          <span class="trend-text">
            {insights.revenueForecasting.trendDirection === 'up' ? 'Growing' :
             insights.revenueForecasting.trendDirection === 'down' ? 'Declining' : 'Stable'} trend
          </span>
        </div>
      </div>
      <div class="forecast-card">
        <div class="forecast-header">
          <span class="forecast-label">Next Quarter</span>
        </div>
        <div class="forecast-value">{formatCurrency(insights.revenueForecasting.nextQuarterRevenue)}</div>
        <div class="forecast-subtitle">3-month projection</div>
      </div>
      <div class="forecast-card">
        <div class="forecast-header">
          <span class="forecast-label">Year-End Projection</span>
        </div>
        <div class="forecast-value">{formatCurrency(insights.revenueForecasting.yearEndProjection)}</div>
        <div class="forecast-subtitle">Remaining months</div>
      </div>
    </div>
  </div>
  <!-- Churn Analysis Section -->
  <div class="insights-section">
    <div class="section-header">
      <h3>Churn Risk Analysis</h3>
      <div class="section-icon">⚠️</div>
    </div>
    <div class="churn-overview">
      <div class="churn-metric">
        <span class="churn-label">Current Churn Rate</span>
        <span class="churn-value" style="color: {getRiskColor(insights.churnAnalysis.churnRate)}">
          {insights.churnAnalysis.churnRate.toFixed(1)}%
        </span>
      </div>
      <div class="churn-metric">
        <span class="churn-label">High-Risk Clients</span>
        <span class="churn-value">{insights.churnAnalysis.highRiskClients.length}</span>
      </div>
    </div>
    <div class="high-risk-clients">
      <h4>Clients at Risk</h4>
      <div class="risk-clients-list">
        {#each insights.churnAnalysis.highRiskClients.slice(0, 5) as client}
          <div class="risk-client-item">
            <div class="client-details">
              <span class="client-name">{client.clientName}</span>
              <span class="last-activity">Last activity: {new Date(client.lastActivity).toLocaleDateString()}</span>
            </div>
            <div class="risk-metrics">
              <div class="risk-score" style="color: {getRiskColor(client.riskScore)}">
                {client.riskScore}% risk
              </div>
              <div class="potential-loss">
                Loss: {formatCurrency(client.potentialLoss)}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
    <div class="retention-opportunities">
      <h4>Retention Strategies</h4>
      <div class="opportunities-grid">
        {#each insights.churnAnalysis.retentionOpportunities as opportunity}
          <div class="opportunity-card">
            <div class="opportunity-header">
              <span class="opportunity-type">{opportunity.type}</span>
              <span class="effort-badge {opportunity.effort}">{opportunity.effort} effort</span>
            </div>
            <p class="opportunity-description">{opportunity.description}</p>
            <div class="opportunity-impact">
              Potential impact: {formatCurrency(opportunity.impact)}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
  <!-- Growth Opportunities Section -->
  <div class="insights-section">
    <div class="section-header">
      <h3>Growth Opportunities</h3>
      <div class="section-icon">🚀</div>
    </div>
    <div class="growth-tabs">
      <div class="tab-content">
        <!-- Market Expansion -->
        <div class="growth-category">
          <h4>Market Expansion</h4>
          <div class="expansion-grid">
            {#each insights.growthOpportunities.marketExpansion as expansion}
              <div class="expansion-card">
                <div class="expansion-header">
                  <span class="segment-name">{expansion.segment}</span>
                  <span class="timeframe">{expansion.timeframe}</span>
                </div>
                <div class="potential-value">{formatCurrency(expansion.potential)}</div>
                <div class="requirements">
                  <span class="requirements-label">Requirements:</span>
                  <ul>
                    {#each expansion.requirements as requirement}
                      <li>{requirement}</li>
                    {/each}
                  </ul>
                </div>
              </div>
            {/each}
          </div>
        </div>
        <!-- Cross-selling -->
        <div class="growth-category">
          <h4>Cross-selling Opportunities</h4>
          <div class="crosssell-list">
            {#each insights.growthOpportunities.crossSelling as opportunity}
              <div class="crosssell-item">
                <div class="crosssell-client">
                  <span class="client-name">{opportunity.clientName}</span>
                  <span class="opportunity-type">{opportunity.opportunity}</span>
                </div>
                <div class="estimated-value">
                  {formatCurrency(opportunity.estimatedValue)}
                </div>
              </div>
            {/each}
          </div>
        </div>
        <!-- Seasonal Trends -->
        <div class="growth-category">
          <h4>Seasonal Insights</h4>
          <div class="seasonal-grid">
            {#each insights.growthOpportunities.seasonalTrends as trend}
              <div class="seasonal-card">
                <div class="seasonal-header">
                  <span class="period">{trend.period}</span>
                  <span class="growth-rate" class:positive={trend.expectedGrowth > 0} class:negative={trend.expectedGrowth < 0}>
                    {trend.expectedGrowth > 0 ? '+' : ''}{trend.expectedGrowth.toFixed(1)}%
                  </span>
                </div>
                <div class="recommendations">
                  {#each trend.recommendations as recommendation}
                    <div class="recommendation-item">• {recommendation}</div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- Risk Assessment Section -->
  <div class="insights-section">
    <div class="section-header">
      <h3>Risk Assessment</h3>
      <div class="section-icon">🛡️</div>
    </div>
    <div class="risk-categories">
      <!-- Payment Risks -->
      <div class="risk-category">
        <h4>Payment Risks</h4>
        <div class="risk-items">
          {#each insights.riskAssessment.paymentRisks as risk}
            <div class="risk-item">
              <div class="risk-header">
                <span class="risk-type">{risk.type}</span>
                <div class="risk-indicators">
                  <span class="probability" style="color: {getRiskColor(risk.probability)}">
                    {risk.probability.toFixed(0)}% probability
                  </span>
                  <span class="impact" style="color: {getRiskColor(risk.impact)}">
                    {risk.impact}% impact
                  </span>
                </div>
              </div>
              <p class="mitigation">{risk.mitigation}</p>
            </div>
          {/each}
        </div>
      </div>
      <!-- Market Risks -->
      <div class="risk-category">
        <h4>Market Risks</h4>
        <div class="risk-items">
          {#each insights.riskAssessment.marketRisks as risk}
            <div class="risk-item">
              <div class="risk-header">
                <span class="risk-factor">{risk.factor}</span>
                <span class="severity-badge {risk.severity}">{risk.severity}</span>
              </div>
              <p class="risk-description">{risk.description}</p>
            </div>
          {/each}
        </div>
      </div>
      <!-- Operational Risks -->
      <div class="risk-category">
        <h4>Operational Risks</h4>
        <div class="risk-items">
          {#each insights.riskAssessment.operationalRisks as risk}
            <div class="risk-item">
              <div class="risk-header">
                <span class="risk-area">{risk.area}</span>
                <div class="risk-level-bar">
                  <div class="risk-fill" style="width: {risk.riskLevel}%; background-color: {getRiskColor(risk.riskLevel)}"></div>
                </div>
              </div>
              <p class="recommendation">{risk.recommendation}</p>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .predictive-insights {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  .insights-section {
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
  }
  .forecasting-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  .forecast-card {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
  }
  .forecast-card.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }
  .forecast-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }
  .forecast-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  .forecast-label {
    font-size: 0.875rem;
    font-weight: 500;
    opacity: 0.8;
  }
  .confidence-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    color: white;
  }
  .forecast-value {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }
  .forecast-trend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    opacity: 0.8;
  }
  .forecast-subtitle {
    font-size: 0.875rem;
    opacity: 0.7;
  }
  .churn-overview {
    display: flex;
    gap: 2rem;
    margin-bottom: 2rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 0.75rem;
  }
  .churn-metric {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .churn-label {
    font-size: 0.875rem;
    color: #6b7280;
  }
  .churn-value {
    font-size: 1.5rem;
    font-weight: 700;
  }
  .high-risk-clients h4 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
  }
  .risk-clients-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .risk-client-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 0.75rem;
  }
  .client-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .client-name {
    font-weight: 500;
  }
  .last-activity {
    font-size: 0.875rem;
    color: #6b7280;
  }
  .risk-metrics {
    display: flex;
    flex-direction: column;
    align-items: end;
    gap: 0.25rem;
  }
  .risk-score {
    font-weight: 600;
  }
  .potential-loss {
    font-size: 0.875rem;
    color: #6b7280;
  }
  .retention-opportunities {
    margin-top: 2rem;
  }
  .retention-opportunities h4 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
  }
  .opportunities-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
  }
  .opportunity-card {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 0.75rem;
    padding: 1rem;
  }
  .opportunity-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  .opportunity-type {
    font-weight: 600;
  }
  .effort-badge {
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    color: white;
  }
  .effort-badge.low {
    background-color: #10b981;
  }
  .effort-badge.medium {
    background-color: #f59e0b;
  }
  .effort-badge.high {
    background-color: #ef4444;
  }
  .opportunity-description {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.75rem;
  }
  .opportunity-impact {
    font-weight: 600;
    color: #10b981;
  }
  .growth-category {
    margin-bottom: 2rem;
  }
  .growth-category h4 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
  }
  .expansion-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
  }
  .expansion-card {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 0.75rem;
    padding: 1rem;
  }
  .expansion-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  .segment-name {
    font-weight: 600;
  }
  .timeframe {
    font-size: 0.875rem;
    color: #6b7280;
  }
  .potential-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #10b981;
    margin-bottom: 0.75rem;
  }
  .requirements {
    font-size: 0.875rem;
  }
  .requirements-label {
    font-weight: 500;
    color: #6b7280;
  }
  .requirements ul {
    margin: 0.5rem 0 0 0;
    padding-left: 1rem;
  }
  .requirements li {
    margin-bottom: 0.25rem;
  }
  .crosssell-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .crosssell-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 0.75rem;
  }
  .crosssell-client {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .opportunity-type {
    font-size: 0.875rem;
    color: #6b7280;
  }
  .estimated-value {
    font-weight: 600;
    color: #10b981;
  }
  .seasonal-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }
  .seasonal-card {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 0.75rem;
    padding: 1rem;
  }
  .seasonal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  .period {
    font-weight: 600;
  }
  .growth-rate {
    font-weight: 600;
  }
  .growth-rate.positive {
    color: #10b981;
  }
  .growth-rate.negative {
    color: #ef4444;
  }
  .recommendations {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .recommendation-item {
    font-size: 0.875rem;
    color: #6b7280;
  }
  .risk-categories {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  .risk-category h4 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
  }
  .risk-items {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .risk-item {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 0.75rem;
    padding: 1rem;
  }
  .risk-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  .risk-type, .risk-factor, .risk-area {
    font-weight: 600;
  }
  .risk-indicators {
    display: flex;
    gap: 1rem;
  }
  .probability, .impact {
    font-size: 0.875rem;
    font-weight: 500;
  }
  .severity-badge {
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    color: white;
  }
  .severity-badge.low {
    background-color: #10b981;
  }
  .severity-badge.medium {
    background-color: #f59e0b;
  }
  .severity-badge.high {
    background-color: #ef4444;
  }
  .risk-level-bar {
    width: 100px;
    height: 6px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }
  .risk-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }
  .mitigation, .risk-description, .recommendation {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }
  @media (max-width: 768px) {
    .forecasting-grid {
      grid-template-columns: 1fr;
    }
    .churn-overview {
      flex-direction: column;
      gap: 1rem;
    }
    .opportunities-grid {
      grid-template-columns: 1fr;
    }
    .expansion-grid {
      grid-template-columns: 1fr;
    }
    .seasonal-grid {
      grid-template-columns: 1fr;
    }
    .risk-indicators {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>
