import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StatusBar,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { wp, hp } from '../utils/responsive';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ConnectivityIndicator from '../components/ConnectivityIndicator';

import { reportService } from '../services/reportService';

const { width, height } = Dimensions.get('window');

const ReportsScreen = ({ navigation }) => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReportType, setSelectedReportType] = useState('summary');
  const [filters, setFilters] = useState({});

  useEffect(() => {
    loadReports();
  }, [selectedReportType, filters]);

  const loadReports = async () => {
    try {
      setError(null);
      const data = await reportService.generateReports(filters);
      setReports(data);
    } catch (err) {
      setError(err.message || 'Failed to generate reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
  };

  const exportReport = async () => {
    try {
      Alert.alert(
        'Export Report',
        'This feature is not yet implemented in the mobile app. Please use the main application for report exports.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to export report');
    }
  };

  const renderSummaryReport = () => {
    if (!reports?.summary) return null;

    const summary = reports.summary;

    return (
      <View style={styles.reportSection}>
        <Text style={styles.sectionTitle}>Summary Report</Text>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.totalCessions}</Text>
            <Text style={styles.summaryLabel}>Total Cessions</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.totalClients}</Text>
            <Text style={styles.summaryLabel}>Total Clients</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.activeCessions}</Text>
            <Text style={styles.summaryLabel}>Active Cessions</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.completedCessions}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.summaryDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Loan Amount:</Text>
            <Text style={styles.detailValue}>{summary.totalLoanAmount?.toFixed(3)} TND</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Payments:</Text>
            <Text style={styles.detailValue}>{summary.totalPaymentAmount?.toFixed(3)} TND</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Completion Rate:</Text>
            <Text style={styles.detailValue}>{summary.completionRate?.toFixed(1)}%</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Success Rate:</Text>
            <Text style={styles.detailValue}>{summary.paymentSuccessRate?.toFixed(1)}%</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderClientReport = () => {
    if (!reports?.clientReport || reports.clientReport.length === 0) {
      return (
        <View style={styles.reportSection}>
          <Text style={styles.sectionTitle}>Client Report</Text>
          <Text style={styles.emptyText}>No client data available</Text>
        </View>
      );
    }

    const topClients = reports.clientReport.slice(0, 10);

    return (
      <View style={styles.reportSection}>
        <Text style={styles.sectionTitle}>Top Clients by Loan Amount</Text>

        {topClients.map((client, index) => (
          <View key={client.clientId} style={styles.clientCard}>
            <View style={styles.clientHeader}>
              <Text style={styles.clientRank}>#{index + 1}</Text>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName} numberOfLines={1}>
                  {client.clientName}
                </Text>
                <Text style={styles.clientDetails}>
                  CIN: {client.cin} • Worker: {client.workerNumber}
                </Text>
              </View>
            </View>

            <View style={styles.clientStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{client.totalCessions}</Text>
                <Text style={styles.statLabel}>Cessions</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{client.activeCessions}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{client.totalLoanAmount?.toFixed(3)} TND</Text>
                <Text style={styles.statLabel}>Total Loan</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{client.totalPaid?.toFixed(3)} TND</Text>
                <Text style={styles.statLabel}>Total Paid</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderPaymentReport = () => {
    if (!reports?.paymentReport || reports.paymentReport.length === 0) {
      return (
        <View style={styles.reportSection}>
          <Text style={styles.sectionTitle}>Payment Report</Text>
          <Text style={styles.emptyText}>No payment data available</Text>
        </View>
      );
    }

    const recentPayments = reports.paymentReport.slice(0, 20);

    return (
      <View style={styles.reportSection}>
        <Text style={styles.sectionTitle}>Recent Payments</Text>

        {recentPayments.map((payment, index) => (
          <View key={payment.paymentId || index} style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <Text style={styles.clientName} numberOfLines={1}>
                {payment.clientName}
              </Text>
              <Text style={styles.paymentAmount}>
                {payment.amount?.toFixed(3)} TND
              </Text>
            </View>

            <View style={styles.paymentDetails}>
              <Text style={styles.paymentInfo}>
                Date: {new Date(payment.paymentDate).toLocaleDateString()}
              </Text>
              <Text style={styles.paymentInfo}>
                Status: {payment.status}
              </Text>
              {payment.isOverdue && (
                <Text style={styles.overdueText}>
                  Overdue by {payment.daysOverdue} days
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderCessionReport = () => {
    if (!reports?.cessionReport || reports.cessionReport.length === 0) {
      return (
        <View style={styles.reportSection}>
          <Text style={styles.sectionTitle}>Cession Report</Text>
          <Text style={styles.emptyText}>No cession data available</Text>
        </View>
      );
    }

    const recentCessions = reports.cessionReport.slice(0, 15);

    return (
      <View style={styles.reportSection}>
        <Text style={styles.sectionTitle}>Recent Cessions</Text>

        {recentCessions.map((cession, index) => (
          <View key={cession.cessionId || index} style={styles.cessionCard}>
            <View style={styles.cessionHeader}>
              <Text style={styles.clientName} numberOfLines={1}>
                {cession.clientName}
              </Text>
              <View style={[styles.statusBadge, {
                backgroundColor: cession.status === 'ACTIVE' ? '#10b981' :
                               cession.status === 'FINISHED' ? '#3b82f6' : '#6b7280'
              }]}>
                <Text style={styles.statusText}>{cession.status}</Text>
              </View>
            </View>

            <View style={styles.cessionDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Loan Amount:</Text>
                <Text style={styles.detailValue}>{cession.totalLoanAmount?.toFixed(3)} TND</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Monthly Payment:</Text>
                <Text style={styles.detailValue}>{cession.monthlyPayment?.toFixed(3)} TND</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Progress:</Text>
                <Text style={styles.detailValue}>{cession.progress}%</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bank/Agency:</Text>
                <Text style={styles.detailValue}>{cession.bankOrAgency || 'N/A'}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <LoadingSpinner />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ErrorMessage
          message={error}
          onRetry={loadReports}
        />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Premium Background */}
      <View style={styles.backgroundContainer}>
        <View style={styles.meshGradient1} />
        <View style={styles.meshGradient2} />
        <View style={styles.meshGradient3} />
        <View style={styles.glowOrb1} />
        <View style={styles.glowOrb2} />
      </View>

      <SafeAreaView style={styles.container} edges={['right', 'left']}>
        <ConnectivityIndicator />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Reports</Text>
            <Text style={styles.headerSubtitle}>Business Analytics</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366f1"
              colors={['#6366f1', '#8b5cf6']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Report Type Selector */}
          <View style={styles.selectorContainer}>
            {[
              { key: 'summary', label: 'Summary' },
              { key: 'clientReport', label: 'Clients' },
              { key: 'paymentReport', label: 'Payments' },
              { key: 'cessionReport', label: 'Cessions' }
            ].map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.selectorButton,
                  selectedReportType === type.key && styles.selectorButtonActive
                ]}
                onPress={() => setSelectedReportType(type.key)}
              >
                <Text style={[
                  styles.selectorText,
                  selectedReportType === type.key && styles.selectorTextActive
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Export Button */}
          <TouchableOpacity style={styles.exportButton} onPress={exportReport}>
            <Text style={styles.exportButtonText}>Export Report</Text>
          </TouchableOpacity>

          {/* Report Content */}
          {selectedReportType === 'summary' && renderSummaryReport()}
          {selectedReportType === 'clientReport' && renderClientReport()}
          {selectedReportType === 'paymentReport' && renderPaymentReport()}
          {selectedReportType === 'cessionReport' && renderCessionReport()}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  // ==================== MAIN CONTAINERS ====================
  mainContainer: {
    flex: 1,
    backgroundColor: '#fafbfd',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },

  // ==================== PREMIUM $200 SAAS BACKGROUND ====================
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: '#fafbfd',
  },
  meshGradient1: {
    position: 'absolute',
    top: -height * 0.25,
    right: -width * 0.25,
    width: width * 1.2,
    height: width * 1.2,
    backgroundColor: '#6366f1',
    opacity: 0.06,
    borderRadius: width * 0.6,
    transform: [{ scale: 1.2 }],
  },
  meshGradient2: {
    position: 'absolute',
    top: height * 0.15,
    left: -width * 0.4,
    width: width * 1.4,
    height: width * 1.4,
    backgroundColor: '#8b5cf6',
    opacity: 0.04,
    borderRadius: width * 0.7,
    transform: [{ scale: 1.1 }],
  },
  meshGradient3: {
    position: 'absolute',
    bottom: -height * 0.2,
    right: -width * 0.3,
    width: width * 1.3,
    height: width * 1.3,
    backgroundColor: '#10b981',
    opacity: 0.03,
    borderRadius: width * 0.65,
    transform: [{ scale: 1.15 }],
  },
  glowOrb1: {
    position: 'absolute',
    top: height * 0.4,
    left: width * 0.15,
    width: wp(60),
    height: wp(60),
    backgroundColor: '#c7d2fe',
    opacity: 0.08,
    borderRadius: wp(30),
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 5,
  },
  glowOrb2: {
    position: 'absolute',
    bottom: height * 0.3,
    right: width * 0.1,
    width: wp(50),
    height: wp(50),
    backgroundColor: '#fae8ff',
    opacity: 0.08,
    borderRadius: wp(25),
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 35,
    elevation: 4,
  },

  // ==================== HEADER ====================
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(30px)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.6)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContent: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(2),
  },
  headerTitle: {
    fontSize: wp(7),
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
    marginBottom: hp(0.3),
  },
  headerSubtitle: {
    fontSize: wp(3.8),
    color: '#64748b',
    fontWeight: '600',
  },

  // ==================== SCROLLVIEW ====================
  scrollView: {
    flex: 1,
  },
  
  // ==================== SELECTOR ====================
  // ==================== SELECTOR ====================
  selectorContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(6),
    paddingVertical: hp(2),
    gap: wp(2),
  },
  selectorButton: {
    flex: 1,
    paddingVertical: hp(1.5),
    borderRadius: wp(3),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  selectorButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  selectorText: {
    fontSize: wp(3.5),
    fontWeight: '600',
    color: '#64748b',
  },
  selectorTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  exportButton: {
    backgroundColor: '#10b981',
    marginHorizontal: wp(6),
    marginBottom: hp(2),
    paddingVertical: hp(1.8),
    borderRadius: wp(3),
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: wp(4),
    fontWeight: '700',
  },
  
  // ==================== REPORT SECTIONS ====================
  reportSection: {
    marginHorizontal: wp(6),
    marginBottom: hp(2),
  },
  sectionTitle: {
    fontSize: wp(5),
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: hp(2),
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(3),
    marginBottom: hp(2),
  },
  summaryItem: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: wp(4),
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryValue: {
    fontSize: wp(6.5),
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: hp(0.5),
  },
  summaryLabel: {
    fontSize: wp(3.3),
    color: '#64748b',
    fontWeight: '600',
  },
  summaryDetails: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: wp(4),
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.5)',
  },
  detailLabel: {
    fontSize: wp(3.8),
    color: '#64748b',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: wp(4),
    fontWeight: '700',
    color: '#0f172a',
  },
  // ==================== CLIENT REPORT ====================
  clientCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: wp(4),
    padding: wp(4),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  clientRank: {
    fontSize: wp(5),
    fontWeight: '800',
    color: '#6366f1',
    marginRight: wp(3),
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: hp(0.5),
  },
  clientDetails: {
    fontSize: wp(3.5),
    color: '#64748b',
    fontWeight: '500',
  },
  clientStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: hp(0.5),
  },
  statLabel: {
    fontSize: wp(3),
    color: '#64748b',
    fontWeight: '600',
  },
  
  // ==================== PAYMENT REPORT ====================
  paymentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: wp(4),
    padding: wp(4),
    marginBottom: hp(1),
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  paymentAmount: {
    fontSize: wp(5.5),
    fontWeight: '800',
    color: '#10b981',
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentInfo: {
    fontSize: wp(3.5),
    color: '#64748b',
    fontWeight: '500',
  },
  overdueText: {
    color: '#ef4444',
    fontWeight: '700',
  },
  
  // ==================== CESSION REPORT ====================
  cessionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: wp(4),
    padding: wp(4),
    marginBottom: hp(1),
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  statusBadge: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: wp(2),
  },
  statusText: {
    color: '#fff',
    fontSize: wp(3.2),
    fontWeight: '700',
  },
  cessionDetails: {
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    borderRadius: wp(2),
    padding: wp(3),
  },
  emptyText: {
    textAlign: 'center',
    fontSize: wp(4),
    color: '#64748b',
    fontWeight: '500',
    fontStyle: 'italic',
  },
});

export default ReportsScreen;