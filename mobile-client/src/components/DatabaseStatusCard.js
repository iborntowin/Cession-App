import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabaseService } from '../services/supabaseService';

const DatabaseStatusCard = ({ onRefresh, style }) => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [dataFreshness, setDataFreshness] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadStatus();
    
    // Add listener for connection status changes
    const unsubscribe = supabaseService.addStatusListener((status) => {
      setConnectionStatus(status);
    });

    // Start periodic checks
    supabaseService.startPeriodicChecks(2); // Check every 2 minutes

    return () => {
      unsubscribe();
      supabaseService.stopPeriodicChecks();
    };
  }, []);

  const loadStatus = async () => {
    try {
      const status = supabaseService.getConnectionStatus();
      const freshness = await supabaseService.getDataFreshness();
      
      setConnectionStatus(status);
      setDataFreshness(freshness);
    } catch (error) {
      console.error('Failed to load database status:', error);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await supabaseService.checkConnection();
      await loadStatus();
      
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusColor = (isConnected) => {
    return isConnected ? '#4CAF50' : '#FF5722';
  };

  const getDataFreshnessColor = (isFresh) => {
    return isFresh ? '#4CAF50' : '#FF9800';
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (!connectionStatus) {
    return (
      <View style={[styles.card, style]}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading database status...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Database Status</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.refreshText}>🔄</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        <View style={styles.statusItem}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(connectionStatus.isConnected) }]} />
          <Text style={styles.statusLabel}>Connection</Text>
          <Text style={[styles.statusValue, { color: getStatusColor(connectionStatus.isConnected) }]}>
            {connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {connectionStatus.isConnected && (
        <>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Response Time:</Text>
            <Text style={styles.infoValue}>
              {connectionStatus.responseTime ? `${connectionStatus.responseTime}ms` : 'N/A'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Files Available:</Text>
            <Text style={styles.infoValue}>{connectionStatus.filesCount || 0}</Text>
          </View>
        </>
      )}

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Last Checked:</Text>
        <Text style={styles.infoValue}>
          {formatTimeAgo(connectionStatus.lastChecked)}
        </Text>
      </View>

      {dataFreshness && (
        <>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: getDataFreshnessColor(dataFreshness.isFresh) }]} />
              <Text style={styles.statusLabel}>Data Freshness</Text>
              <Text style={[styles.statusValue, { color: getDataFreshnessColor(dataFreshness.isFresh) }]}>
                {dataFreshness.isFresh ? 'Fresh' : 'Stale'}
              </Text>
            </View>
          </View>

          {dataFreshness.serverUpdatedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Server Updated:</Text>
              <Text style={styles.infoValue}>
                {formatTimeAgo(dataFreshness.serverUpdatedAt)}
              </Text>
            </View>
          )}

          {dataFreshness.cachedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cached At:</Text>
              <Text style={styles.infoValue}>
                {formatTimeAgo(dataFreshness.cachedAt)}
              </Text>
            </View>
          )}
        </>
      )}

      {connectionStatus.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {connectionStatus.error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 4,
  },
  refreshText: {
    fontSize: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  statusRow: {
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  errorContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
  },
});

export default DatabaseStatusCard;