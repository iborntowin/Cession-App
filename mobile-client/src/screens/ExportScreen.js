import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert
} from 'react-native';
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
    return <LoadingSpinner text="Loading connection status..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#007AFF']}
        />
      }
    >
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>📱 Mobile Data Sync</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={loading}
          >
            <Text style={styles.refreshIcon}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Enhanced Error Display */}
      <ErrorStack 
        errors={errors}
        onRetry={(errorId) => retryError(errorId, fetchConnectionStatus)}
        onDismiss={dismissError}
        maxVisible={2}
      />
      


      {/* Connection Status Information */}
      <View style={styles.statusCard}>
        <View style={styles.statusSection}>
          {/* Connection Status */}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Connection Status:</Text>
            <View style={styles.statusValue}>
              <View style={styles.statusIndicator}>
                <Text style={[styles.statusIcon, { color: connectionStatus?.statusColor || '#757575' }]}>
                  {connectionStatus?.status === 'Connected' ? '✅' : '❌'}
                </Text>
                <Text style={[styles.statusText, { color: connectionStatus?.statusColor || '#757575' }]}>
                  {connectionStatus?.status || 'Unknown'}
                </Text>
              </View>
            </View>
          </View>

          {/* Last Checked */}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last Checked:</Text>
            <Text style={styles.statusValueText}>
              {getLastSyncText(connectionStatus?.lastChecked)}
            </Text>
          </View>

          {/* Response Time */}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Response Time:</Text>
            <Text style={styles.statusValueText}>
              {connectionStatus?.responseTime || 'N/A'}
            </Text>
          </View>

          {/* Files Available */}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Files Available:</Text>
            <Text style={styles.statusValueText}>
              {connectionStatus?.filesCount || 0}
            </Text>
          </View>

          {/* Current Mode */}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Update Mode:</Text>
            <Text style={styles.statusValueText}>
              {connectionStatus?.mode === 'automatic' ? '🔄 Automatic' : '📋 Manual'}
            </Text>
          </View>

          {/* Selected File */}
          {connectionStatus?.selectedFile && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Current File:</Text>
              <Text style={styles.statusValueText} numberOfLines={1}>
                {connectionStatus.selectedFile}
              </Text>
            </View>
          )}

          {/* Error Message */}
          {connectionStatus?.error && (
            <View style={styles.failureCard}>
              <Text style={styles.failureText}>
                <Text style={styles.failureLabel}>Status: </Text>
                {connectionStatus.error}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.dataSourceButton}
            onPress={() => setShowDataSourceSelector(true)}
            disabled={loading}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonIcon}>⚙️</Text>
              <Text style={styles.buttonText}>Data Source</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshActionButton}
            onPress={handleRefresh}
            disabled={loading}
          >
            <Text style={styles.refreshActionButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Info Text */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            💡 <Text style={styles.infoTextBold}>Info:</Text> This mobile app consumes data from Supabase Storage.
            Use the Data Source button to switch between automatic (latest file) and manual (select from recent files) modes.
          </Text>
        </View>
      </View>

      {/* Language Settings */}
      <View style={styles.statusCard}>
        <Text style={styles.sectionTitle}>{t('sync.language_settings')}</Text>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t('sync.current_language')}:</Text>
          <Text style={styles.statusValueText}>
            {getAvailableLanguages().find(lang => lang.code === currentLanguage)?.nativeName || currentLanguage}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setShowLanguageSelector(true)}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonIcon}>🌐</Text>
            <Text style={styles.buttonText}>{t('sync.select_language')}</Text>
          </View>
        </TouchableOpacity>
      </View>

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


    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  refreshButton: {
    padding: 8,
  },
  refreshIcon: {
    fontSize: 16,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    margin: 16,
    padding: 12,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    flex: 1,
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusSection: {
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  statusValue: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statusValueText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    flex: 1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  linkText: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  failureCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  failureText: {
    fontSize: 14,
    color: '#DC2626',
  },
  failureLabel: {
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: 16,
  },
  dataSourceButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#fff',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  refreshActionButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshActionButtonDisabled: {
    backgroundColor: '#F9FAFB',
  },
  refreshActionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#1D4ED8',
    lineHeight: 16,
  },
  infoTextBold: {
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  languageButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#666',
  },
  languageList: {
    maxHeight: 300,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  languageOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  languageNameSelected: {
    color: '#1976D2',
  },
  languageCode: {
    fontSize: 14,
    color: '#666',
  },
  languageCodeSelected: {
    color: '#1976D2',
  },
  selectedIcon: {
    fontSize: 18,
    color: '#2196F3',
    fontWeight: 'bold',
  },
});

export default ExportScreen;