import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { wp, hp, rf, RESPONSIVE_STYLES } from '../utils/responsive';

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
          <View style={styles.cessionRow}>
            <Text style={styles.cessionCount} numberOfLines={1}>
              Cessions ({client.cessions.length})
            </Text>
            {activeCessions.length > 0 && (
              <Text style={styles.activeBadge} numberOfLines={1}>
                {activeCessions.length} active
              </Text>
            )}
          </View>
          {totalBalance > 0 && (
            <Text style={styles.balanceText} numberOfLines={1}>
              Balance: {formatCurrency(totalBalance)}
            </Text>
          )}
        </View>
      )}
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
    minHeight: hp(12),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
    flexWrap: 'wrap',
  },
  name: {
    fontSize: RESPONSIVE_STYLES.title.fontSize,
    fontWeight: 'bold',
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
  details: {
    marginBottom: hp(1),
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
  cessionInfo: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: hp(1),
    marginTop: hp(1),
  },
  cessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  cessionCount: {
    fontSize: rf(13),
    color: '#6366f1',
    fontWeight: '600',
    marginRight: wp(2),
  },
  activeBadge: {
    fontSize: rf(11),
    color: '#10b981',
    fontWeight: '600',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: wp(2),
  },
  balanceText: {
    fontSize: rf(13),
    color: '#f59e0b',
    fontWeight: '600',
  },
});

export default ClientCard;