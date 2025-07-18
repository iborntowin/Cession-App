import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const StatusIndicator = ({ status, type = 'cession', size = 'medium', lastSync = null }) => {
  const getStatusConfig = (status, type) => {
    if (type === 'connectivity') {
      switch (status) {
        case 'online':
          return {
            color: '#4CAF50',
            backgroundColor: '#E8F5E8',
            text: 'Online'
          };
        case 'offline':
          return {
            color: '#FF5722',
            backgroundColor: '#FFEBEE',
            text: 'Offline'
          };
        default:
          return {
            color: '#757575',
            backgroundColor: '#F5F5F5',
            text: 'Unknown'
          };
      }
    }
    
    if (type === 'sync') {
      switch (status) {
        case 'synced':
          return {
            color: '#4CAF50',
            backgroundColor: '#E8F5E8',
            text: lastSync ? `Synced ${lastSync}` : 'Synced'
          };
        case 'syncing':
          return {
            color: '#FF9800',
            backgroundColor: '#FFF3E0',
            text: 'Syncing...'
          };
        case 'error':
          return {
            color: '#FF5722',
            backgroundColor: '#FFEBEE',
            text: 'Sync Error'
          };
        case 'stale':
          return {
            color: '#FF9800',
            backgroundColor: '#FFF3E0',
            text: 'Data may be outdated'
          };
        default:
          return {
            color: '#757575',
            backgroundColor: '#F5F5F5',
            text: 'Unknown'
          };
      }
    }
    
    // Default cession status handling
    switch (status) {
      case 'ACTIVE':
        return {
          color: '#4CAF50',
          backgroundColor: '#E8F5E8',
          text: 'Active'
        };
      case 'COMPLETED':
        return {
          color: '#2196F3',
          backgroundColor: '#E3F2FD',
          text: 'Completed'
        };
      case 'OVERDUE':
        return {
          color: '#FF5722',
          backgroundColor: '#FFEBEE',
          text: 'Overdue'
        };
      case 'PENDING':
        return {
          color: '#FF9800',
          backgroundColor: '#FFF3E0',
          text: 'Pending'
        };
      default:
        return {
          color: '#757575',
          backgroundColor: '#F5F5F5',
          text: 'Unknown'
        };
    }
  };

  const config = getStatusConfig(status, type);
  const sizeStyles = size === 'small' ? styles.small : styles.medium;

  return (
    <View style={[styles.container, sizeStyles.container, { backgroundColor: config.backgroundColor }]}>
      <View style={[styles.dot, sizeStyles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, sizeStyles.text, { color: config.color }]}>
        {config.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: {
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontWeight: '500',
  },
  medium: StyleSheet.create({
    container: {
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    dot: {
      width: 6,
      height: 6,
    },
    text: {
      fontSize: 14,
    },
  }),
  small: StyleSheet.create({
    container: {
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    dot: {
      width: 4,
      height: 4,
    },
    text: {
      fontSize: 12,
    },
  }),
});

export default StatusIndicator;