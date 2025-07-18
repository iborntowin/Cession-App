import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { getAppHealthStatus, getRecentErrors } from '../utils/globalErrorHandler';
import loggingService from '../utils/loggingService';

/**
 * Health monitoring component for debugging and status display
 */
const HealthMonitor = ({ visible, onClose }) => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [recentErrors, setRecentErrors] = useState([]);
  const [logStats, setLogStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      refreshHealthData();
    }
  }, [visible]);

  const refreshHealthData = async () => {
    setRefreshing(true);
    try {
      const health = getAppHealthStatus();
      const errors = getRecentErrors(10);
      const stats = loggingService.getLogStats();
      
      setHealthStatus(health);
      setRecentErrors(errors);
      setLogStats(stats);
    } catch (error) {
      console.error('Failed to refresh health data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const clearLogs = async () => {
    try {
      await loggingService.clearLogs();
      refreshHealthData();
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const exportLogs = () => {
    try {
      const exportData = loggingService.exportLogs();
      console.log('Exported logs:', exportData);
      // In a real app, you might save this to a file or send to a server
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>App Health Monitor</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Health Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health Status</Text>
            {healthStatus && (
              <View style={styles.healthCard}>
                <View style={[styles.healthIndicator, { 
                  backgroundColor: healthStatus.healthy ? '#10B981' : '#EF4444' 
                }]}>
                  <Text style={styles.healthIndicatorText}>
                    {healthStatus.healthy ? '✓ Healthy' : '⚠ Degraded'}
                  </Text>
                </View>
                
                {healthStatus.recommendations.length > 0 && (
                  <View style={styles.recommendations}>
                    <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                    {healthStatus.recommendations.map((rec, index) => (
                      <Text key={index} style={styles.recommendationText}>
                        • {rec}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Error Statistics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Error Statistics</Text>
            {healthStatus?.stats && (
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{healthStatus.stats.total}</Text>
                  <Text style={styles.statLabel}>Total Errors</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{healthStatus.stats.lastHour}</Text>
                  <Text style={styles.statLabel}>Last Hour</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{healthStatus.stats.lastDay}</Text>
                  <Text style={styles.statLabel}>Last Day</Text>
                </View>
              </View>
            )}
          </View>

          {/* Log Statistics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Log Statistics</Text>
            {logStats && (
              <View style={styles.logStats}>
                <Text style={styles.logStatText}>Total Logs: {logStats.total}</Text>
                <Text style={styles.logStatText}>Recent Errors: {logStats.recentErrors}</Text>
                
                <View style={styles.logLevels}>
                  {Object.entries(logStats.byLevel).map(([level, count]) => (
                    <View key={level} style={styles.logLevelItem}>
                      <Text style={styles.logLevelText}>{level}: {count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Recent Errors */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Errors ({recentErrors.length})</Text>
            {recentErrors.map((errorEntry, index) => (
              <View key={errorEntry.id} style={styles.errorItem}>
                <Text style={styles.errorTimestamp}>
                  {new Date(errorEntry.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={styles.errorMessage}>
                  {errorEntry.error?.message || 'Unknown error'}
                </Text>
                <Text style={styles.errorSource}>
                  Source: {errorEntry.context?.source || 'Unknown'}
                </Text>
              </View>
            ))}
            
            {recentErrors.length === 0 && (
              <Text style={styles.noErrorsText}>No recent errors</Text>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={refreshHealthData}
              disabled={refreshing}
            >
              <Text style={styles.actionButtonText}>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={exportLogs}>
              <Text style={styles.actionButtonText}>Export Logs</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.dangerButton]} 
              onPress={clearLogs}
            >
              <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
                Clear Logs
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

/**
 * Floating health indicator for development
 */
export const HealthIndicator = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [showMonitor, setShowMonitor] = useState(false);

  useEffect(() => {
    if (!__DEV__) return;

    const updateHealth = () => {
      const health = getAppHealthStatus();
      setHealthStatus(health);
    };

    updateHealth();
    const interval = setInterval(updateHealth, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (!__DEV__ || !healthStatus) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.floatingIndicator, {
          backgroundColor: healthStatus.healthy ? '#10B981' : '#EF4444'
        }]}
        onPress={() => setShowMonitor(true)}
      >
        <Text style={styles.floatingIndicatorText}>
          {healthStatus.healthy ? '✓' : '⚠'}
        </Text>
      </TouchableOpacity>

      <HealthMonitor
        visible={showMonitor}
        onClose={() => setShowMonitor(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  healthCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  healthIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  healthIndicatorText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  recommendations: {
    marginTop: 8,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  logStats: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  logStatText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  logLevels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  logLevelItem: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  logLevelText: {
    fontSize: 12,
    color: '#374151',
  },
  errorItem: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  errorTimestamp: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 4,
  },
  errorSource: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noErrorsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    marginBottom: 32,
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  dangerButtonText: {
    color: '#fff',
  },
  floatingIndicator: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  floatingIndicatorText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default HealthMonitor;