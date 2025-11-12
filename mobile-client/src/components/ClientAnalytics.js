import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { wp, hp, rf, RESPONSIVE_STYLES } from '../utils/responsive';
import { useTranslation } from '../hooks/useTranslation';
import { LineChart } from 'react-native-chart-kit';
import { supabaseService } from '../services/supabaseService';

const { width: screenWidth } = Dimensions.get('window');

// Helper functions
const calculateFinancialHealth = (totalLoan, totalPaid, regularity, risk) => {
  const repaymentRatio = totalLoan > 0 ? (totalPaid / totalLoan) * 100 : 0;
  const overallScore = (repaymentRatio * 0.4) + (regularity * 0.3) + (risk * 0.3);
  return Math.round(Math.min(100, Math.max(0, overallScore)));
};

const ClientAnalytics = ({ clientId, navigation }) => {
  const [exportData, setExportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { t, formatCurrency, isRTL, getTextAlign } = useTranslation();

  useEffect(() => {
    loadClientAnalytics();
  }, [clientId]);

  const loadClientAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load export data from Supabase
      const data = await supabaseService.getCurrentData();
      
      console.log('ClientAnalytics loaded export data:', {
        clientId,
        hasClients: !!data.clients,
        clientsCount: data.clients?.length || 0,
        hasCessions: !!data.cessions,
        cessionsCount: data.cessions?.length || 0,
        hasPayments: !!data.payments,
        paymentsCount: data.payments?.length || 0
      });

      // Ensure data has the expected structure
      if (!data || !data.clients) {
        throw new Error('Invalid export data structure: missing clients');
      }

      const processedData = {
        clients: Array.isArray(data.clients) ? data.clients : [],
        cessions: Array.isArray(data.cessions) ? data.cessions : [],
        payments: Array.isArray(data.payments) ? data.payments : []
      };

      console.log('ClientAnalytics processed data:', {
        clientsCount: processedData.clients.length,
        cessionsCount: processedData.cessions.length,
        paymentsCount: processedData.payments.length
      });

      setExportData(processedData);
    } catch (err) {
      console.error('ClientAnalytics error:', err);
      setError(err.message || 'Failed to load client analytics data');
    } finally {
      setLoading(false);
    }
  };

  const analytics = useMemo(() => {
    if (!exportData || !exportData.clients) return null;

    // Find the client
    const client = exportData.clients.find(c => c.id === clientId || c.id === parseInt(clientId));
    if (!client) return null;

    // Filter cessions and payments for this client
    const clientCessions = exportData.cessions ? exportData.cessions.filter(c => c.clientId === clientId || c.clientId === parseInt(clientId)) : [];
    
    // Get payments for this client's cessions (payments are linked to cessions, not directly to clients)
    const clientPayments = exportData.payments ? exportData.payments.filter(p => {
      // Check if payment belongs to any of this client's cessions
      return clientCessions.some(cession => cession.id === p.cessionId || cession.id === parseInt(p.cessionId));
    }) : [];

    console.log('ClientAnalytics calculating analytics for client:', client.id, {
      cessionsCount: clientCessions.length,
      paymentsCount: clientPayments.length
    });

    // Allow analytics even if client has no cessions or payments
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate financial health metrics
    const totalCessions = clientCessions.length;
    const activeCessions = clientCessions.filter(c => c.status === 'ACTIVE').length;
    const completedCessions = clientCessions.filter(c => c.status === 'COMPLETED').length;

    const totalLoanAmount = clientCessions.reduce((sum, c) => sum + (c.totalLoanAmount || c.loanAmount || 0), 0);
    const totalMonthlyPayment = clientCessions.reduce((sum, c) => sum + (c.monthlyPayment || 0), 0);
    const totalPaid = clientPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Payment regularity analysis
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      last6Months.push({
        month: date.getMonth(),
        year: date.getFullYear(),
        label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      });
    }

    const monthlyPayments = last6Months.map(({ month, year }) => {
      const monthPayments = clientPayments.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        return paymentDate.getMonth() === month && paymentDate.getFullYear() === year;
      });
      return {
        month: month + 1,
        year,
        amount: monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        count: monthPayments.length
      };
    });

    // Calculate payment regularity score (0-100)
    const expectedPayments = totalMonthlyPayment * 6; // Rough estimate
    const actualPayments = monthlyPayments.reduce((sum, m) => sum + m.amount, 0);
    const paymentRegularity = expectedPayments > 0 ? Math.min(100, (actualPayments / expectedPayments) * 100) : 0;

    // Risk analysis
    const overduePayments = clientPayments.length > 0 ? clientPayments.filter(p => {
      const dueDate = new Date(p.dueDate);
      const paymentDate = new Date(p.paymentDate);
      return paymentDate > dueDate;
    }).length : 0;

    const riskScore = clientPayments.length > 0 ? Math.max(0, 100 - (overduePayments / clientPayments.length) * 100) : 100;

    // Cession progress analysis
    const cessionProgress = clientCessions.map(cession => {
      const cessionPayments = clientPayments.filter(p => p.cessionId === cession.id);
      const paidAmount = cessionPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const loanAmount = cession.totalLoanAmount || cession.loanAmount || 0;
      const progress = loanAmount > 0 ? (paidAmount / loanAmount) * 100 : 0;

      return {
        ...cession,
        paidAmount,
        progress: Math.min(100, progress),
        remainingAmount: Math.max(0, loanAmount - paidAmount)
      };
    });

    return {
      overview: {
        totalCessions,
        activeCessions,
        completedCessions,
        totalLoanAmount,
        totalMonthlyPayment,
        totalPaid,
        paymentRegularity: Math.round(paymentRegularity),
        riskScore: Math.round(riskScore)
      },
      monthlyPayments,
      cessionProgress,
      financialHealth: calculateFinancialHealth(totalLoanAmount, totalPaid, paymentRegularity, riskScore)
    };
  }, [exportData, clientId]);

  const getHealthColor = (score) => {
    if (score >= 80) return '#28a745';
    if (score >= 60) return '#ffc107';
    return '#dc3545';
  };

  const getHealthLabel = (score) => {
    if (score >= 80) return t('analytics.health.excellent');
    if (score >= 60) return t('analytics.health.good');
    return t('analytics.health.needs_attention');
  };

  const renderFinancialHealthCard = () => {
    if (!analytics) return null;

    const { financialHealth, overview } = analytics;
    const healthColor = getHealthColor(financialHealth);

    return (
      <View style={styles.healthCard}>
        <Text style={[styles.cardTitle, { textAlign: getTextAlign() }]}>
          {t('analytics.financial_health')}
        </Text>

        {/* Health Score Section */}
        <View style={styles.healthScoreContainer}>
          <View style={[styles.healthScoreCircle, { borderColor: healthColor }]}>
            <Text style={[styles.healthScoreText, { color: healthColor }]}>
              {financialHealth}
            </Text>
          </View>
          <Text style={[styles.healthLabel, { color: healthColor, textAlign: getTextAlign() }]}>
            {getHealthLabel(financialHealth)}
          </Text>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGridContainer}>
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={[styles.metricCardValue, { textAlign: getTextAlign() }]}>
                {overview.totalCessions}
              </Text>
              <Text style={[styles.metricCardLabel, { textAlign: getTextAlign() }]}>
                {t('analytics.total_cessions')}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricCardValue, { textAlign: getTextAlign() }]}>
                {overview.activeCessions}
              </Text>
              <Text style={[styles.metricCardLabel, { textAlign: getTextAlign() }]}>
                {t('analytics.active_cessions')}
              </Text>
            </View>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={[styles.metricCardValue, { textAlign: getTextAlign() }]}>
                {overview.completedCessions}
              </Text>
              <Text style={[styles.metricCardLabel, { textAlign: getTextAlign() }]}>
                {t('analytics.completed_cessions')}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricCardValue, { textAlign: getTextAlign() }]}>
                {formatCurrency(overview.totalLoanAmount)}
              </Text>
              <Text style={[styles.metricCardLabel, { textAlign: getTextAlign() }]}>
                {t('analytics.total_loan_amount')}
              </Text>
            </View>
          </View>
        </View>

        {/* Detailed Financial Info */}
        <View style={styles.financialDetails}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
              {t('analytics.total_paid')}
            </Text>
            <Text style={[styles.detailValue, { textAlign: getTextAlign() }]}>
              {formatCurrency(overview.totalPaid)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
              {t('analytics.monthly_payment')}
            </Text>
            <Text style={[styles.detailValue, { textAlign: getTextAlign() }]}>
              {formatCurrency(overview.totalMonthlyPayment)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
              {t('analytics.payment_regularity')}
            </Text>
            <Text style={[styles.detailValue, { textAlign: getTextAlign() }]}>
              {overview.paymentRegularity}%
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
              {t('analytics.risk_score')}
            </Text>
            <Text style={[styles.detailValue, { textAlign: getTextAlign() }]}>
              {overview.riskScore}%
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPaymentTimelineChart = () => {
    if (!analytics || !analytics.monthlyPayments || analytics.monthlyPayments.length === 0) return null;

    const { monthlyPayments } = analytics;
    const chartData = {
      labels: monthlyPayments.map(m => new Date(m.year, m.month - 1).toLocaleDateString('en-US', { month: 'short' })),
      datasets: [{
        data: monthlyPayments.map(m => m.amount)
      }]
    };

    return (
      <View style={styles.chartCard}>
        <Text style={[styles.cardTitle, { textAlign: getTextAlign() }]}>
          {t('analytics.payment_timeline')}
        </Text>
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData}
            width={wp(80)}
            height={hp(30)}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#007AFF'
              }
            }}
            bezier
            style={styles.chart}
          />
        </View>
      </View>
    );
  };

  const renderDetailedMetrics = () => {
    if (!analytics) return null;

    const { overview, cessionProgress } = analytics;

    return (
      <View style={styles.metricsCard}>
        <Text style={[styles.cardTitle, { textAlign: getTextAlign() }]}>
          {t('analytics.detailed_metrics')}
        </Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { textAlign: getTextAlign() }]}>
              {t('analytics.total_cessions')}
            </Text>
            <Text style={[styles.metricValue, { textAlign: getTextAlign() }]}>
              {overview.totalCessions}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { textAlign: getTextAlign() }]}>
              {t('analytics.active_cessions')}
            </Text>
            <Text style={[styles.metricValue, { textAlign: getTextAlign() }]}>
              {overview.activeCessions}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { textAlign: getTextAlign() }]}>
              {t('analytics.completed_cessions')}
            </Text>
            <Text style={[styles.metricValue, { textAlign: getTextAlign() }]}>
              {overview.completedCessions}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { textAlign: getTextAlign() }]}>
              {t('analytics.total_loan_amount')}
            </Text>
            <Text style={[styles.metricValue, { textAlign: getTextAlign() }]}>
              {formatCurrency(overview.totalLoanAmount)}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { textAlign: getTextAlign() }]}>
              {t('analytics.monthly_payment')}
            </Text>
            <Text style={[styles.metricValue, { textAlign: getTextAlign() }]}>
              {formatCurrency(overview.totalMonthlyPayment)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadClientAnalytics}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Client not found or no analytics data available.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderFinancialHealthCard()}
      {renderPaymentTimelineChart()}
      {renderDetailedMetrics()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(5),
  },
  loadingText: {
    fontSize: rf(16),
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(5),
  },
  errorText: {
    fontSize: rf(16),
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: hp(2),
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.5),
    borderRadius: RESPONSIVE_STYLES.card.borderRadius,
  },
  retryText: {
    color: '#fff',
    fontSize: rf(14),
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(5),
  },
  emptyText: {
    fontSize: rf(16),
    color: '#666',
    textAlign: 'center',
  },
  healthCard: {
    backgroundColor: '#fff',
    marginHorizontal: wp(4),
    marginVertical: hp(2),
    borderRadius: RESPONSIVE_STYLES.card.borderRadius,
    padding: wp(5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: hp(3),
  },
  healthOverview: {
    flexDirection: 'row',
    marginBottom: hp(3),
  },
  healthScoreSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthScoreContainer: {
    alignItems: 'center',
    marginBottom: hp(3),
    paddingVertical: hp(2),
  },
  healthScoreCircle: {
    width: wp(22),
    height: wp(22),
    borderRadius: wp(11),
    borderWidth: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1.5),
    backgroundColor: '#f8f9fa',
  },
  healthScoreText: {
    fontSize: rf(22),
    fontWeight: 'bold',
  },
  healthLabel: {
    fontSize: rf(16),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overviewMetrics: {
    flex: 1,
    justifyContent: 'center',
  },
  overviewMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  overviewMetric: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: wp(0.5),
  },
  overviewMetricSingle: {
    flex: 1,
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: wp(40),
  },
  overviewMetricLabel: {
    fontSize: rf(12),
    color: '#666',
    marginBottom: hp(0.5),
  },
  overviewMetricValue: {
    fontSize: rf(14),
    fontWeight: 'bold',
    color: '#333',
  },
  metricsGridContainer: {
    marginBottom: hp(3),
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: RESPONSIVE_STYLES.card.borderRadius,
    padding: wp(4),
    marginHorizontal: wp(1),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  metricCardValue: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: hp(0.5),
  },
  metricCardLabel: {
    fontSize: rf(12),
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  financialDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: hp(2),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  detailLabel: {
    fontSize: rf(14),
    color: '#666',
    flex: 1,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: rf(14),
    fontWeight: 'bold',
    color: '#333',
  },
  chartCard: {
    backgroundColor: '#fff',
    marginHorizontal: wp(4),
    marginVertical: hp(2),
    borderRadius: RESPONSIVE_STYLES.card.borderRadius,
    padding: wp(5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: wp(2),
  },
  chart: {
    marginVertical: hp(2),
    borderRadius: RESPONSIVE_STYLES.card.borderRadius,
  },
  metricsCard: {
    backgroundColor: '#fff',
    marginHorizontal: wp(4),
    marginVertical: hp(2),
    borderRadius: RESPONSIVE_STYLES.card.borderRadius,
    padding: wp(5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  metricsGrid: {
    marginTop: hp(1),
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
});

export default ClientAnalytics;