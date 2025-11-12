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
import CessionCard from '../components/CessionCard';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ConnectivityIndicator from '../components/ConnectivityIndicator';

import { cessionService } from '../services/cessionService';
import { clientService } from '../services/clientService';

const { width, height } = Dimensions.get('window');

const CessionListScreen = ({ navigation }) => {
  const [cessions, setCessions] = useState([]);
  const [clients, setClients] = useState([]);
  const [filteredCessions, setFilteredCessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Helper function to determine if a cession is completed
  const isCessionCompleted = (cession) => {
    const status = cession.status?.toUpperCase();
    return status === 'COMPLETED' || status === 'TERMINE' || status === 'FINI' || 
           status === 'COMPLETE' || status === 'FINISHED' || cession.currentProgress >= 100;
  };

  // Helper function to determine if a cession is active
  const isCessionActive = (cession) => {
    const status = cession.status?.toUpperCase();
    return status === 'ACTIVE' || status === 'ACTIF' || status === 'EN_COURS' || 
           status === 'IN_PROGRESS' || (!status && cession.currentProgress < 100);
  };

  // Helper function to determine if a cession is overdue
  const isCessionOverdue = (cession) => {
    const status = cession.status?.toUpperCase();
    return status === 'OVERDUE' || cessionService.isCessionOverdue(cession);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterCessions();
  }, [cessions, clients, searchQuery]);

  const loadData = async () => {
    try {
      setError(null);
      
      // Load both cessions and clients for complete information
      const [cessionsData, clientsData] = await Promise.all([
        cessionService.getAllCessions(),
        clientService.getAllClients()
      ]);
      
      setCessions(cessionsData);
      setClients(clientsData);
      
      // Debug: Log unique statuses to understand the data
      if (cessionsData && cessionsData.length > 0) {
        const uniqueStatuses = [...new Set(cessionsData.map(c => c.status))];
        console.log('🔍 Unique cession statuses found:', uniqueStatuses);
        console.log('📊 Cession status breakdown:', {
          total: cessionsData.length,
          statusCounts: uniqueStatuses.reduce((acc, status) => {
            acc[status] = cessionsData.filter(c => c.status === status).length;
            return acc;
          }, {}),
          progressCounts: {
            completed100: cessionsData.filter(c => c.currentProgress >= 100).length,
            active: cessionsData.filter(c => c.currentProgress < 100).length
          }
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load cessions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterCessions = () => {
    let filtered = [...cessions];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(cession => {
        const client = clients.find(c => c.id === cession.clientId);
        
        return (
          cession.id?.toString().includes(query) ||
          cession.bankOrAgency?.toLowerCase().includes(query) ||
          cession.status?.toLowerCase().includes(query) ||
          client?.fullName?.toLowerCase().includes(query) ||
          client?.cin?.toLowerCase().includes(query)
        );
      });
    }

    // Sort by ID descending
    filtered.sort((a, b) => (b.id || 0) - (a.id || 0));

    setFilteredCessions(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCessionPress = (cession) => {
    navigation.navigate('CessionDetail', { 
      cessionId: cession.id, 
      clientId: cession.clientId 
    });
  };



  const renderCession = ({ item }) => {
    const client = clients.find(c => c.id === item.clientId);
    
    return (
      <CessionCard 
        cession={item} 
        client={client}
        onPress={() => handleCessionPress(item)} 
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <LoadingSpinner text="Loading cessions..." />
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
            <Text style={styles.headerTitle}>Cessions</Text>
            <Text style={styles.headerSubtitle}>{filteredCessions.length} total</Text>
          </View>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{filteredCessions.filter(isCessionActive).length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{filteredCessions.filter(isCessionCompleted).length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{filteredCessions.filter(isCessionOverdue).length}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search cessions, clients, banks..."
          />
        </View>

        <FlatList
          data={filteredCessions}
          renderItem={renderCession}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#6366f1"
              colors={['#6366f1', '#8b5cf6']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No cessions found' : 'No cessions available'}
              </Text>
            </View>
          }
          contentContainerStyle={filteredCessions.length === 0 ? styles.emptyContainer : styles.listContent}
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
    fontWeight: '600',
  },
});

export default CessionListScreen;