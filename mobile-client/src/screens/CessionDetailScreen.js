import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  Text, 
  StyleSheet, 
  RefreshControl,
  TouchableOpacity 
} from 'react-native';
import { wp, hp, rf, RESPONSIVE_STYLES, isSmallDevice } from '../utils/responsive';
import StatusIndicator from '../components/StatusIndicator';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ConnectivityIndicator from '../components/ConnectivityIndicator';
import { clientService } from '../services/clientService';
import { useTranslation } from '../hooks/useTranslation';

const CessionDetailScreen = ({ route, navigation }) => {
  const { cessionId, clientId } = route.params;
  const [cession, setCession] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Translation hook
  const { t, formatCurrency, formatDate, isRTL, getTextAlign } = useTranslation();

  useEffect(() => {
    loadCessionDetails();
  }, [cessionId, clientId]);

  const loadCessionDetails = async () => {
    try {
      setError(null);
      
      // Get client data to find the specific cession
      const clientData = await clientService.getClientById(clientId);
      setClient(clientData);
      
      // Find the specific cession
      const cessionData = clientData.cessions?.find(c => c.id === cessionId);
      if (!cessionData) {
        throw new Error('Cession not found');
      }
      
      setCession(cessionData);
      
      // Set navigation title
      navigation.setOptions({
        title: `Cession Details`
      });
    } catch (err) {
      setError(err.message || 'Failed to load cession details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCessionDetails();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return '#4CAF50';
      case 'COMPLETED':
        return '#2196F3';
      case 'OVERDUE':
        return '#FF5722';
      default:
        return '#757575';
    }
  };

  // Remove duplicate functions - using translation hook versions

  const calculatePaidAmount = () => {
    if (!cession) return 0;
    return (cession.totalLoanAmount || 0) - (cession.remainingBalance || 0);
  };

  const calculateMonthsPaid = () => {
    if (!cession) return 0;
    
    // Calculate months paid based on current progress
    // Assuming 18 months total duration
    const totalMonths = 18;
    const progressPercent = cession.currentProgress || 0;
    
    // Convert progress percentage to months paid
    return (progressPercent / 100) * totalMonths;
  };

  if (loading) {
    return <LoadingSpinner text={t('common.loading')} />;
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error} 
        onRetry={loadCessionDetails}
      />
    );
  }

  if (!cession) {
    return (
      <ErrorMessage 
        message={t('errors.cession_not_found')} 
        onRetry={loadCessionDetails}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ConnectivityIndicator onRefresh={handleRefresh} />
      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
          />
        }
      >
        {/* Client Info Header */}
      {client && (
        <View style={styles.clientCard}>
          <Text style={styles.clientName}>{client.fullName}</Text>
          <Text style={styles.clientNumber}>Client #{client.clientNumber}</Text>
        </View>
      )}

      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(cession.status) }]} />
            <Text style={styles.statusText}>{cession.status}</Text>
          </View>
          <Text style={styles.monthlyPayment}>{formatCurrency(cession.monthlyPayment)}/month</Text>
        </View>
        
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Progress: {cession.currentProgress?.toFixed(1) || 0}%
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.min(cession.currentProgress || 0, 100)}%` }
              ]} 
            />
          </View>
        </View>
      </View>

      {/* Financial Details */}
      <View style={styles.detailsCard}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign() }]}>{t('cession.details')}</Text>
        
        <View style={[styles.detailRow, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
            {t('cession.total_loan')}{isRTL() ? '؛' : ':'}
          </Text>
          <Text style={[styles.detailValue, { textAlign: isRTL() ? 'left' : 'right' }]}>{formatCurrency(cession.totalLoanAmount)}</Text>
        </View>
        
        <View style={[styles.detailRow, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
            {t('cession.amount_paid')}{isRTL() ? '؛' : ':'}
          </Text>
          <Text style={[styles.detailValue, styles.paidAmount, { textAlign: isRTL() ? 'left' : 'right' }]}>
            {formatCurrency(calculatePaidAmount())}
          </Text>
        </View>
        
        <View style={[styles.detailRow, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
            {t('cession.remaining_balance')}{isRTL() ? '؛' : ':'}
          </Text>
          <Text style={[styles.detailValue, styles.remainingAmount, { textAlign: isRTL() ? 'left' : 'right' }]}>
            {formatCurrency(cession.remainingBalance)}
          </Text>
        </View>
        
        <View style={[styles.detailRow, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
            {t('cession.monthly_payment')}{isRTL() ? '؛' : ':'}
          </Text>
          <Text style={[styles.detailValue, { textAlign: isRTL() ? 'left' : 'right' }]}>{formatCurrency(cession.monthlyPayment)}</Text>
        </View>
      </View>

      {/* Timeline Details */}
      <View style={styles.detailsCard}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign() }]}>Timeline</Text>
        
        <View style={[styles.detailRow, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
            {t('cession.start_date')}{isRTL() ? '؛' : ':'}
          </Text>
          <Text style={[styles.detailValue, { textAlign: isRTL() ? 'left' : 'right' }]}>{formatDate(cession.startDate) || 'N/A'}</Text>
        </View>
        
        <View style={[styles.detailRow, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
            {t('cession.end_date')}{isRTL() ? '؛' : ':'}
          </Text>
          <Text style={[styles.detailValue, { textAlign: isRTL() ? 'left' : 'right' }]}>{formatDate(cession.endDate) || 'N/A'}</Text>
        </View>
        
        <View style={[styles.detailRow, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
            {t('cession.expected_payoff')}{isRTL() ? '؛' : ':'}
          </Text>
          <Text style={[styles.detailValue, { textAlign: isRTL() ? 'left' : 'right' }]}>{formatDate(cession.expectedPayoffDate) || 'N/A'}</Text>
        </View>
        
        {cession.monthsRemaining && (
          <View style={[styles.detailRow, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
              {t('cession.months_remaining')}{isRTL() ? '؛' : ':'}
            </Text>
            <Text style={[styles.detailValue, { textAlign: isRTL() ? 'left' : 'right' }]}>{cession.monthsRemaining}</Text>
          </View>
        )}
      </View>

      {/* Payment Tracker */}
      <View style={styles.detailsCard}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign() }]}>{t('payment_tracker.title')}</Text>
        
        {/* Progress Summary */}
        <View style={styles.trackerSummary}>
          <Text style={[styles.trackerText, { textAlign: getTextAlign() }]}>
            {t('payment_tracker.months_paid', { count: calculateMonthsPaid().toFixed(2) })}
          </Text>
          {calculateMonthsPaid() < 18 && (
            <Text style={[styles.trackerText, { textAlign: isRTL() ? 'left' : 'right' }]}>
              {t('payment_tracker.months_left', { count: (18 - calculateMonthsPaid()).toFixed(2) })}
            </Text>
          )}
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.min((calculateMonthsPaid() / 18) * 100, 100)}%` }
              ]} 
            />
          </View>
        </View>
        
        {/* Monthly Grid */}
        <View style={styles.monthGrid}>
          {Array.from({ length: 18 }, (_, i) => {
            const monthNumber = i + 1;
            const monthsPaid = calculateMonthsPaid();
            const isFullyPaid = monthNumber <= Math.floor(monthsPaid);
            const isPartiallyPaid = monthNumber === Math.floor(monthsPaid) + 1 && monthsPaid % 1 > 0;
            
            return (
              <View key={i} style={[
                styles.monthBox,
                isFullyPaid ? styles.monthBoxPaid : 
                isPartiallyPaid ? styles.monthBoxPartial : 
                styles.monthBoxUnpaid
              ]}>
                <Text style={[
                  styles.monthLabel,
                  isFullyPaid ? styles.monthLabelPaid : 
                  isPartiallyPaid ? styles.monthLabelPartial : 
                  styles.monthLabelUnpaid
                ]}>
                  {t('payment_tracker.month', { number: monthNumber })}
                </Text>
                <Text style={[
                  styles.monthStatus,
                  isFullyPaid ? styles.monthStatusPaid : 
                  isPartiallyPaid ? styles.monthStatusPartial : 
                  styles.monthStatusUnpaid
                ]}>
                  {isFullyPaid ? '✔' : isPartiallyPaid ? '◐' : '—'}
                </Text>
              </View>
            );
          })}
        </View>
        
        {calculateMonthsPaid() >= 18 && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>{t('payment_tracker.fully_paid')}</Text>
          </View>
        )}
      </View>

      {/* Additional Information */}
      <View style={styles.detailsCard}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign() }]}>Additional Information</Text>
        
        {cession.bankOrAgency && (
          <View style={[styles.detailRow, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
              {t('cession.bank_agency')}{isRTL() ? '؛' : ':'}
            </Text>
            <Text style={[styles.detailValue, { textAlign: isRTL() ? 'left' : 'right' }]}>{cession.bankOrAgency}</Text>
          </View>
        )}
        
        <View style={[styles.detailRow, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
            Cession ID{isRTL() ? '؛' : ':'}
          </Text>
          <Text style={[styles.detailValue, { textAlign: isRTL() ? 'left' : 'right' }]}>{cession.id}</Text>
        </View>
      </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  clientCard: {
    backgroundColor: '#fff',
    marginHorizontal: wp(4),
    marginVertical: hp(2),
    marginBottom: hp(1),
    borderRadius: RESPONSIVE_STYLES.card.borderRadius,
    padding: wp(4),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    alignItems: 'center',
  },
  clientName: {
    fontSize: RESPONSIVE_STYLES.title.fontSize,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: hp(0.5),
    textAlign: 'center',
  },
  clientNumber: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    color: '#666',
  },
  statusCard: {
    backgroundColor: '#fff',
    marginHorizontal: wp(4),
    marginVertical: hp(1),
    borderRadius: RESPONSIVE_STYLES.card.borderRadius,
    padding: wp(5),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
    flexWrap: 'wrap',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: wp(3),
    height: wp(3),
    borderRadius: wp(1.5),
    marginRight: wp(2),
  },
  statusText: {
    fontSize: RESPONSIVE_STYLES.subtitle.fontSize,
    fontWeight: '600',
    color: '#333',
  },
  monthlyPayment: {
    fontSize: RESPONSIVE_STYLES.title.fontSize,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'right',
    marginLeft: wp(2),
  },
  progressContainer: {
    marginTop: hp(1),
  },
  progressText: {
    fontSize: RESPONSIVE_STYLES.subtitle.fontSize,
    color: '#666',
    marginBottom: hp(1),
    fontWeight: '500',
  },
  progressBar: {
    height: hp(1),
    backgroundColor: '#E0E0E0',
    borderRadius: hp(0.5),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: hp(0.5),
  },
  detailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: wp(4),
    marginVertical: hp(1),
    borderRadius: RESPONSIVE_STYLES.card.borderRadius,
    padding: wp(5),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: RESPONSIVE_STYLES.title.fontSize,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: hp(2),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: hp(5),
  },
  detailLabel: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    color: '#666',
    flex: 1,
    flexShrink: 1,
  },
  detailValue: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    color: '#333',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    flexShrink: 1,
  },
  paidAmount: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  remainingAmount: {
    color: '#FF5722',
    fontWeight: '600',
  },
  // Payment Tracker Styles
  trackerSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(2),
    flexWrap: 'wrap',
  },
  trackerText: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    color: '#666',
    fontWeight: '500',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: hp(2),
    justifyContent: 'space-between',
  },
  monthBox: {
    width: isSmallDevice() ? wp(13) : wp(15),
    height: isSmallDevice() ? wp(13) : wp(15),
    borderRadius: RESPONSIVE_STYLES.card.borderRadius,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1),
  },
  monthBoxPaid: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  monthBoxPartial: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  monthBoxUnpaid: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  monthLabel: {
    fontSize: rf(9),
    fontWeight: '600',
    marginBottom: hp(0.2),
    textAlign: 'center',
  },
  monthLabelPaid: {
    color: '#2E7D32',
  },
  monthLabelPartial: {
    color: '#F57C00',
  },
  monthLabelUnpaid: {
    color: '#757575',
  },
  monthStatus: {
    fontSize: rf(14),
    fontWeight: 'bold',
  },
  monthStatusPaid: {
    color: '#4CAF50',
  },
  monthStatusPartial: {
    color: '#FF9800',
  },
  monthStatusUnpaid: {
    color: '#BDBDBD',
  },
  completedBanner: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
    borderWidth: 2,
    borderRadius: RESPONSIVE_STYLES.card.borderRadius,
    padding: wp(3),
    marginTop: hp(2),
    alignItems: 'center',
  },
  completedText: {
    fontSize: RESPONSIVE_STYLES.subtitle.fontSize,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
});

export default CessionDetailScreen;