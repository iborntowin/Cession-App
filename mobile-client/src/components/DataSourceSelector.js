import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  Alert
} from 'react-native';
import { supabaseService } from '../services/supabaseService';

const DataSourceSelector = ({ visible, onClose, onDataSourceChange }) => {
  const [mode, setMode] = useState('automatic');
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCurrentSettings();
    }
  }, [visible]);

  const loadCurrentSettings = async () => {
    try {
      const connectionInfo = supabaseService.getConnectionInfo();
      setMode(connectionInfo.mode || 'automatic');
      setAvailableFiles(connectionInfo.availableFiles || []);
      setSelectedFile(connectionInfo.selectedFile);
    } catch (error) {
      console.error('Error loading current settings:', error);
    }
  };

  const handleModeChange = async (newMode) => {
    try {
      setLoading(true);
      await supabaseService.setMode(newMode);
      setMode(newMode);
      
      if (newMode === 'automatic') {
        // In automatic mode, clear selected file
        setSelectedFile(null);
      }
      
      if (onDataSourceChange) {
        onDataSourceChange();
      }
    } catch (error) {
      Alert.alert('Error', `Failed to change mode: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelection = async (fileName) => {
    try {
      setLoading(true);
      await supabaseService.selectFile(fileName);
      setSelectedFile(fileName);
      
      if (onDataSourceChange) {
        onDataSourceChange();
      }
      
      Alert.alert(
        'File Selected',
        `Now using data from: ${formatFileName(fileName)}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to select file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatFileName = (fileName) => {
    if (!fileName) return 'Unknown';
    
    // Extract timestamp from filename like "export-1752596070631.json"
    const match = fileName.match(/export-(\d+)\.json/);
    if (match) {
      const timestamp = parseInt(match[1]);
      const date = new Date(timestamp);
      return date.toLocaleString();
    }
    
    return fileName;
  };

  const formatFileSize = (size) => {
    if (!size || size === 0) return 'Unknown size';
    
    const sizeNum = parseInt(size);
    if (sizeNum < 1024) return `${sizeNum} B`;
    if (sizeNum < 1024 * 1024) return `${(sizeNum / 1024).toFixed(1)} KB`;
    return `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTimeDifference = (timestamp) => {
    const now = new Date();
    const fileDate = new Date(timestamp);
    const diffMs = now - fileDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return fileDate.toLocaleDateString();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Data Source</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Mode Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Update Mode</Text>
            <Text style={styles.sectionDescription}>
              Choose how the app gets data updates from the server.
            </Text>
            
            <View style={styles.modeContainer}>
              <View style={styles.modeOption}>
                <View style={styles.modeInfo}>
                  <Text style={styles.modeTitle}>🔄 Automatic</Text>
                  <Text style={styles.modeDescription}>
                    Always uses the most recent export file
                  </Text>
                </View>
                <Switch
                  value={mode === 'automatic'}
                  onValueChange={(value) => handleModeChange(value ? 'automatic' : 'manual')}
                  disabled={loading}
                />
              </View>
              
              <View style={styles.modeOption}>
                <View style={styles.modeInfo}>
                  <Text style={styles.modeTitle}>📋 Manual</Text>
                  <Text style={styles.modeDescription}>
                    Choose from recent export files
                  </Text>
                </View>
                <Switch
                  value={mode === 'manual'}
                  onValueChange={(value) => handleModeChange(value ? 'manual' : 'automatic')}
                  disabled={loading}
                />
              </View>
            </View>
          </View>

          {/* Current Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Data Source</Text>
            <View style={styles.currentSelection}>
              <Text style={styles.currentMode}>
                Mode: {mode === 'automatic' ? '🔄 Automatic' : '📋 Manual'}
              </Text>
              {selectedFile && (
                <Text style={styles.currentFile}>
                  File: {formatFileName(selectedFile)}
                </Text>
              )}
            </View>
          </View>

          {/* File Selection (only in manual mode) */}
          {mode === 'manual' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Export Files</Text>
              <Text style={styles.sectionDescription}>
                Select which export file to use for data display.
              </Text>
              
              {availableFiles.length === 0 ? (
                <View style={styles.noFiles}>
                  <Text style={styles.noFilesText}>No export files available</Text>
                  <Text style={styles.noFilesSubtext}>
                    Please trigger an export from the backend first
                  </Text>
                </View>
              ) : (
                <View style={styles.fileList}>
                  {availableFiles.map((file, index) => (
                    <TouchableOpacity
                      key={file.fileName}
                      style={[
                        styles.fileItem,
                        selectedFile === file.fileName && styles.fileItemSelected,
                        index === 0 && styles.fileItemLatest
                      ]}
                      onPress={() => handleFileSelection(file.fileName)}
                      disabled={loading}
                    >
                      <View style={styles.fileHeader}>
                        <View style={styles.fileInfo}>
                          <Text style={styles.fileName}>
                            {index === 0 ? '🆕 Latest' : `📄 Archive ${index}`}
                          </Text>
                          <Text style={styles.fileDate}>
                            {formatFileName(file.fileName)}
                          </Text>
                        </View>
                        <View style={styles.fileStatus}>
                          {selectedFile === file.fileName && (
                            <Text style={styles.selectedBadge}>✓ Selected</Text>
                          )}
                          <Text style={styles.fileAge}>
                            {getTimeDifference(file.timestamp)}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.fileDetails}>
                        <Text style={styles.fileSize}>
                          Size: {formatFileSize(file.size)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>💡 How it works</Text>
            <View style={styles.infoList}>
              <Text style={styles.infoItem}>
                • <Text style={styles.infoBold}>Automatic mode</Text>: Always shows the most recent data
              </Text>
              <Text style={styles.infoItem}>
                • <Text style={styles.infoBold}>Manual mode</Text>: Choose from the last 3 export files
              </Text>
              <Text style={styles.infoItem}>
                • Data is cached locally for offline access
              </Text>
              <Text style={styles.infoItem}>
                • Files are automatically updated when new exports are created
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modeContainer: {
    gap: 12,
  },
  modeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modeInfo: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
  },
  currentSelection: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
  },
  currentMode: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 4,
  },
  currentFile: {
    fontSize: 14,
    color: '#666',
  },
  noFiles: {
    alignItems: 'center',
    padding: 20,
  },
  noFilesText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  noFilesSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  fileList: {
    gap: 12,
  },
  fileItem: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  fileItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  fileItemLatest: {
    borderColor: '#4CAF50',
  },
  fileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  fileDate: {
    fontSize: 14,
    color: '#666',
  },
  fileStatus: {
    alignItems: 'flex-end',
  },
  selectedBadge: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  fileAge: {
    fontSize: 12,
    color: '#999',
  },
  fileDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  fileSize: {
    fontSize: 12,
    color: '#999',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '600',
    color: '#333',
  },
});

export default DataSourceSelector;