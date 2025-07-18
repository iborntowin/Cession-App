import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { dataService } from '../services/DataService';

const ConnectivityIndicator = ({ style, onRefresh, showDataFreshness = true }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isDataStale, setIsDataStale] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Network connectivity monitoring
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected && state.isInternetReachable);
      setConnectionType(state.type);
    });

    // Data sync status monitoring
    const handleSyncStatus = (status, data) => {
      setIsSyncing(status === 'syncing');
      if (status === 'success') {
        setLastSyncTime(Date.now());
        setIsDataStale(false);
      }
    };

    dataService.addSyncListener(handleSyncStatus);

    // Initial data freshness check
    checkDataFreshness();

    return () => {
      unsubscribe();
      dataService.removeSyncListener(handleSyncStatus);
    };
  }, []);

  const checkDataFreshness = async () => {
    try {
      const lastSync = await dataService.getLastSyncTime();
      setLastSyncTime(lastSync);
      
      const isFresh = await dataService.isDataFresh();
      setIsDataStale(!isFresh);
    } catch (error) {
      console.warn('Error checking data freshness:', error);
    }
  };

  const formatLastSyncTime = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleRefreshPress = () => {
    if (onRefresh && typeof onRefresh === 'function') {
      onRefresh();
    }
  };

  // Show offline indicator
  if (!isConnected) {
    return (
      <View style={[styles.container, styles.offlineContainer, style]}>
        <View style={[styles.dot, styles.offlineDot]} />
        <Text style={styles.offlineText}>Offline - Using cached data</Text>
        {lastSyncTime && (
          <Text style={styles.syncTimeText}>
            Last sync: {formatLastSyncTime(lastSyncTime)}
          </Text>
        )}
      </View>
    );
  }

  // Show syncing indicator
  if (isSyncing) {
    return (
      <View style={[styles.container, styles.syncingContainer, style]}>
        <View style={[styles.dot, styles.syncingDot]} />
        <Text style={styles.syncingText}>Syncing data...</Text>
      </View>
    );
  }

  // Show data freshness warning
  if (showDataFreshness && isDataStale && lastSyncTime) {
    return (
      <TouchableOpacity 
        style={[styles.container, styles.staleContainer, style]}
        onPress={handleRefreshPress}
        activeOpacity={0.7}
      >
        <View style={[styles.dot, styles.staleDot]} />
        <View style={styles.textContainer}>
          <Text style={styles.staleText}>Data may be outdated</Text>
          <Text style={styles.syncTimeText}>
            Last sync: {formatLastSyncTime(lastSyncTime)}
          </Text>
        </View>
        {onRefresh && (
          <Text style={styles.refreshText}>Tap to refresh</Text>
        )}
      </TouchableOpacity>
    );
  }

  // Don't show anything when online and data is fresh
  return null;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
  },
  offlineContainer: {
    backgroundColor: '#FF5722',
  },
  syncingContainer: {
    backgroundColor: '#2196F3',
  },
  staleContainer: {
    backgroundColor: '#FF9800',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  offlineDot: {
    backgroundColor: '#fff',
  },
  syncingDot: {
    backgroundColor: '#fff',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  staleDot: {
    backgroundColor: '#fff',
  },
  textContainer: {
    flex: 1,
  },
  offlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  syncingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  staleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  syncTimeText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  refreshText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ConnectivityIndicator;