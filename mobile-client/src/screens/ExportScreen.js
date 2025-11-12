import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  Dimensions,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { wp, hp, rf, RESPONSIVE_STYLES } from '../utils/responsive';

const { width, height } = Dimensions.get('window');
import LoadingSpinner from '../components/LoadingSpinner';
import DataSourceSelector from '../components/DataSourceSelector';
import ErrorDisplay, { useErrorDisplay, ErrorStack } from '../components/ErrorDisplay';
import { supabaseService } from '../services/supabaseService';
import { useTranslation } from '../hooks/useTranslation';

const ExportScreen = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDataSourceSelector, setShowDataSourceSelector] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  
  // Translation hook
  const { t, currentLanguage, setLanguage, getAvailableLanguages, isRTL, getTextAlign } = useTranslation();
  
  // Enhanced error handling
  const { errors, showError, dismissError, clearAllErrors, retryError } = useErrorDisplay();

  useEffect(() => {
    initializeServices();
    fetchConnectionStatus();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchConnectionStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const initializeServices = async () => {
    try {
      await supabaseService.initialize();
    } catch (error) {
      console.error('Error initializing services:', error);
    }
  };

  const fetchConnectionStatus = async () => {
    try {
      await supabaseService.checkConnection();
      const connectionInfo = supabaseService.getConnectionStatus();
      setConnectionStatus(connectionInfo);
      clearAllErrors();
    } catch (err) {
      showError(err, 'Failed to fetch connection status', {
        autoDismiss: 10000, // Auto-dismiss after 10 seconds
        showDetails: __DEV__
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConnectionStatus();
  };

  const handleDataSourceChange = () => {
    // Refresh connection status when data source changes
    fetchConnectionStatus();
  };



  const getLastSyncText = (timestamp) => {
    if (!timestamp) return t('time.never');

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t('time.just_now');
    if (diffMins < 60) return t('time.minutes_ago', { count: diffMins });
    if (diffHours < 24) return t('time.hours_ago', { count: diffHours });
    if (diffDays < 7) return t('time.days_ago', { count: diffDays });

    return date.toLocaleDateString();
  };

  const handleLanguageChange = async (languageCode) => {
    try {
      await setLanguage(languageCode);
      setShowLanguageSelector(false);
      Alert.alert(
        t('common.ok'),
        t('sync.language_changed'),
        [{ text: t('common.ok') }]
      );
    } catch (error) {
      Alert.alert(
        t('common.error'),
        'Failed to change language',
        [{ text: t('common.ok') }]
      );
    }
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
          <LoadingSpinner text="Loading connection status..." />
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Data Sync</Text>
            <Text style={styles.headerSubtitle}>Connection & Settings</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={loading}
          >
            <Text style={styles.refreshIcon}>🔄</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#6366f1"
              colors={['#6366f1']}
            />
          }
        >

          {/* Enhanced Error Display */}
          <ErrorStack 
            errors={errors}
            onRetry={(errorId) => retryError(errorId, fetchConnectionStatus)}
            onDismiss={dismissError}
            maxVisible={2}
          />

          {/* Connection Status Card */}
          <View style={styles.statusCard}>
            <Text style={styles.cardTitle}>Connection Status</Text>
            
            <View style={styles.statusGrid}>
              {/* Status Indicator */}
              <View style={styles.statusItem}>
                <Text style={styles.statusItemLabel}>Status</Text>
                <View style={styles.statusIndicator}>
                  <Text style={[styles.statusIcon, { color: connectionStatus?.statusColor || '#757575' }]}>
                    {connectionStatus?.status === 'Connected' ? '✅' : '❌'}
                  </Text>
                  <Text style={[styles.statusText, { color: connectionStatus?.statusColor || '#757575' }]}>
                    {connectionStatus?.status || 'Unknown'}
                  </Text>
                </View>
              </View>

              {/* Last Checked */}
              <View style={styles.statusItem}>
                <Text style={styles.statusItemLabel}>Last Checked</Text>
                <Text style={styles.statusItemValue}>
                  {getLastSyncText(connectionStatus?.lastChecked)}
                </Text>
              </View>

              {/* Response Time */}
              <View style={styles.statusItem}>
                <Text style={styles.statusItemLabel}>Response Time</Text>
                <Text style={styles.statusItemValue}>
                  {connectionStatus?.responseTime ? `${connectionStatus.responseTime}ms` : 'N/A'}
                </Text>
              </View>

              {/* Files Available */}
              <View style={styles.statusItem}>
                <Text style={styles.statusItemLabel}>Files Available</Text>
                <Text style={styles.statusItemValue}>
                  {connectionStatus?.filesCount || 0}
                </Text>
              </View>
            </View>

            {/* Current Mode */}
            <View style={styles.modeInfo}>
              <Text style={styles.modeLabel}>Update Mode</Text>
              <Text style={styles.modeValue}>
                {connectionStatus?.mode === 'automatic' ? '🔄 Automatic' : '📋 Manual'}
              </Text>
            </View>

            {/* Selected File */}
            {connectionStatus?.selectedFile && (
              <View style={styles.fileInfo}>
                <Text style={styles.fileLabel}>Current File</Text>
                <Text style={styles.fileValue} numberOfLines={1}>
                  {connectionStatus.selectedFile}
                </Text>
              </View>
            )}

            {/* Error Message */}
            {connectionStatus?.error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{connectionStatus.error}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setShowDataSourceSelector(true)}
                disabled={loading}
              >
                <Text style={styles.primaryButtonIcon}>⚙️</Text>
                <Text style={styles.primaryButtonText}>Data Source</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleRefresh}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={styles.infoText}>
                This app syncs data from Supabase Storage. Use Data Source to switch between automatic (latest) and manual (select archive) modes.
              </Text>
            </View>
          </View>

          {/* Language Settings Card */}
          <View style={styles.statusCard}>
            <Text style={styles.cardTitle}>{t('sync.language_settings')}</Text>
            
            <View style={styles.languageRow}>
              <Text style={styles.languageLabel}>{t('sync.current_language')}</Text>
              <Text style={styles.languageValue}>
                {getAvailableLanguages().find(lang => lang.code === currentLanguage)?.nativeName || currentLanguage}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => setShowLanguageSelector(true)}
            >
              <Text style={styles.languageButtonIcon}>🌐</Text>
              <Text style={styles.languageButtonText}>{t('sync.select_language')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Data Source Selector Modal */}
      <DataSourceSelector
        visible={showDataSourceSelector}
        onClose={() => setShowDataSourceSelector(false)}
        onDataSourceChange={handleDataSourceChange}
      />

      {/* Language Selector Modal */}
      <Modal
        visible={showLanguageSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLanguageSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('sync.select_language')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowLanguageSelector(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.languageList}>
              {getAvailableLanguages().map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageOption,
                    currentLanguage === language.code && styles.languageOptionSelected
                  ]}
                  onPress={() => handleLanguageChange(language.code)}
                >
                  <View style={styles.languageInfo}>
                    <Text style={[
                      styles.languageName,
                      currentLanguage === language.code && styles.languageNameSelected
                    ]}>
                      {language.nativeName}
                    </Text>
                    <Text style={[
                      styles.languageCode,
                      currentLanguage === language.code && styles.languageCodeSelected
                    ]}>
                      {language.name}
                    </Text>
                  </View>
                  {currentLanguage === language.code && (
                    <Text style={styles.selectedIcon}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(30px)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.6)',
    paddingHorizontal: wp(6),
    paddingVertical: hp(2),
  },
  headerContent: {
    flex: 1,
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
  refreshButton: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(2.5),
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: {
    fontSize: wp(5),
  },

  // ==================== SCROLL CONTENT ====================
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: wp(6),
    paddingBottom: hp(3),
  },

  // ==================== STATUS CARD ====================
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: wp(4),
    padding: wp(5),
    marginTop: hp(2),
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: wp(5.5),
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: hp(2),
    letterSpacing: -0.5,
  },

  // ==================== STATUS GRID ====================
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(3),
    marginBottom: hp(2),
  },
  statusItem: {
    width: '47%',
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    padding: wp(3),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.5)',
  },
  statusItemLabel: {
    fontSize: wp(3.2),
    color: '#64748b',
    fontWeight: '600',
    marginBottom: hp(0.5),
  },
  statusItemValue: {
    fontSize: wp(4.5),
    color: '#0f172a',
    fontWeight: '700',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: wp(4),
    marginRight: wp(1),
  },
  statusText: {
    fontSize: wp(4),
    fontWeight: '700',
  },

  // ==================== MODE & FILE INFO ====================
  modeInfo: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    padding: wp(3),
    borderRadius: wp(3),
    marginBottom: hp(1.5),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeLabel: {
    fontSize: wp(3.5),
    color: '#64748b',
    fontWeight: '600',
  },
  modeValue: {
    fontSize: wp(4),
    color: '#6366f1',
    fontWeight: '700',
  },
  fileInfo: {
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    padding: wp(3),
    borderRadius: wp(3),
    marginBottom: hp(1.5),
  },
  fileLabel: {
    fontSize: wp(3.2),
    color: '#64748b',
    fontWeight: '600',
    marginBottom: hp(0.5),
  },
  fileValue: {
    fontSize: wp(3.5),
    color: '#0f172a',
    fontWeight: '600',
  },

  // ==================== ERROR BANNER ====================
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: wp(3),
    borderRadius: wp(3),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorIcon: {
    fontSize: wp(4.5),
    marginRight: wp(2),
  },
  errorText: {
    flex: 1,
    fontSize: wp(3.5),
    color: '#ef4444',
    fontWeight: '600',
  },

  // ==================== ACTION BUTTONS ====================
  actionButtons: {
    flexDirection: 'row',
    gap: wp(3),
    marginBottom: hp(2),
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: hp(1.8),
    borderRadius: wp(3),
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonIcon: {
    fontSize: wp(4.5),
    marginRight: wp(2),
  },
  primaryButtonText: {
    fontSize: wp(4),
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.8),
    borderRadius: wp(3),
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: wp(4),
    color: '#64748b',
    fontWeight: '700',
  },

  // ==================== INFO BOX ====================
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    padding: wp(3),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  infoIcon: {
    fontSize: wp(4),
    marginRight: wp(2),
  },
  infoText: {
    flex: 1,
    fontSize: wp(3.3),
    color: '#64748b',
    lineHeight: wp(5),
    fontWeight: '500',
  },

  // ==================== LANGUAGE SETTINGS ====================
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    padding: wp(3),
    borderRadius: wp(3),
    marginBottom: hp(2),
  },
  languageLabel: {
    fontSize: wp(3.5),
    color: '#64748b',
    fontWeight: '600',
  },
  languageValue: {
    fontSize: wp(4),
    color: '#0f172a',
    fontWeight: '700',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: hp(1.8),
    borderRadius: wp(3),
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  languageButtonIcon: {
    fontSize: wp(4.5),
    marginRight: wp(2),
  },
  languageButtonText: {
    fontSize: wp(4),
    color: '#fff',
    fontWeight: '700',
  },

  // ==================== LANGUAGE MODAL ====================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: wp(4),
    padding: wp(5),
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2.5),
    paddingBottom: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.6)',
  },
  modalTitle: {
    fontSize: wp(5.5),
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  modalCloseButton: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(2),
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: wp(5),
    color: '#64748b',
    fontWeight: '600',
  },
  languageList: {
    maxHeight: height * 0.5,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(4),
    borderRadius: wp(3),
    marginBottom: hp(1),
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.5)',
  },
  languageOptionSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: '#6366f1',
    borderWidth: 2,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: wp(4.2),
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: hp(0.3),
  },
  languageNameSelected: {
    color: '#6366f1',
  },
  languageCode: {
    fontSize: wp(3.5),
    color: '#64748b',
    fontWeight: '500',
  },
  languageCodeSelected: {
    color: '#6366f1',
  },
  selectedIcon: {
    fontSize: wp(5),
    color: '#6366f1',
    fontWeight: 'bold',
  },
});

export default ExportScreen;