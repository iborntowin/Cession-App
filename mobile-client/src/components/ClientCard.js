import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';

const ClientCard = ({ client, onPress }) => {
  // Translation hook
  const { t, formatCurrency, isRTL, getTextAlign } = useTranslation();

  const getActiveCessions = () => {
    return client.cessions?.filter(c => c.status === 'ACTIVE') || [];
  };

  const getTotalRemainingBalance = () => {
    return client.cessions?.reduce((sum, c) => sum + (c.remainingBalance || 0), 0) || 0;
  };

  const activeCessions = getActiveCessions();
  const totalBalance = getTotalRemainingBalance();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{client.fullName}</Text>
        <Text style={styles.clientNumber}>#{client.clientNumber}</Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          {isRTL() ? (
            <>
              <Text style={styles.valueRTL}>{client.cin}</Text>
              <Text style={styles.labelRTL}>{t('client.cin')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>{t('client.cin')}:</Text>
              <Text style={styles.value}>{client.cin}</Text>
            </>
          )}
        </View>
        <View style={styles.detailRow}>
          {isRTL() ? (
            <>
              <Text style={styles.valueRTL}>{client.workerNumber}</Text>
              <Text style={styles.labelRTL}>{t('client.worker_number')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>{t('client.worker_number')}:</Text>
              <Text style={styles.value}>{client.workerNumber}</Text>
            </>
          )}
        </View>
        {client.workplace && (
          <View style={styles.detailRow}>
            {isRTL() ? (
              <>
                <Text style={styles.valueRTL} numberOfLines={1}>{client.workplace.name}</Text>
                <Text style={styles.labelRTL}>{t('client.workplace')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>{t('client.workplace')}:</Text>
                <Text style={styles.value} numberOfLines={1}>{client.workplace.name}</Text>
              </>
            )}
          </View>
        )}
        {client.job && (
          <View style={styles.detailRow}>
            {isRTL() ? (
              <>
                <Text style={styles.valueRTL} numberOfLines={1}>{client.job.name}</Text>
                <Text style={styles.labelRTL}>{t('client.job')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>{t('client.job')}:</Text>
                <Text style={styles.value} numberOfLines={1}>{client.job.name}</Text>
              </>
            )}
          </View>
        )}
        {client.phoneNumber && (
          <View style={styles.detailRow}>
            {isRTL() ? (
              <>
                <Text style={styles.valueRTL}>{client.phoneNumber}</Text>
                <Text style={styles.labelRTL}>{t('client.phone')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>{t('client.phone')}:</Text>
                <Text style={styles.value}>{client.phoneNumber}</Text>
              </>
            )}
          </View>
        )}
      </View>

      {client.cessions && client.cessions.length > 0 && (
        <View style={styles.cessionInfo}>
          <View style={styles.cessionSummary}>
            <View style={styles.cessionStats}>
              <Text style={[styles.cessionCount, { textAlign: getTextAlign() }]}>
                {t('client.cessions_count', { count: client.cessions.length })}
              </Text>
              {activeCessions.length > 0 && (
                <Text style={styles.activeCessions}>
                  {activeCessions.length} {t('summary.active').toLowerCase()}
                </Text>
              )}
            </View>
            {totalBalance > 0 && (
              <Text style={[styles.totalBalance, { textAlign: isRTL() ? 'left' : 'right' }]}>
                {formatCurrency(totalBalance)} {t('cession.remaining_balance').toLowerCase()}
              </Text>
            )}
          </View>
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  clientNumber: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  details: {
    marginBottom: 8,
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
  cessionInfo: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  cessionSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cessionStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cessionCount: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 8,
  },
  activeCessions: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  totalBalance: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
  },
});

export default ClientCard;