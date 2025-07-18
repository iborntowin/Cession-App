import React, { useState, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  RefreshControl, 
  Text,
  TouchableOpacity 
} from 'react-native';
import ClientCard from '../components/ClientCard';
import SearchBar from '../components/SearchBar';
import FilterModal from '../components/FilterModal';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ConnectivityIndicator from '../components/ConnectivityIndicator';
import { clientService } from '../services/clientService';
import { useTranslation } from '../hooks/useTranslation';

const ClientListScreen = ({ navigation }) => {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'ALL',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Translation hook
  const { t, isRTL, getTextAlign } = useTranslation();

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    filterAndSortClients();
  }, [clients, searchQuery, filters]);

  const loadClients = async () => {
    try {
      setError(null);
      
      const data = await clientService.getAllClients();
      setClients(data);
    } catch (err) {
      setError(err.message || 'Failed to load clients');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterAndSortClients = () => {
    let filtered = [...clients];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client => 
        client.fullName?.toLowerCase().includes(query) ||
        client.cin?.toLowerCase().includes(query) ||
        client.clientNumber?.toString().includes(query) ||
        client.workerNumber?.toLowerCase().includes(query) ||
        client.workplace?.name?.toLowerCase().includes(query)
      );
    }

    // Apply status filter (filter by cession status)
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(client => 
        client.cessions && client.cessions.some(cession => 
          cession.status === filters.status
        )
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.fullName?.toLowerCase() || '';
          bValue = b.fullName?.toLowerCase() || '';
          break;
        case 'clientNumber':
          aValue = a.clientNumber || 0;
          bValue = b.clientNumber || 0;
          break;
        case 'monthlyPayment':
          aValue = Math.max(...(a.cessions?.map(c => c.monthlyPayment) || [0]));
          bValue = Math.max(...(b.cessions?.map(c => c.monthlyPayment) || [0]));
          break;
        case 'remainingBalance':
          aValue = a.cessions?.reduce((sum, c) => sum + (c.remainingBalance || 0), 0) || 0;
          bValue = b.cessions?.reduce((sum, c) => sum + (c.remainingBalance || 0), 0) || 0;
          break;
        case 'progress':
          aValue = Math.max(...(a.cessions?.map(c => c.currentProgress) || [0]));
          bValue = Math.max(...(b.cessions?.map(c => c.currentProgress) || [0]));
          break;
        default:
          aValue = a.fullName?.toLowerCase() || '';
          bValue = b.fullName?.toLowerCase() || '';
      }

      if (typeof aValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      } else {
        return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    setFilteredClients(filtered);
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const handleShowFilters = () => {
    setShowFilterModal(true);
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
        {searchQuery ? t('client.no_clients') : t('client.no_clients')}
      </Text>
    </View>
  );

  if (loading) {
    return <LoadingSpinner text={t('common.loading')} />;
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error} 
        onRetry={loadClients}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ConnectivityIndicator onRefresh={handleRefresh} />
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t('client.search_placeholder')}
        onFilterPress={handleShowFilters}
        hasActiveFilters={filters.status !== 'ALL' || filters.sortBy !== 'name' || filters.sortOrder !== 'asc'}
      />
      
      {/* Active filters indicator */}
      {(filters.status !== 'ALL' || filters.sortBy !== 'name' || filters.sortOrder !== 'asc') && (
        <View style={styles.activeFiltersContainer}>
          <Text style={[styles.activeFiltersText, { textAlign: getTextAlign() }]}>
            {t('common.filter')}: {filters.status !== 'ALL' ? `${t('cession.status.active')}: ${filters.status}` : ''} 
            {filters.sortBy !== 'name' ? ` | ${t('common.sort')}: ${filters.sortBy}` : ''}
            {filters.sortOrder !== 'asc' ? ` (${filters.sortOrder})` : ''}
          </Text>
          <TouchableOpacity 
            onPress={() => handleApplyFilters({ status: 'ALL', sortBy: 'name', sortOrder: 'asc' })}
            style={styles.clearFiltersButton}
          >
            <Text style={styles.clearFiltersText}>{t('common.clear')}</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <FlatList
        data={filteredClients}
        renderItem={renderClient}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={filteredClients.length === 0 ? styles.emptyContainer : null}
      />
      
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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

export default ClientListScreen;