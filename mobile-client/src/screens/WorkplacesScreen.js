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
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ConnectivityIndicator from '../components/ConnectivityIndicator';

import { workplaceService } from '../services/workplaceService';
import { clientService } from '../services/clientService';

const { width, height } = Dimensions.get('window');

const WorkplacesScreen = ({ navigation }) => {
  const [workplaces, setWorkplaces] = useState([]);
  const [clients, setClients] = useState([]);
  const [filteredWorkplaces, setFilteredWorkplaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [formattedWorkplaces, setFormattedWorkplaces] = useState([]);
  const [workplaceJobs, setWorkplaceJobs] = useState(new Map());
  const [expandedWorkplaces, setExpandedWorkplaces] = useState(new Set());

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const performFilter = async () => {
      await filterWorkplaces();
    };
    performFilter();
  }, [workplaces, searchQuery]);

  const loadData = async () => {
    try {
      setError(null);

      // Load workplaces and clients
      const [workplacesData, clientsData] = await Promise.all([
        workplaceService.getAllWorkplaces(),
        clientService.getAllClients()
      ]);

      setWorkplaces(workplacesData);
      setClients(clientsData);

      // Format workplaces for display
      const formatted = await Promise.all(
        workplacesData
          .filter(workplace => workplace)
          .map(async (workplace) => {
            try {
              return await workplaceService.formatWorkplaceForDisplay(workplace, clientsData);
            } catch (error) {
              console.warn(`Failed to format workplace ${workplace.id}:`, error);
              return {
                ...workplace,
                jobsCount: 0,
                clientCount: 0,
                formattedCreatedAt: 'N/A',
                hasJobs: false
              };
            }
          })
      );
      setFormattedWorkplaces(formatted);

      // Load jobs for all workplaces
      const jobsMap = new Map();
      await Promise.all(
        workplacesData
          .filter(workplace => workplace && workplace.id)
          .map(async (workplace) => {
            try {
              const jobs = await workplaceService.getWorkplaceJobs(workplace);
              jobsMap.set(workplace.id, jobs || []);
            } catch (error) {
              console.warn(`Failed to load jobs for workplace ${workplace.id}:`, error);
              jobsMap.set(workplace.id, []);
            }
          })
      );
      setWorkplaceJobs(jobsMap);

      // Calculate analytics
      const analyticsData = await workplaceService.calculateWorkplaceAnalytics(workplacesData, clientsData);
      setAnalytics(analyticsData);

      // Initialize filtered workplaces
      const sorted = workplaceService.sortWorkplaces([...workplacesData], 'name', 'asc');
      setFilteredWorkplaces(sorted);
    } catch (err) {
      setError(err.message || 'Failed to load workplaces');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterWorkplaces = async () => {
    if (!workplaces || workplaces.length === 0) {
      setFilteredWorkplaces([]);
      return;
    }

    if (!searchQuery) {
      const sorted = workplaceService.sortWorkplaces([...workplaces], 'name', 'asc');
      setFilteredWorkplaces(sorted);
      return;
    }

    let filtered = await workplaceService.searchWorkplaces(workplaces, searchQuery);
    filtered = workplaceService.sortWorkplaces(filtered, 'name', 'asc');
    setFilteredWorkplaces(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const toggleExpanded = (workplaceId) => {
    const newExpanded = new Set(expandedWorkplaces);
    if (newExpanded.has(workplaceId)) {
      newExpanded.delete(workplaceId);
    } else {
      newExpanded.add(workplaceId);
    }
    setExpandedWorkplaces(newExpanded);
  };

  const renderAnalytics = () => {
    if (!analytics) return null;

    return (
      <View style={styles.statsBar}>
        <View style={styles.statColumn}>
          <Text style={styles.statValue}>{analytics.totalWorkplaces || 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statColumn}>
          <Text style={styles.statValue}>{analytics.totalJobs || 0}</Text>
          <Text style={styles.statLabel}>Jobs</Text>
        </View>
        <View style={styles.statColumn}>
          <Text style={styles.statValue}>{analytics.workplacesWithJobs || 0}</Text>
          <Text style={styles.statLabel}>With Jobs</Text>
        </View>
        <View style={styles.statColumn}>
          <Text style={styles.statValue}>
            {analytics.averageJobsPerWorkplace ? analytics.averageJobsPerWorkplace.toFixed(1) : '0.0'}
          </Text>
          <Text style={styles.statLabel}>Avg Jobs</Text>
        </View>
      </View>
    );
  };

  const renderWorkplaceItem = ({ item }) => {
    if (!item) return null;

    const formattedWorkplace = formattedWorkplaces.find(fw => fw && fw.id === item.id) || {
      ...item,
      jobsCount: 0,
      clientCount: 0,
      formattedCreatedAt: 'N/A',
      hasJobs: false,
      name: item?.name || 'Unknown Workplace'
    };
    const jobs = workplaceJobs.get(item.id) || [];
    const isExpanded = expandedWorkplaces.has(item.id);

    return (
      <View style={styles.workplaceCard}>
        <TouchableOpacity
          style={styles.workplaceHeader}
          onPress={() => item.id && toggleExpanded(item.id)}
        >
          <View style={styles.workplaceInfo}>
            <Text style={styles.workplaceName} numberOfLines={1}>
              {formattedWorkplace.name || 'Unknown Workplace'}
            </Text>
            <Text style={styles.workplaceStats}>
              {formattedWorkplace.jobsCount || 0} jobs • {formattedWorkplace.clientCount || 0} clients
            </Text>
          </View>

          <View style={styles.expandIcon}>
            <Text style={styles.expandText}>
              {isExpanded ? '−' : '+'}
            </Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.workplaceDetails}>
            {/* Jobs Section */}
            {jobs.length > 0 && (
              <View style={styles.jobsSection}>
                <Text style={styles.sectionTitle}>Jobs</Text>
                {jobs.map((job, index) => (
                  <View key={job?.id || index} style={styles.jobItem}>
                    <Text style={styles.jobName}>{job?.name || 'Unknown Job'}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Clients Section */}
            {(formattedWorkplace.clientCount || 0) > 0 && (
              <View style={styles.clientsSection}>
                <Text style={styles.sectionTitle}>Recent Clients</Text>
                {clients
                  .filter(c => c && (c.workplaceId === item.id || c.workplaceName === item.name))
                  .slice(0, 5)
                  .map((client, index) => (
                    <View key={client?.id || index} style={styles.clientItem}>
                      <Text style={styles.clientName} numberOfLines={1}>
                        {client?.fullName || 'Unknown Client'}
                      </Text>
                      <Text style={styles.clientDetails}>
                        CIN: {client?.cin || 'N/A'}
                      </Text>
                    </View>
                  ))}
              </View>
            )}

            {/* Workplace Info */}
            <View style={styles.infoSection}>
              <Text style={styles.infoText}>
                Created: {formattedWorkplace.formattedCreatedAt || 'N/A'}
              </Text>
              {formattedWorkplace.hasJobs && (
                <Text style={styles.infoText}>
                  Has active job positions
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.mainContainer}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <View style={styles.backgroundContainer}>
          <View style={[styles.meshGradient1, { width: width * 1.2, height: width * 1.2 }]} />
          <View style={[styles.meshGradient2, { width: width * 1.4, height: width * 1.4 }]} />
          <View style={[styles.meshGradient3, { width: width * 1.3, height: width * 1.3 }]} />
          <View style={styles.glowOrb1} />
          <View style={styles.glowOrb2} />
        </View>
        <SafeAreaView style={styles.loadingContainer} edges={['right', 'left']}>
          <LoadingSpinner />
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.mainContainer}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <View style={styles.backgroundContainer}>
          <View style={[styles.meshGradient1, { width: width * 1.2, height: width * 1.2 }]} />
          <View style={[styles.meshGradient2, { width: width * 1.4, height: width * 1.4 }]} />
          <View style={[styles.meshGradient3, { width: width * 1.3, height: width * 1.3 }]} />
          <View style={styles.glowOrb1} />
          <View style={styles.glowOrb2} />
        </View>
        <SafeAreaView style={styles.errorContainer} edges={['right', 'left']}>
          <ErrorMessage message={error} onRetry={loadData} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* Premium Background */}
      <View style={styles.backgroundContainer}>
        <View style={[styles.meshGradient1, { width: width * 1.2, height: width * 1.2 }]} />
        <View style={[styles.meshGradient2, { width: width * 1.4, height: width * 1.4 }]} />
        <View style={[styles.meshGradient3, { width: width * 1.3, height: width * 1.3 }]} />
        <View style={styles.glowOrb1} />
        <View style={styles.glowOrb2} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['right', 'left']}>
        <ConnectivityIndicator />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Workplaces</Text>
            <Text style={styles.headerSubtitle}>{filteredWorkplaces.length} locations</Text>
          </View>
        </View>

        {/* Analytics Summary */}
        {renderAnalytics()}

        {/* Search */}
        <View style={styles.searchSection}>
          <SearchBar
            placeholder="Search workplaces..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Workplaces List */}
        <FlatList
          data={filteredWorkplaces}
          renderItem={renderWorkplaceItem}
          keyExtractor={(item) => item?.id?.toString() || `workplace-${Math.random()}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366f1"
              colors={['#6366f1']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No workplaces found</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fafbfd',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // ==================== BACKGROUND ====================
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  meshGradient1: {
    position: 'absolute',
    top: -height * 0.25,
    right: -width * 0.25,
    borderRadius: 9999,
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
    transform: [{ scale: 1.2 }],
  },
  meshGradient2: {
    position: 'absolute',
    top: height * 0.3,
    left: -width * 0.3,
    borderRadius: 9999,
    backgroundColor: 'rgba(139, 92, 246, 0.04)',
    transform: [{ scale: 1.1 }],
  },
  meshGradient3: {
    position: 'absolute',
    bottom: -height * 0.15,
    right: -width * 0.2,
    borderRadius: 9999,
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
    transform: [{ scale: 1.15 }],
  },
  glowOrb1: {
    position: 'absolute',
    top: height * 0.35,
    left: -width * 0.15,
    width: wp(60),
    height: wp(60),
    borderRadius: wp(30),
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
  },
  glowOrb2: {
    position: 'absolute',
    bottom: height * 0.15,
    right: -width * 0.1,
    width: wp(50),
    height: wp(50),
    borderRadius: wp(25),
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 35,
  },

  // ==================== HEADER ====================
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(30px)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.6)',
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
    paddingHorizontal: wp(6),
    paddingVertical: hp(2),
    gap: wp(2),
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: wp(5.5),
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: hp(0.3),
  },
  statLabel: {
    fontSize: wp(3),
    color: '#64748b',
    fontWeight: '600',
  },

  // ==================== SEARCH ====================
  searchSection: {
    paddingHorizontal: wp(6),
    paddingBottom: hp(2),
  },

  // ==================== LIST ====================
  listContent: {
    paddingHorizontal: wp(6),
    paddingBottom: hp(3),
  },
  
  // ==================== WORKPLACE CARD ====================
  workplaceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginBottom: hp(1.5),
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  workplaceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp(4),
  },
  workplaceInfo: {
    flex: 1,
  },
  workplaceName: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: hp(0.5),
  },
  workplaceStats: {
    fontSize: wp(3.5),
    color: '#64748b',
    fontWeight: '500',
  },
  expandIcon: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2.5),
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandText: {
    fontSize: wp(5.5),
    fontWeight: '700',
    color: '#6366f1',
  },
  workplaceDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.5)',
    padding: wp(4),
    paddingTop: hp(2),
  },
  
  // ==================== SECTIONS ====================
  sectionTitle: {
    fontSize: wp(4),
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: hp(1.5),
  },
  jobsSection: {
    marginBottom: hp(2),
  },
  jobItem: {
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    padding: wp(3),
    borderRadius: wp(2),
    marginBottom: hp(0.8),
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.5)',
  },
  jobName: {
    fontSize: wp(3.8),
    color: '#0f172a',
    fontWeight: '600',
  },
  clientsSection: {
    marginBottom: hp(2),
  },
  clientItem: {
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    padding: wp(3),
    borderRadius: wp(2),
    marginBottom: hp(0.8),
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.5)',
  },
  clientName: {
    fontSize: wp(3.8),
    color: '#0f172a',
    fontWeight: '600',
    marginBottom: hp(0.5),
  },
  clientDetails: {
    fontSize: wp(3.3),
    color: '#64748b',
    fontWeight: '500',
  },
  infoSection: {
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.5)',
    marginTop: hp(1),
  },
  infoText: {
    fontSize: wp(3.5),
    color: '#64748b',
    marginBottom: hp(0.5),
    fontWeight: '500',
  },
  
  // ==================== EMPTY STATE ====================
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(10),
  },
  emptyText: {
    fontSize: wp(4),
    color: '#64748b',
    fontWeight: '500',
  },
});

export default WorkplacesScreen;