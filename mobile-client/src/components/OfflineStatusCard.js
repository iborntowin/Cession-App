import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { offlineManager } from '../services/offlineManager';

const OfflineStatusCard = ({ style, onRefresh }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatus();
    
    // Listen for offline manager events
    const unsubscribe = offlineManager.addListener(handleOfflineEvent);
    
    // Set up periodic status updates
    const interval = setInterval(loadStatus, 10000); // Update every 10 seconds
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadStatus = async () => {
    try {
      const currentStatus = await offlineManager.getStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('Error loading offline status:', error);
    }
  };

  const handleOfflineEvent = (event) => {
    console.log('Offline manager event:', event);
    // Refresh status when events occur
    loadStatus();
  };

  const handleForceSync = async () => {
    if (!status?.isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline. Please check your connection.');
      return;
    }

    setLoading(true);
    try {
      const result = await offlineManager.forceSync();
      if (result.success) {
        Alert.alert('Sync Complete', `Successfully synced ${result.clientCount} clients and ${result.cessionCount} cessions.`);
        if (onRefresh) {
          onRefresh();
        }
      } else {
        Alert.alert('Sync Failed', result.message || 'Failed to sync data');
      }
    } catch (error) {
      Alert.alert('Sync Error', error.message || 'An error occurred during sync');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached data. You will need an internet connection to reload data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await offlineManager.clearCache();
              Alert.alert('Cache Cleared', 'All cached data has been removed.');
              if (onRefresh) {
                onRefresh();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const formatDataAge = (age) => {
    if (!age) return 'Unknown';
    
    const hours = Math.floor(age / (1000 * 60 * 60));
    const days = Math.floor(age / (1000 * 60 * 60 * 24));
    
    if (hours < 1) return 'Fresh';
    if (hours < 24) return `${hours}h old`;
    return `${days}d old`;
  };

  const getConnectionIcon = (isOnline, connectionType) => {
    if (!isOnline) return '📵';
    
    switch (connectionType) {
      case 'wifi':
        return '📶';
      case 'cellular':
        return '📱';
      case 'ethernet':
        return '🌐';
      default:
        return '🔗';
    }
  };

  const getStatusColor = (isOnline, hasCachedData) => {
    if (isOnline) return '#4CAF50';
    if (hasCachedData) return '#FF9800';
    return '#FF5722';
  };

  if (!status) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading offline status...</Text>
      </View>
    );
  }

  const statusColor = getStatusColor(status.isOnline, status.hasCachedData);
  const connectionIcon = getConnectionIcon(status.isOnline, status.connectionType);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.statusIndicator}>
          <Text style={styles.connectionIcon}>{connectionIcon}</Text>
          <View>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {status.isOnline ? 'Online' : 'Offline'}
            </Text>
            <Text style={styles.connectionType}>
              {status.connectionType || 'Unknown'}
            </Text>
          </View>
        </View>
        
        <View style={styles.syncIndicator}>
          {status.syncInProgress && (
            <Text style={styles.syncingText}>🔄 Syncing...</Text>
          )}
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Last Sync:</Text>
          <Text style={styles.detailValue}>
            {formatTimestamp(status.lastSuccessfulSync)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Cached Data:</Text>
          <Text style={styles.detailValue}>
            {status.hasCachedData ? formatDataAge(status.cachedDataAge) : 'None'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Auto-Sync:</Text>
          <Text style={styles.detailValue}>
            {status.autoSyncEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.syncButton,
            (!status.isOnline || loading) && styles.disabledButton
          ]}
          onPress={handleForceSync}
          disabled={!status.isOnline || loading}
        >
          <Text style={[
            styles.actionButtonText,
            (!status.isOnline || loading) && styles.disabledButtonText
          ]}>
            {loading ? 'Syncing...' : 'Force Sync'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.clearButton]}
          onPress={handleClearCache}
        >
          <Text style={styles.actionButtonText}>Clear Cache</Text>
        </TouchableOpacity>
      </View>

      {!status.isOnline && status.hasCachedData && (
        <View style={styles.offlineNotice}>
          <Text style={styles.offlineNoticeText}>
            📱 You're offline but can still browse cached data
          </Text>
        </View>
      )}

      {!status.isOnline && !status.hasCachedData && (
        <View style={styles.noDataNotice}>
          <Text style={styles.noDataNoticeText}>
            ⚠️ No cached data available. Connect to internet to load data.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  connectionType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  syncIndicator: {
    alignItems: 'flex-end',
  },
  syncingText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  details: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncButton: {
    backgroundColor: '#2196F3',
  },
  clearButton: {
    backgroundColor: '#FF5722',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButtonText: {
    color: '#999',
  },
  offlineNotice: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFB74D',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
  },
  offlineNoticeText: {
    fontSize: 12,
    color: '#E65100',
    textAlign: 'center',
  },
  noDataNotice: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
  },
  noDataNoticeText: {
    fontSize: 12,
    color: '#C62828',
    textAlign: 'center',
  },
});

export default OfflineStatusCard;