import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  Text, 
  StyleSheet, 
  RefreshControl,
  TouchableOpacity 
} from 'react-native';
import CessionCard from '../components/CessionCard';
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
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{client.cessions.length}</Text>
              <Text style={[styles.summaryLabel, { textAlign: 'center' }]}>{t('summary.total_cessions')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {client.cessions.filter(c => c.status === 'ACTIVE').length}
              </Text>
              <Text style={[styles.summaryLabel, { textAlign: 'center' }]}>{t('summary.active')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {client.cessions.filter(c => c.status === 'COMPLETED').length}
              </Text>
              <Text style={[styles.summaryLabel, { textAlign: 'center' }]}>{t('summary.completed')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {formatCurrency(client.cessions.reduce((sum, c) => sum + (c.monthlyPayment || 0), 0))}
              </Text>
              <Text style={[styles.summaryLabel, { textAlign: 'center' }]}>{t('summary.total_monthly')}</Text>
            </View>
          </View>
        </View>
      )}

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
    margin: 16,
    borderRadius: 12,
    padding: 20,
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
    marginBottom: 16,
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  clientNumber: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  detailsGrid: {
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },

  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyCessions: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 40,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default ClientDetailScreen;