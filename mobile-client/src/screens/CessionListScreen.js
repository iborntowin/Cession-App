import React, { useState, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  RefreshControl, 
  Text,
  TouchableOpacity 
} from 'react-native';
import CessionCard from '../components/CessionCard';
import SearchBar from '../components/SearchBar';
import FilterModal from '../components/FilterModal';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ConnectivityIndicator from '../components/ConnectivityIndicator';
import DatabaseStatusCard from '../components/DatabaseStatusCard';
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
  const [showStatusCard, setShowStatusCard] = useState(false);
  const [filters, setFilters] = useState({
    status: 'ALL',
    sortBy: 'id',
    sortOrder: 'desc'
  });

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

    // Apply status filter
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(cession => cession.status === filters.status);
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

  const handleStatusCardRefresh = async () => {
    await loadData();
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
      
      {showStatusCard && (
        <DatabaseStatusCard onRefresh={handleStatusCardRefresh} />
      )}
      
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search cessions..."
          style={styles.searchBar}
        />
        <TouchableOpacity style={styles.filterButton} onPress={handleShowFilters}>
          <Text style={styles.filterButtonText}>🔽</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.statusButton} 
          onPress={() => setShowStatusCard(!showStatusCard)}
        >
          <Text style={styles.statusButtonText}>📊</Text>
        </TouchableOpacity>
      </View>
      
      {/* Active filters indicator */}
      {(filters.status !== 'ALL' || filters.sortBy !== 'id' || filters.sortOrder !== 'desc') && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersText}>
            Filters: {filters.status !== 'ALL' ? `Status: ${filters.status}` : ''} 
            {filters.sortBy !== 'id' ? ` | Sort: ${filters.sortBy}` : ''}
            {filters.sortOrder !== 'desc' ? ` (${filters.sortOrder})` : ''}
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
          <Text style={styles.statNumber}>{filteredCessions.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {filteredCessions.filter(c => c.status === 'ACTIVE').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {filteredCessions.filter(c => c.status === 'COMPLETED').length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {filteredCessions.filter(c => c.status === 'OVERDUE').length}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
  },
  filterButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e3f2fd',
    borderBottomWidth: 1,
    borderBottomColor: '#bbdefb',
  },
  activeFiltersText: {
    fontSize: 14,
    color: '#1976d2',
    flex: 1,
  },
  clearFiltersButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default CessionListScreen;