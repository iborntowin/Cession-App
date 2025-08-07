import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { wp, hp, rf, RESPONSIVE_STYLES } from '../utils/responsive';

const CessionCard = ({ cession, client, onPress }) => {
  // Translation hook
  const { t, formatCurrency, formatDate, isRTL } = useTranslation();

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return '#4CAF50';
      case 'COMPLETED':
        return '#2196F3';
      case 'FINISHED':
        return '#2196F3'; // Same color as completed
      case 'OVERDUE':
        return '#FF5722';
      default:
        return '#757575';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'ACTIVE':
        return t('cession.status.active') || 'Active';
      case 'COMPLETED':
        return t('cession.status.completed') || 'Completed';
      case 'FINISHED':
        return t('cession.status.completed') || 'Completed'; // Treat FINISHED as completed
      case 'OVERDUE':
        return t('cession.status.overdue') || 'Overdue';
      default:
        return status || 'Unknown'; // Ensure we always return a string
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return '#4CAF50';
    if (progress >= 50) return '#FF9800';
    return '#2196F3';
  };

  const isOverdue = () => {
    if (!cession.expectedPayoffDate) return false;
    const today = new Date();
    const payoffDate = new Date(cession.expectedPayoffDate);
    return today > payoffDate && cession.status === 'ACTIVE';
  };

  const handlePress = () => {
    if (onPress) {
      onPress(cession);
    }
  };

  // Safe text rendering helper with debugging
  const safeText = (text, fallback = '', debugLabel = '') => {
    if (text === null || text === undefined || text === '') {
      if (debugLabel) console.log(`SafeText fallback used for ${debugLabel}:`, text);
      return fallback;
    }
    const result = String(text);
    if (debugLabel && (!result || result === 'null' || result === 'undefined')) {
      console.log(`SafeText potential issue for ${debugLabel}:`, text, 'result:', result);
    }
    return result;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      {/* Client Info Header (when available) */}
              {client && (
        <View style={styles.clientHeader}>
          <Text style={styles.clientName}>{safeText(client.fullName, 'Unknown Client', 'clientName')}</Text>
          <Text style={styles.clientNumber}>#{safeText(client.clientNumber, 'N/A', 'clientNumber')}</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(cession.status) }]} />
          <Text style={styles.status}>{getStatusText(cession.status)}</Text>
        </View>
        <Text style={styles.monthlyPayment}>
          {safeText(formatCurrency(cession.monthlyPayment || 0), '0', 'monthlyPayment')}/{safeText(t('common.month'), 'month', 'common.month')}
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>
            {safeText(t('cession.progress'), 'Progress', 'cession.progress')}: {safeText((cession.currentProgress || 0).toFixed(1), '0.0', 'currentProgress')}%
          </Text>
          {isOverdue() && (
            <Text style={styles.overdueText}>{safeText(t('cession.status.overdue'), 'Overdue')}</Text>
          )}
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(cession.currentProgress || 0, 100)}%`,
                backgroundColor: getProgressColor(cession.currentProgress || 0)
              }
            ]}
          />
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          {isRTL() ? (
            <>
              <Text style={styles.valueRTL}>{safeText(formatCurrency(cession.remainingBalance || 0))}</Text>
              <Text style={styles.labelRTL}>{safeText(t('cession.remaining_balance'), 'Remaining Balance')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>{safeText(t('cession.remaining_balance'), 'Remaining Balance')}:</Text>
              <Text style={styles.value}>{safeText(formatCurrency(cession.remainingBalance || 0))}</Text>
            </>
          )}
        </View>
        <View style={styles.detailRow}>
          {isRTL() ? (
            <>
              <Text style={styles.valueRTL}>{safeText(formatCurrency(cession.totalLoanAmount || 0))}</Text>
              <Text style={styles.labelRTL}>{safeText(t('cession.total_loan'), 'Total Loan')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>{safeText(t('cession.total_loan'), 'Total Loan')}:</Text>
              <Text style={styles.value}>{safeText(formatCurrency(cession.totalLoanAmount || 0))}</Text>
            </>
          )}
        </View>
        <View style={styles.detailRow}>
          {isRTL() ? (
            <>
              <Text style={styles.valueRTL}>{safeText(formatDate(cession.startDate), 'N/A')}</Text>
              <Text style={styles.labelRTL}>{safeText(t('cession.start_date'), 'Start Date')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>{safeText(t('cession.start_date'), 'Start Date')}:</Text>
              <Text style={styles.value}>{safeText(formatDate(cession.startDate), 'N/A')}</Text>
            </>
          )}
        </View>
        <View style={styles.detailRow}>
          {isRTL() ? (
            <>
              <Text style={styles.valueRTL}>{safeText(formatDate(cession.expectedPayoffDate), 'N/A')}</Text>
              <Text style={styles.labelRTL}>{safeText(t('cession.expected_payoff'), 'Expected Payoff')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>{safeText(t('cession.expected_payoff'), 'Expected Payoff')}:</Text>
              <Text style={styles.value}>{safeText(formatDate(cession.expectedPayoffDate), 'N/A')}</Text>
            </>
          )}
        </View>
        {cession.bankOrAgency ? (
          <View style={styles.detailRow}>
            {isRTL() ? (
              <>
                <Text style={styles.valueRTL}>{safeText(cession.bankOrAgency, '', 'bankOrAgency')}</Text>
                <Text style={styles.labelRTL}>{safeText(t('cession.bank_agency'), 'Bank/Agency', 'bank_agency')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>{safeText(t('cession.bank_agency'), 'Bank/Agency', 'bank_agency')}:</Text>
                <Text style={styles.value}>{safeText(cession.bankOrAgency, '', 'bankOrAgency')}</Text>
              </>
            )}
          </View>
        ) : null}
        {cession.monthsRemaining ? (
          <View style={styles.detailRow}>
            {isRTL() ? (
              <>
                <Text style={styles.valueRTL}>{safeText(cession.monthsRemaining, '', 'monthsRemaining')}</Text>
                <Text style={styles.labelRTL}>{safeText(t('cession.months_remaining'), 'Months Remaining', 'months_remaining')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>{safeText(t('cession.months_remaining'), 'Months Remaining', 'months_remaining')}:</Text>
                <Text style={styles.value}>{safeText(cession.monthsRemaining, '', 'monthsRemaining')}</Text>
              </>
            )}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: RESPONSIVE_STYLES.card.borderRadius,
    padding: RESPONSIVE_STYLES.card.padding,
    marginVertical: RESPONSIVE_STYLES.card.marginVertical,
    marginHorizontal: RESPONSIVE_STYLES.card.marginHorizontal,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    minHeight: hp(15),
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
    paddingBottom: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexWrap: 'wrap',
  },
  clientName: {
    fontSize: RESPONSIVE_STYLES.subtitle.fontSize,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    minWidth: wp(60),
  },
  clientNumber: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    color: '#666',
    fontWeight: '500',
    marginLeft: wp(2),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
    flexWrap: 'wrap',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: wp(2),
    height: wp(2),
    borderRadius: wp(1),
    marginRight: wp(1.5),
  },
  status: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    fontWeight: '500',
    color: '#333',
  },
  monthlyPayment: {
    fontSize: RESPONSIVE_STYLES.subtitle.fontSize,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'right',
    marginLeft: wp(2),
  },
  progressContainer: {
    marginBottom: hp(1.5),
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.5),
    flexWrap: 'wrap',
  },
  progressText: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    color: '#666',
    flex: 1,
  },
  overdueText: {
    fontSize: RESPONSIVE_STYLES.caption.fontSize,
    color: '#FF5722',
    fontWeight: 'bold',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.3),
    borderRadius: wp(2),
    marginLeft: wp(2),
  },
  progressBar: {
    height: hp(0.8),
    backgroundColor: '#E0E0E0',
    borderRadius: hp(0.4),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: hp(0.4),
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: hp(1.5),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(0.5),
    minHeight: hp(3),
    alignItems: 'center',
  },
  label: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    color: '#666',
    flex: 1,
    flexShrink: 1,
  },
  value: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    color: '#333',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    flexShrink: 1,
  },
  labelRTL: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    color: '#666',
    flex: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
    flexShrink: 1,
  },
  valueRTL: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    color: '#333',
    fontWeight: '500',
    textAlign: 'left',
    flex: 1,
    writingDirection: 'ltr', // Keep numbers LTR
    flexShrink: 1,
  },
});

export default CessionCard;