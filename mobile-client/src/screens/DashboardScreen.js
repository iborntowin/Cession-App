import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { wp, hp } from '../utils/responsive';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ConnectivityIndicator from '../components/ConnectivityIndicator';
import { useTranslation } from '../hooks/useTranslation';

import { analyticsService } from '../services/analyticsService';

const { width, height } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Translation hook
  const { t, formatCurrency, isRTL, getTextAlign } = useTranslation();

  useEffect(() => {
    loadDashboardData();
    startAutoRefresh();

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  const startAutoRefresh = () => {
    if (autoRefresh && !refreshInterval) {
      const interval = setInterval(async () => {
        await loadDashboardData();
      }, 30000); // 30 seconds
      setRefreshInterval(interval);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    if (!autoRefresh) {
      startAutoRefresh();
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  const loadDashboardData = async () => {
    try {
      setError(null);
      const data = await analyticsService.getDashboardAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <LoadingSpinner />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ErrorMessage
          message={error}
          onRetry={loadDashboardData}
        />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Premium Background with Depth */}
      <View style={styles.backgroundContainer}>
        <View style={styles.meshGradient1} />
        <View style={styles.meshGradient2} />
        <View style={styles.meshGradient3} />
        <View style={styles.glowOrb1} />
        <View style={styles.glowOrb2} />
      </View>

      <SafeAreaView style={styles.container} edges={['right', 'left']}>
        <ConnectivityIndicator />

        {/* Ultra-Minimal Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{t('dashboard.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('dashboard.subtitle')}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366f1"
              colors={['#6366f1', '#8b5cf6']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Stats - Premium Cards */}
          <View style={styles.heroSection}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroTitle}>{t('dashboard.overview.title')}</Text>
              <Text style={styles.heroSubtitle}>{t('dashboard.overview.subtitle')}</Text>
            </View>

            {/* Featured Metric - Full Width Hero */}
            <View style={styles.featuredMetric}>
              <View style={styles.featuredGradient}>
                <View style={styles.featuredLeft}>
                  <View style={styles.featuredIconWrapper}>
                    <Text style={styles.featuredIcon}>👥</Text>
                  </View>
                  <View style={styles.featuredContent}>
                    <Text style={styles.featuredLabel}>{t('dashboard.metrics.total_clients')}</Text>
                    <Text style={styles.featuredValue}>{analytics?.overview?.totalClients || 0}</Text>
                    <Text style={styles.featuredSubtext}>{t('dashboard.metrics.active_partnerships')}</Text>
                  </View>
                </View>
                <View style={styles.featuredRight}>
                  <View style={styles.trendBadge}>
                    <Text style={styles.trendIcon}>📈</Text>
                    <Text style={styles.trendText}>+12%</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Quick Metrics Grid - 2x2 */}
            <View style={styles.quickMetricsGrid}>
              <View style={styles.quickMetric}>
                <View style={styles.qmIconWrapper}>
                  <Text style={styles.qmIcon}>📈</Text>
                </View>
                <Text style={styles.qmValue}>{analytics?.overview?.activeCessions || 0}</Text>
                <Text style={styles.qmLabel}>{t('dashboard.metrics.active_cessions')}</Text>
              </View>

              <View style={styles.quickMetric}>
                <View style={[styles.qmIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Text style={styles.qmIcon}>💰</Text>
                </View>
                <Text style={styles.qmValue}>{formatCurrency(analytics?.overview?.monthlyRevenue || 0)}</Text>
                <Text style={styles.qmLabel}>{t('dashboard.metrics.monthly_revenue')}</Text>
              </View>

              <View style={styles.quickMetric}>
                <View style={[styles.qmIconWrapper, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                  <Text style={styles.qmIcon}>🎯</Text>
                </View>
                <Text style={styles.qmValue}>{(analytics?.overview?.completionRate || 0).toFixed(1)}%</Text>
                <Text style={styles.qmLabel}>{t('dashboard.metrics.success_rate')}</Text>
              </View>

              <View style={styles.quickMetric}>
                <View style={[styles.qmIconWrapper, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                  <Text style={styles.qmIcon}>⚡</Text>
                </View>
                <Text style={styles.qmValue}>
                  {analytics?.overview?.totalClients ?
                    formatCurrency((analytics?.overview?.totalLoanAmount || 0) / analytics.overview.totalClients) : 0}
                </Text>
                <Text style={styles.qmLabel}>{t('dashboard.metrics.avg_per_client')}</Text>
              </View>
            </View>
          </View>

          {/* Bottom Safe Space */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  // ==================== MAIN CONTAINERS ====================
  mainContainer: {
    flex: 1,
    backgroundColor: '#fafbfd',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },

  // ==================== PREMIUM $200 SAAS BACKGROUND ====================
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: '#fafbfd',
  },
  // Radial gradient orbs with enhanced depth
  meshGradient1: {
    position: 'absolute',
    top: -height * 0.25,
    right: -width * 0.25,
    width: width * 1.2,
    height: width * 1.2,
    backgroundColor: '#6366f1',
    opacity: 0.06,
    borderRadius: width * 0.6,
    transform: [{ scale: 1.2 }],
  },
  meshGradient2: {
    position: 'absolute',
    top: height * 0.15,
    left: -width * 0.4,
    width: width * 1.4,
    height: width * 1.4,
    backgroundColor: '#8b5cf6',
    opacity: 0.04,
    borderRadius: width * 0.7,
    transform: [{ scale: 1.1 }],
  },
  meshGradient3: {
    position: 'absolute',
    bottom: -height * 0.2,
    right: -width * 0.3,
    width: width * 1.3,
    height: width * 1.3,
    backgroundColor: '#10b981',
    opacity: 0.03,
    borderRadius: width * 0.65,
    transform: [{ scale: 1.15 }],
  },
  // Subtle accent glows
  glowOrb1: {
    position: 'absolute',
    top: height * 0.4,
    left: width * 0.15,
    width: wp(60),
    height: wp(60),
    backgroundColor: '#c7d2fe',
    opacity: 0.08,
    borderRadius: wp(30),
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 5,
  },
  glowOrb2: {
    position: 'absolute',
    bottom: height * 0.3,
    right: width * 0.1,
    width: wp(50),
    height: wp(50),
    backgroundColor: '#fae8ff',
    opacity: 0.08,
    borderRadius: wp(25),
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 35,
    elevation: 4,
  },

  // ==================== ULTRA-MINIMAL HEADER ====================
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(30px)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.6)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
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

  // ==================== SCROLLVIEW ====================
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: hp(3),
  },

  // ==================== HERO SECTION ====================
  heroSection: {
    paddingHorizontal: wp(6),
    paddingTop: hp(2.5),
    paddingBottom: hp(1),
  },
  heroHeader: {
    marginBottom: hp(2.5),
  },
  heroTitle: {
    fontSize: wp(8),
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1.5,
    lineHeight: wp(10),
    marginBottom: hp(0.5),
  },
  heroSubtitle: {
    fontSize: wp(4),
    color: '#64748b',
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  // ==================== FEATURED METRIC ====================
  featuredMetric: {
    marginBottom: hp(2),
    borderRadius: wp(5),
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  featuredGradient: {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp(6),
    minHeight: hp(16),
  },
  featuredLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featuredIconWrapper: {
    width: wp(16),
    height: wp(16),
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: wp(4),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(4),
    backdropFilter: 'blur(10px)',
  },
  featuredIcon: {
    fontSize: wp(8),
  },
  featuredContent: {
    flex: 1,
  },
  featuredLabel: {
    fontSize: wp(3.8),
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: hp(0.5),
    letterSpacing: 0.5,
  },
  featuredValue: {
    fontSize: wp(9),
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1.5,
    lineHeight: wp(11),
    marginBottom: hp(0.3),
  },
  featuredSubtext: {
    fontSize: wp(3.2),
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
  },
  featuredRight: {
    alignItems: 'flex-end',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: wp(5),
    backdropFilter: 'blur(10px)',
  },
  trendIcon: {
    fontSize: wp(4),
    marginRight: wp(1),
  },
  trendText: {
    fontSize: wp(4),
    fontWeight: '700',
    color: '#ffffff',
  },

  // ==================== QUICK METRICS GRID ====================
  quickMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(3),
  },
  quickMetric: {
    width: (width - wp(12) - wp(3)) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: wp(4),
    padding: wp(4.5),
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  qmIconWrapper: {
    width: wp(11),
    height: wp(11),
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: wp(2.75),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1.5),
  },
  qmIcon: {
    fontSize: wp(5.5),
  },
  qmValue: {
    fontSize: wp(5.5),
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: hp(0.5),
    lineHeight: wp(7),
  },
  qmLabel: {
    fontSize: wp(3.2),
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ==================== BOTTOM SPACER ====================
  bottomSpacer: {
    height: hp(3),
  },
});

export default DashboardScreen;