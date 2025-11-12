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
import { wp, hp, rf, RESPONSIVE_STYLES } from '../utils/responsive';
import ClientCard from '../components/ClientCard';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ConnectivityIndicator from '../components/ConnectivityIndicator';
import { clientService } from '../services/clientService';
import { useTranslation } from '../hooks/useTranslation';

const { width, height } = Dimensions.get('window');

const ClientListScreen = ({ navigation }) => {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Translation hook
  const { t, isRTL, getTextAlign } = useTranslation();

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchQuery]);

  const loadClients = async () => {
    try {
      setError(null);
      
      const data = await clientService.getAllClients();
      setClients(data);
    } catch (err) {
      // Handle different types of errors appropriately
      if (err.name === 'CacheError') {
        // Cache errors should not prevent the app from working
        console.warn('Cache error occurred but continuing:', err.message);
        // Try to get data without caching
        try {
          const data = await clientService.getAllClients();
          setClients(data);
          return;
        } catch (fallbackErr) {
          setError('Unable to load client data. Please check your connection.');
        }
      } else {
        setError(err.message || 'Failed to load clients');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterClients = () => {
    let filtered = [...clients];

    // Apply search filter - only by name, CIN, and worker number
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client => 
        client.fullName?.toLowerCase().includes(query) ||
        client.cin?.toLowerCase().includes(query) ||
        client.workerNumber?.toLowerCase().includes(query)
      );
    }

    // Sort by name alphabetically
    filtered.sort((a, b) => {
      const aValue = a.fullName?.toLowerCase() || '';
      const bValue = b.fullName?.toLowerCase() || '';
      return aValue.localeCompare(bValue);
    });

    setFilteredClients(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadClients();
  };

  const handleClientPress = (client) => {
    navigation.navigate('ClientDetail', { clientId: client.id });
  };

  const renderClient = ({ item }) => (
    <ClientCard 
      client={item} 
      onPress={() => handleClientPress(item)} 
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyText, { textAlign: getTextAlign() }]}>
        {searchQuery ? t('client.no_clients_search') : t('client.no_clients_available')}
      </Text>
      {!searchQuery && (
        <View style={styles.emptyStateActions}>
          <Text style={[styles.emptySubText, { textAlign: 'center' }]}>
            {t('client.check_connection_or_sync')}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

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
          onRetry={loadClients}
          showDetails={true}
          details={`Error details: ${error}\n\nThis usually happens when:\n1. No data has been exported yet\n2. Network connection issues\n3. Supabase storage is not accessible\n\nTry refreshing from the Export tab.`}
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
        <ConnectivityIndicator onRefresh={handleRefresh} />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Clients</Text>
            <Text style={styles.headerSubtitle}>{filteredClients.length} total</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('client.search_placeholder')}
          />
        </View>

        <FlatList
          data={filteredClients}
          renderItem={renderClient}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#6366f1"
              colors={['#6366f1', '#8b5cf6']}
            />
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={filteredClients.length === 0 ? styles.emptyContainer : styles.listContent}
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

  // ==================== SEARCH SECTION ====================
  searchSection: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },

  // ==================== LIST ====================
  listContent: {
    paddingHorizontal: wp(6),
    paddingTop: hp(1),
    paddingBottom: hp(3),
  },
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
    lineHeight: hp(3),
    marginBottom: hp(2),
    fontWeight: '600',
  },
  emptyStateActions: {
    alignItems: 'center',
    marginTop: hp(2),
  },
  emptySubText: {
    fontSize: wp(3.8),
    color: '#94a3b8',
    marginBottom: hp(2),
    paddingHorizontal: wp(4),
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: wp(8),
    paddingVertical: hp(1.8),
    borderRadius: wp(3),
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: wp(4),
    fontWeight: '700',
  },
});

export default ClientListScreen;