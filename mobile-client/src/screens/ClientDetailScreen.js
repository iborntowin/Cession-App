import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  Text, 
  StyleSheet, 
  RefreshControl,
  TouchableOpacity 
} from 'react-native';
import { wp, hp, rf, RESPONSIVE_STYLES } from '../utils/responsive';
import CessionCard from '../components/CessionCard';
import ClientAnalytics from '../components/ClientAnalytics';
import StatusIndicator from '../components/StatusIndicator';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ConnectivityIndicator from '../components/ConnectivityIndicator';
import { clientService } from '../services/clientService';
import { useTranslation } from '../hooks/useTranslation';

const ClientDetailScreen = ({ route, navigation }) => {
  const { clientId } = route.params;
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Translation hook
  const { t, formatCurrency, isRTL, getTextAlign } = useTranslation();

  useEffect(() => {
    loadClientDetails();
  }, [clientId]);

  const loadClientDetails = async () => {
    try {
      setError(null);
      
      const data = await clientService.getClientById(clientId);
      setClient(data);
      
      // Set navigation title
      navigation.setOptions({
        title: data.fullName || 'Client Details'
      });
    } catch (err) {
      setError(err.message || 'Failed to load client details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadClientDetails();
  };



  const handleCessionPress = (cession) => {
    navigation.navigate('CessionDetail', { 
      cessionId: cession.id, 
      clientId: clientId 
    });
  };

  if (loading) {
    return <LoadingSpinner text={t('common.loading')} />;
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error} 
        onRetry={loadClientDetails}
      />
    );
  }

  if (!client) {
    return (
      <ErrorMessage 
        message={t('errors.client_not_found')} 
        onRetry={loadClientDetails}
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
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.clientName}>{client.fullName}</Text>
          <Text style={styles.clientNumber}>#{client.clientNumber}</Text>
        </View>
        
        <View style={styles.detailsGrid}>
          <View style={[styles.detailItem, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
              {t('client.cin')}{isRTL() ? '؛' : ':'}
            </Text>
            <Text style={[styles.detailValue, { textAlign: isRTL() ? 'left' : 'right' }]}>{client.cin}</Text>
          </View>
          <View style={[styles.detailItem, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
              {t('client.worker_number')}{isRTL() ? '؛' : ':'}
            </Text>
            <Text style={[styles.detailValue, { textAlign: isRTL() ? 'left' : 'right' }]}>{client.workerNumber}</Text>
          </View>
          {client.workplace && (
            <View style={[styles.detailItem, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
                {t('client.workplace')}{isRTL() ? '؛' : ':'}
              </Text>
              <Text style={[styles.detailValue, { textAlign: isRTL() ? 'left' : 'right' }]}>{client.workplace.name}</Text>
            </View>
          )}
          {client.phoneNumber && (
            <View style={[styles.detailItem, { flexDirection: isRTL() ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.detailLabel, { textAlign: getTextAlign() }]}>
                {t('client.phone')}{isRTL() ? '؛' : ':'}
              </Text>
              <Text style={[styles.detailValue, { textAlign: isRTL() ? 'left' : 'right' }]}>{client.phoneNumber}</Text>
            </View>
          )}
        </View>


      </View>

      {/* Cessions Summary */}
      {client.cessions && client.cessions.length > 0 && (
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryTitle, { textAlign: getTextAlign() }]}>{t('summary.overview')}</Text>

          {/* Summary Stats Grid */}
          <View style={styles.summaryStatsContainer}>
            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStatCard}>
                <View style={styles.statIconContainer}>
                  <Text style={styles.statIcon}>📊</Text>
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statNumber}>{client.cessions.length}</Text>
                  <Text style={[styles.statLabel, { textAlign: getTextAlign() }]}>{t('summary.total_cessions')}</Text>
                </View>
              </View>

              <View style={styles.summaryStatCard}>
                <View style={styles.statIconContainer}>
                  <Text style={styles.statIcon}>🔄</Text>
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statNumber}>
                    {client.cessions.filter(c => c.status === 'ACTIVE').length}
                  </Text>
                  <Text style={[styles.statLabel, { textAlign: getTextAlign() }]}>{t('summary.active')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStatCard}>
                <View style={styles.statIconContainer}>
                  <Text style={styles.statIcon}>✅</Text>
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statNumber}>
                    {client.cessions.filter(c => c.status === 'COMPLETED').length}
                  </Text>
                  <Text style={[styles.statLabel, { textAlign: getTextAlign() }]}>{t('summary.completed')}</Text>
                </View>
              </View>

              <View style={styles.summaryStatCard}>
                <View style={styles.statIconContainer}>
                  <Text style={styles.statIcon}>💰</Text>
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statNumber}>
                    {formatCurrency(client.cessions.reduce((sum, c) => sum + (c.monthlyPayment || 0), 0))}
                  </Text>
                  <Text style={[styles.statLabel, { textAlign: getTextAlign() }]}>{t('summary.total_monthly')}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Client Analytics */}
      <View style={styles.analyticsSection}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign() }]}>
          {t('analytics.client_analytics')}
        </Text>
        <ClientAnalytics clientId={clientId} navigation={navigation} />
      </View>

      {/* Cessions Section */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign() }]}>
          {t('client.cessions_count', { count: client.cessions?.length || 0 })}
        </Text>
        {client.cessions && client.cessions.length > 1 && (
          <Text style={[styles.sectionSubtitle, { textAlign: getTextAlign() }]}>{t('client.tap_to_view')}</Text>
        )}
      </View>

      {client.cessions && client.cessions.length > 0 ? (
        client.cessions.map((cession, index) => (
          <CessionCard 
            key={cession.id || index} 
            cession={cession} 
            onPress={handleCessionPress}
          />
        ))
      ) : (
        <View style={styles.emptyCessions}>
          <Text style={[styles.emptyText, { textAlign: 'center' }]}>{t('client.no_cessions')}</Text>
        </View>
      )}
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
  headerCard: {
    backgroundColor: '#fff',
    marginHorizontal: wp(4),
    marginVertical: hp(2),
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
    flexWrap: 'wrap',
  },
  clientName: {
    fontSize: rf(22),
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    minWidth: wp(60),
  },
  clientNumber: {
    fontSize: RESPONSIVE_STYLES.subtitle.fontSize,
    color: '#666',
    fontWeight: '500',
    marginLeft: wp(2),
  },
  detailsGrid: {
    marginBottom: hp(2),
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
    minHeight: hp(4),
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
    flex: 1,
    textAlign: 'right',
    flexShrink: 1,
  },
  sectionHeader: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
  },
  sectionTitle: {
    fontSize: RESPONSIVE_STYLES.title.fontSize,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    color: '#666',
    marginTop: hp(0.5),
    fontStyle: 'italic',
  },
  summaryCard: {
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
  summaryTitle: {
    fontSize: RESPONSIVE_STYLES.title.fontSize,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: hp(3),
  },
  summaryStatsContainer: {
    marginTop: hp(1),
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  summaryStatCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: RESPONSIVE_STYLES.card.borderRadius,
    padding: wp(4),
    marginHorizontal: wp(1),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    minHeight: hp(10),
  },
  statIconContainer: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  statIcon: {
    fontSize: rf(16),
    color: '#fff',
  },
  statContent: {
    flex: 1,
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: rf(20),
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: hp(0.5),
  },
  statLabel: {
    fontSize: rf(12),
    color: '#666',
    fontWeight: '500',
    lineHeight: hp(1.8),
  },
  emptyCessions: {
    backgroundColor: '#fff',
    marginHorizontal: wp(4),
    marginVertical: hp(2),
    paddingHorizontal: wp(10),
    paddingVertical: hp(5),
    borderRadius: RESPONSIVE_STYLES.card.borderRadius,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: RESPONSIVE_STYLES.subtitle.fontSize,
    color: '#666',
    textAlign: 'center',
    lineHeight: hp(3),
  },
  analyticsSection: {
    backgroundColor: '#fff',
    marginHorizontal: wp(4),
    marginVertical: hp(2),
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
});

export default ClientDetailScreen;