import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';

const CessionCard = ({ cession, client, onPress }) => {
  // Translation hook
  const { t, formatCurrency, formatDate, isRTL } = useTranslation();

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

  const getStatusText = (status) => {
    switch (status) {
      case 'ACTIVE':
        return t('cession.status.active');
      case 'COMPLETED':
        return t('cession.status.completed');
      case 'OVERDUE':
        return t('cession.status.overdue');
      default:
        return status;
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

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      {/* Client Info Header (when available) */}
      {client && (
        <View style={styles.clientHeader}>
          <Text style={styles.clientName}>{client.fullName}</Text>
          <Text style={styles.clientNumber}>#{client.clientNumber}</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(cession.status) }]} />
          <Text style={styles.status}>{getStatusText(cession.status)}</Text>
        </View>
        <Text style={styles.monthlyPayment}>{formatCurrency(cession.monthlyPayment)}/{t('common.month')}</Text>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>{t('cession.progress')}: {cession.currentProgress?.toFixed(1) || 0}%</Text>
          {isOverdue() && (
            <Text style={styles.overdueText}>{t('cession.status.overdue')}</Text>
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
              <Text style={styles.valueRTL}>{formatCurrency(cession.remainingBalance || 0)}</Text>
              <Text style={styles.labelRTL}>{t('cession.remaining_balance')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>{t('cession.remaining_balance')}:</Text>
              <Text style={styles.value}>{formatCurrency(cession.remainingBalance || 0)}</Text>
            </>
          )}
        </View>
        <View style={styles.detailRow}>
          {isRTL() ? (
            <>
              <Text style={styles.valueRTL}>{formatCurrency(cession.totalLoanAmount || 0)}</Text>
              <Text style={styles.labelRTL}>{t('cession.total_loan')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>{t('cession.total_loan')}:</Text>
              <Text style={styles.value}>{formatCurrency(cession.totalLoanAmount || 0)}</Text>
            </>
          )}
        </View>
        <View style={styles.detailRow}>
          {isRTL() ? (
            <>
              <Text style={styles.valueRTL}>{formatDate(cession.startDate) || 'N/A'}</Text>
              <Text style={styles.labelRTL}>{t('cession.start_date')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>{t('cession.start_date')}:</Text>
              <Text style={styles.value}>{formatDate(cession.startDate) || 'N/A'}</Text>
            </>
          )}
        </View>
        <View style={styles.detailRow}>
          {isRTL() ? (
            <>
              <Text style={styles.valueRTL}>{formatDate(cession.expectedPayoffDate) || 'N/A'}</Text>
              <Text style={styles.labelRTL}>{t('cession.expected_payoff')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>{t('cession.expected_payoff')}:</Text>
              <Text style={styles.value}>{formatDate(cession.expectedPayoffDate) || 'N/A'}</Text>
            </>
          )}
        </View>
        {cession.bankOrAgency && (
          <View style={styles.detailRow}>
            {isRTL() ? (
              <>
                <Text style={styles.valueRTL}>{cession.bankOrAgency}</Text>
                <Text style={styles.labelRTL}>{t('cession.bank_agency')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>{t('cession.bank_agency')}:</Text>
                <Text style={styles.value}>{cession.bankOrAgency}</Text>
              </>
            )}
          </View>
        )}
        {cession.monthsRemaining && (
          <View style={styles.detailRow}>
            {isRTL() ? (
              <>
                <Text style={styles.valueRTL}>{cession.monthsRemaining}</Text>
                <Text style={styles.labelRTL}>{t('cession.months_remaining')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>{t('cession.months_remaining')}:</Text>
                <Text style={styles.value}>{cession.monthsRemaining}</Text>
              </>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  clientNumber: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  monthlyPayment: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  overdueText: {
    fontSize: 12,
    color: '#FF5722',
    fontWeight: 'bold',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  labelRTL: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  valueRTL: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'left',
    flex: 1,
    writingDirection: 'ltr', // Keep numbers LTR
  },
});

export default CessionCard;