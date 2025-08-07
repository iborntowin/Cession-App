import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { wp, hp, rf, RESPONSIVE_STYLES } from '../utils/responsive';

const ErrorMessage = ({ 
  message = 'Something went wrong', 
  onRetry, 
  retryText = 'Try Again',
  style,
  showDetails = false,
  details = null
}) => {
  const [showDetailedError, setShowDetailedError] = React.useState(false);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorText}>{message}</Text>
      
      {showDetails && details && (
        <TouchableOpacity 
          style={styles.detailsButton}
          onPress={() => setShowDetailedError(!showDetailedError)}
        >
          <Text style={styles.detailsButtonText}>
            {showDetailedError ? 'Hide Details' : 'Show Details'}
          </Text>
        </TouchableOpacity>
      )}
      
      {showDetailedError && details && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsText}>{details}</Text>
        </View>
      )}
      
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>{retryText}</Text>
        </TouchableOpacity>
      )}
      
      <Text style={styles.helpText}>
        If this problem persists, try going to the Export tab and refreshing the data connection.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingVertical: hp(5),
  },
  errorIcon: {
    fontSize: rf(48),
    marginBottom: hp(2),
  },
  errorTitle: {
    fontSize: RESPONSIVE_STYLES.title.fontSize,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: hp(1),
  },
  errorText: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    color: '#FF5722',
    textAlign: 'center',
    marginBottom: hp(2),
    lineHeight: hp(3),
  },
  detailsButton: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    marginBottom: hp(2),
  },
  detailsButtonText: {
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    color: '#007AFF',
    textAlign: 'center',
  },
  detailsContainer: {
    backgroundColor: '#f5f5f5',
    padding: wp(3),
    borderRadius: RESPONSIVE_STYLES.card.borderRadius,
    marginBottom: hp(2),
    maxWidth: wp(90),
  },
  detailsText: {
    fontSize: RESPONSIVE_STYLES.caption.fontSize,
    color: '#666',
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: RESPONSIVE_STYLES.card.borderRadius,
    marginBottom: hp(2),
  },
  retryText: {
    color: '#fff',
    fontSize: RESPONSIVE_STYLES.body.fontSize,
    fontWeight: '500',
  },
  helpText: {
    fontSize: RESPONSIVE_STYLES.caption.fontSize,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: wp(4),
  },
});

export default ErrorMessage;