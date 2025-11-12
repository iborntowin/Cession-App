import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Dimensions,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { wp, hp } from '../utils/responsive';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ConnectivityIndicator from '../components/ConnectivityIndicator';

import { paymentService } from '../services/paymentService';
import { cessionService } from '../services/cessionService';
import { clientService } from '../services/clientService';
import { useTranslation } from '../hooks/useTranslation';

const { width, height } = Dimensions.get('window');

const PaymentsScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [cessions, setCessions] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Translation hook
  const { t, isRTL, getTextAlign } = useTranslation();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAndSortPayments();
  }, [payments, cessions, clients, searchQuery]);

  const loadData = async () => {
    try {
      setError(null);

      // Load payments, cessions, and clients with error handling
      const [paymentsResult, cessionsResult, clientsResult] = await Promise.allSettled([
        paymentService.getAllPayments().catch(error => {
          // Log the error but don't fail the entire screen
          console.log('Failed to fetch payments - using offline mode');
          return []; // Return empty array as fallback
        }),
        cessionService.getAllCessions(),
        clientService.getAllClients()
      ]);

      // Extract data from results, using empty arrays as fallbacks
      const paymentsData = paymentsResult.status === 'fulfilled' ? paymentsResult.value : [];
      const cessionsData = cessionsResult.status === 'fulfilled' ? cessionsResult.value : [];
      const clientsData = clientsResult.status === 'fulfilled' ? clientsResult.value : [];

      setPayments(paymentsData);
      setCessions(cessionsData);
      setClients(clientsData);
    } catch (err) {
      setError(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterAndSortPayments = () => {
    let filtered = [...payments];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(payment => {
        const cession = cessions.find(c => c.id === payment.cessionId);
        const client = cession ? clients.find(c => c.id === cession.clientId) : null;

        const searchLower = searchQuery.toLowerCase();
        return (
          client?.fullName?.toLowerCase().includes(searchLower) ||
          client?.cin?.toLowerCase().includes(searchLower) ||
          client?.workerNumber?.toLowerCase().includes(searchLower) ||
          cession?.bankOrAgency?.toLowerCase().includes(searchLower) ||
          payment.amount?.toString().includes(searchLower) ||
          payment.status?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Sort by payment date descending
    filtered.sort((a, b) => {
      const dateA = a.paymentDate ? new Date(a.paymentDate) : new Date(0);
      const dateB = b.paymentDate ? new Date(b.paymentDate) : new Date(0);
      return dateB - dateA;
    });

    setFilteredPayments(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
      case 'PAID':
        return '#10b981';
      case 'PENDING':
        return '#f59e0b';
      case 'OVERDUE':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    if (!status) return 'Pending';

    const statusUpper = status.toString().toUpperCase().trim();

    switch (statusUpper) {
      case 'COMPLETED':
      case 'PAID':
      case 'SUCCESS':
      case 'SUCCESSFUL':
        return 'Paid';
      case 'PENDING':
      case 'PROCESSING':
      case 'AWAITING':
        return 'Pending';
      case 'OVERDUE':
      case 'LATE':
      case 'DELAYED':
        return 'Overdue';
      case 'FAILED':
      case 'CANCELLED':
      case 'REJECTED':
        return 'Failed';
      default:
        // Try to capitalize the first letter of the status
        const statusStr = status.toString();
        return statusStr.charAt(0).toUpperCase() + statusStr.slice(1).toLowerCase();
    }
  };

  const renderPaymentItem = ({ item }) => {
    // Find the cession first, then get the client from the cession
    const cession = cessions.find(c => c.id === item.cessionId);
    const client = cession ? clients.find(c => c.id === cession.clientId) : null;
    
    // Calculate payment status
    const paymentStatus = paymentService.calculatePaymentStatus(item);
    const isOverdue = paymentService.isPaymentOverdue(item);

    return (
      <TouchableOpacity
        style={styles.paymentCard}
        onPress={() => {
          // Navigate to cession details
          navigation.navigate('CessionDetail', { 
            cessionId: item.cessionId, 
            clientId: cession?.clientId 
          });
        }}
      >
        <View style={styles.paymentHeader}>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName} numberOfLines={1}>
              {client?.fullName || 'Unknown Client'}
            </Text>
            <Text style={styles.cessionInfo} numberOfLines={1}>
              {cession?.bankOrAgency || 'Unknown Cession'}
            </Text>
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.amount}>
              {item.amount?.toFixed(3) || '0.000'} TND
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(paymentStatus) }]}>
              <Text style={styles.statusText}>
                {getStatusText(paymentStatus)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.paymentDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : 'N/A'}
            </Text>
          </View>

          {item.dueDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('payment.details.due')}</Text>
              <Text style={[styles.detailValue, isOverdue && { color: '#ef4444' }]}>
                {new Date(item.dueDate).toLocaleDateString()}
                {isOverdue && ` ${t('payment.details.overdue')}`}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('payment.details.created')}</Text>
            <Text style={styles.detailValue}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAnalytics = () => {
    const analytics = paymentService.calculatePaymentAnalytics(payments);

    return (
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{analytics.completedPayments}</Text>
          <Text style={styles.statLabel}>{t('payment.stats.paid')}</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{analytics.pendingPayments}</Text>
          <Text style={styles.statLabel}>{t('payment.stats.pending')}</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{analytics.overduePayments}</Text>
          <Text style={styles.statLabel}>{t('payment.stats.overdue')}</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{analytics.paymentSuccessRate?.toFixed(0) || '0'}%</Text>
          <Text style={styles.statLabel}>{t('payment.stats.success')}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <LoadingSpinner text={t('common.loading')} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ErrorMessage
          message={error}
          onRetry={loadData}
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
            <Text style={styles.headerTitle}>Payments</Text>
            <Text style={styles.headerSubtitle}>{filteredPayments.length} total</Text>
          </View>
        </View>

        {/* Analytics Summary */}
        {renderAnalytics()}

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <SearchBar
            placeholder={t('payment.search_placeholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Payments List */}
        <FlatList
          data={filteredPayments}
          renderItem={renderPaymentItem}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366f1"
              colors={['#6366f1', '#8b5cf6']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { textAlign: getTextAlign() }]}>
                {searchQuery ? t('payment.no_payments_search') : t('payment.no_payments_available')}
              </Text>
            </View>
          }
          contentContainerStyle={filteredPayments.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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

  // ==================== STATS BAR ====================
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(6),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.6)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: wp(5.5),
    fontWeight: '800',
    color: '#6366f1',
    marginBottom: hp(0.3),
  },
  statLabel: {
    fontSize: wp(3),
    color: '#64748b',
    fontWeight: '600',
  },

  // ==================== SEARCH SECTION ====================
  searchSection: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },

  // ==================== PAYMENT CARDS ====================
  listContent: {
    paddingHorizontal: wp(6),
    paddingTop: hp(1),
    paddingBottom: hp(3),
  },
  paymentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: wp(4),
    padding: wp(4),
    marginBottom: hp(1.5),
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(1.5),
  },
  clientInfo: {
    flex: 1,
    marginRight: wp(2),
  },
  clientName: {
    fontSize: wp(4.2),
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: hp(0.5),
  },
  cessionInfo: {
    fontSize: wp(3.5),
    color: '#64748b',
    fontWeight: '500',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: wp(4.8),
    fontWeight: '800',
    color: '#10b981',
    marginBottom: hp(0.5),
  },
  statusBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: wp(2),
  },
  statusText: {
    color: '#fff',
    fontSize: wp(3),
    fontWeight: '700',
  },
  paymentDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.6)',
    paddingTop: hp(1),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(0.5),
  },
  detailLabel: {
    fontSize: wp(3.5),
    color: '#64748b',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: wp(3.5),
    color: '#0f172a',
    fontWeight: '600',
  },

  // ==================== EMPTY STATE ====================
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: hp(10),
  },
  emptyText: {
    fontSize: wp(4.5),
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default PaymentsScreen;