import React, { useState, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  RefreshControl, 
  Text,
  TouchableOpacity 
} from 'react-native';
import { wp, hp, rf, RESPONSIVE_STYLES } from '../utils/responsive';
import CessionCard from '../components/CessionCard';
import SearchBar from '../components/SearchBar';
import FilterModal from '../components/FilterModal';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ConnectivityIndicator from '../components/ConnectivityIndicator';

import { cessionService } from '../services/cessionService';
import { clientService } from '../services/clientService';

const CessionListScreen = ({ navigation }) => {
  const [cessions, setCessions] = useState([]);
  const [clients, setClients] = useState([]);
  const [filteredCessions, setFilteredCessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [filters, setFilters] = useState({
    status: 'ALL',
    sortBy: 'id',
    sortOrder: 'desc'
  });

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
    filterAndSortCessions();
  }, [cessions, clients, searchQuery, filters]);

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

  const filterAndSortCessions = () => {
    let filtered = [...cessions];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(cession => {
        // Find the client for this cession
        const client = clients.find(c => c.id === cession.clientId);
        
        return (
          cession.id?.toString().includes(query) ||
          cession.bankOrAgency?.toLowerCase().includes(query) ||
          cession.status?.toLowerCase().includes(query) ||
          client?.fullName?.toLowerCase().includes(query) ||
          client?.cin?.toLowerCase().includes(query) ||
          client?.clientNumber?.toString().includes(query)
        );
      });
    }

    // Apply status filter with improved logic
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(cession => {
        const filterStatus = filters.status?.toUpperCase();
        
        switch (filterStatus) {
          case 'COMPLETED':
            return isCessionCompleted(cession);
          case 'FINISHED': // Handle FINISHED as completed
            return isCessionCompleted(cession);
          case 'ACTIVE':
            return isCessionActive(cession);
          case 'OVERDUE':
            return isCessionOverdue(cession);
          case 'SUSPENDED':
            const status = cession.status?.toUpperCase();
            return status === 'SUSPENDED' || status === 'SUSPENDU' || status === 'PAUSE';
          case 'CANCELLED':
            const cancelStatus = cession.status?.toUpperCase();
            return cancelStatus === 'CANCELLED' || cancelStatus === 'ANNULE' || cancelStatus === 'CANCEL';
          default:
            return cession.status?.toUpperCase() === filterStatus;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'id':
          aValue = a.id || 0;
          bValue = b.id || 0;
          break;
        case 'clientName':
          const clientA = clients.find(c => c.id === a.clientId);
          const clientB = clients.find(c => c.id === b.clientId);
          aValue = clientA?.fullName?.toLowerCase() || '';
          bValue = clientB?.fullName?.toLowerCase() || '';
          break;
        case 'monthlyPayment':
          aValue = a.monthlyPayment || 0;
          bValue = b.monthlyPayment || 0;
          break;
        case 'remainingBalance':
          aValue = a.remainingBalance || 0;
          bValue = b.remainingBalance || 0;
          break;
        case 'progress':
          aValue = a.currentProgress || 0;
          bValue = b.currentProgress || 0;
          break;
        case 'status':
          aValue = a.status?.toLowerCase() || '';
          bValue = b.status?.toLowerCase() || '';
          break;
        default:
          aValue = a.id || 0;
          bValue = b.id || 0;
      }

      if (typeof aValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      } else {
        return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    setFilteredCessions(filtered);
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const handleShowFilters = () => {
    setShowFilterModal(true);
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
    // Find the client for this cession
    const client = clients.find(c => c.id === item.clientId);
    
    return (
      <CessionCard 
        cession={item} 
        client={client}
        onPress={() => handleCessionPress(item)} 
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>
        {searchQuery ? 'No cessions found matching your search' : 'No cessions available'}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <>
      <ConnectivityIndicator />
      
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search cessions, clients, banks..."
          onFilterPress={handleShowFilters}
          hasActiveFilters={filters.status !== 'ALL' || filters.sortBy !== 'id' || filters.sortOrder !== 'desc'}
        />
      </View>
      
      {/* Active filters indicator */}
      {(filters.status !== 'ALL' || filters.sortBy !== 'id' || filters.sortOrder !== 'desc') && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersText}>
            {`Filters: ${filters.status !== 'ALL' ? `Status: ${filters.status || 'Unknown'}` : ''}${filters.sortBy !== 'id' ? ` | Sort: ${filters.sortBy || 'Unknown'}` : ''}${filters.sortOrder !== 'desc' ? ` (${filters.sortOrder || 'Unknown'})` : ''}`}
          </Text>
          <TouchableOpacity 
            onPress={() => handleApplyFilters({ status: 'ALL', sortBy: 'id', sortOrder: 'desc' })}
            style={styles.clearFiltersButton}
          >
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{String(filteredCessions.length || 0)}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {String(filteredCessions.filter(isCessionActive).length || 0)}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {String(filteredCessions.filter(isCessionCompleted).length || 0)}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {String(filteredCessions.filter(isCessionOverdue).length || 0)}
          </Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </View>
    </>
  );

  if (loading) {
    return <LoadingSpinner text="Loading cessions..." />;
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error} 
        onRetry={loadData}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredCessions}
        renderItem={renderCession}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={filteredCessions.length === 0 ? styles.emptyContainer : null}
      />
      
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        cessionMode={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  activeFiltersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    backgroundColor: '#e3f2fd',
    borderBottomWidth: 1,
    borderBottomColor: '#bbdefb',
    flexWrap: 'wrap',
  },
  activeFiltersText: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    color: '#1976d2',
    flex: 1,
    minWidth: wp(60),
  },
  clearFiltersButton: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    marginLeft: wp(2),
  },
  clearFiltersText: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    color: '#1976d2',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: wp(20),
  },
  statNumber: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: RESPONSIVE_STYLES.caption.fontSize,
    color: '#666',
    marginTop: hp(0.5),
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingVertical: hp(5),
  },
  emptyText: {
    fontSize: RESPONSIVE_STYLES.subtitle.fontSize,
    color: '#666',
    textAlign: 'center',
    lineHeight: hp(3),
  },
});

export default CessionListScreen;