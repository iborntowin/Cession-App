import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList
} from 'react-native';
import { wp, hp } from '../../utils/responsive';

const RecentCessions = ({ cessions, formatCurrency, onViewAll }) => {
  const getStatusClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'FINISHED':
        return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'CANCELLED':
        return { backgroundColor: '#fee2e2', color: '#dc2626' };
      case 'PENDING':
        return { backgroundColor: '#fef3c7', color: '#d97706' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151' };
    }
  };

  const safeFormatDistanceToNow = (dateValue) => {
    if (!dateValue) return 'Recently';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'Recently';

      const now = new Date();
      const diffInMs = now - date;
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInDays === 0) return 'Today';
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) return `${diffInDays} days ago`;
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
      return `${Math.floor(diffInDays / 30)} months ago`;
    } catch (error) {
      return 'Recently';
    }
  };

  const renderCessionItem = ({ item }) => {
    if (!item) return null;

    const statusStyle = getStatusClass(item.status);

    return (
      <View style={styles.cessionCard}>
        <View style={styles.cessionHeader}>
          <View style={styles.clientInfo}>
            <View style={styles.clientAvatar}>
              <Text style={styles.avatarText}>
                {item.clientName?.charAt(0) || 'C'}
              </Text>
            </View>
            <View>
              <Text style={styles.clientName} numberOfLines={1}>
                {item.clientName || 'Unknown Client'}
              </Text>
              <Text style={styles.cessionAmount}>
                {formatCurrency(item.totalLoanAmount || 0)} TND
              </Text>
            </View>
          </View>
          <View style={styles.cessionMeta}>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {item.status || 'Unknown'}
              </Text>
            </View>
            <Text style={styles.timeAgo}>
              {safeFormatDistanceToNow(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (!cessions || cessions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Recent Cessions</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>📋</Text>
          </View>
          <Text style={styles.emptyText}>No cessions found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Cessions</Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cessions.slice(0, 5)}
        renderItem={renderCessionItem}
        keyExtractor={(item, index) => item?.id?.toString() || `cession-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(24px)',
    borderRadius: wp(3),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  title: {
    fontSize: wp(4.5),
    fontWeight: 'bold',
    color: '#1f2937',
  },
  viewAllText: {
    fontSize: wp(3.5),
    color: '#10b981',
    fontWeight: '600',
  },
  listContainer: {
    padding: wp(4),
  },
  cessionCard: {
    backgroundColor: 'rgba(249, 250, 251, 0.5)',
    borderRadius: wp(2),
    padding: wp(3),
    marginBottom: hp(1),
  },
  cessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clientAvatar: {
    width: wp(10),
    height: wp(10),
    backgroundColor: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    borderRadius: wp(5),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  avatarText: {
    fontSize: wp(4),
    fontWeight: 'bold',
    color: '#fff',
  },
  clientName: {
    fontSize: wp(4),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: hp(0.5),
  },
  cessionAmount: {
    fontSize: wp(3.5),
    color: '#6b7280',
  },
  cessionMeta: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderRadius: wp(1),
    marginBottom: hp(0.5),
  },
  statusText: {
    fontSize: wp(3),
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: wp(3),
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(8),
  },
  emptyIcon: {
    width: wp(16),
    height: wp(16),
    backgroundColor: '#f3f4f6',
    borderRadius: wp(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(2),
  },
  emptyIconText: {
    fontSize: wp(8),
  },
  emptyText: {
    fontSize: wp(4),
    color: '#6b7280',
    fontWeight: '500',
  },
});

export default RecentCessions;