import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { wp, hp } from '../../utils/responsive';

const { width } = Dimensions.get('window');

const QuickStats = ({ analytics }) => {
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'N/A';
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-TN', {
      style: 'decimal',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(numericAmount);
  };

  // Calculate dynamic status colors
  const getHealthColor = (status) => {
    switch(status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getGrowthColor = (growth) => {
    if (growth > 5) return '#10b981';
    if (growth > 0) return '#3b82f6';
    if (growth === 0) return '#6b7280';
    return '#ef4444';
  };

  // Stats data matching desktop
  const stats = [
    {
      title: 'Cessions Actives',
      value: analytics?.activeCessions || 0,
      icon: '✅',
      gradient: 'from-emerald-500 to-teal-600',
      bgColor: '#10b981'
    },
    {
      title: 'Revenus Mensuels',
      value: formatCurrency(analytics?.monthlyRevenue || 0),
      subtitle: 'This month',
      icon: '💰',
      gradient: 'from-blue-500 to-indigo-600',
      bgColor: '#3b82f6'
    },
    {
      title: 'Cumul des Revenus',
      value: formatCurrency(analytics?.totalLoanAmount || 0),
      subtitle: 'All time',
      icon: '📊',
      gradient: 'from-purple-500 to-pink-600',
      bgColor: '#8b5cf6'
    },
    {
      title: 'Total Clients',
      value: analytics?.totalClients || 0,
      subtitle: 'Registered',
      icon: '👥',
      gradient: 'from-orange-500 to-amber-600',
      bgColor: '#f97316'
    },
    {
      title: 'Revenu Moyen/Client',
      value: formatCurrency(analytics?.totalClients ? (analytics?.totalLoanAmount || 0) / analytics.totalClients : 0),
      subtitle: 'Per customer',
      icon: '⚡',
      gradient: 'from-cyan-500 to-blue-600',
      bgColor: '#06b6d4'
    },
    {
      title: 'Taux de Réussite',
      value: `${(analytics?.completionRate || 0).toFixed(1)}%`,
      subtitle: analytics?.systemHealth?.status || 'healthy',
      icon: '🎯',
      gradient: 'from-gray-500 to-slate-600',
      bgColor: getHealthColor(analytics?.systemHealth?.status)
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: stat.bgColor }]}>
                <Text style={styles.icon}>{stat.icon}</Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.statTitle}>{stat.title}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              {stat.subtitle && (
                <Text style={[styles.statSubtitle, { color: getHealthColor(stat.subtitle) }]}>
                  {stat.subtitle}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = {
  container: {
    marginBottom: hp(2),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: wp(4),
  },
  statCard: {
    width: width > 768 ? `${100/6 - 1}%` : `${50 - 2}%`,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: wp(4),
    padding: wp(5),
    marginBottom: hp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    minHeight: hp(14),
  },
  cardHeader: {
    alignItems: 'flex-start',
    marginBottom: hp(2),
  },
  iconContainer: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(4),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: wp(6),
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  statTitle: {
    fontSize: wp(3.5),
    fontWeight: '700',
    color: '#475569',
    marginBottom: hp(1),
    lineHeight: wp(4.5),
    letterSpacing: 0.2,
  },
  statValue: {
    fontSize: wp(5.5),
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: hp(0.8),
    letterSpacing: -0.5,
    lineHeight: wp(6.5),
  },
  statSubtitle: {
    fontSize: wp(3.2),
    fontWeight: '600',
    opacity: 0.8,
    letterSpacing: 0.1,
  },
};

export default QuickStats;