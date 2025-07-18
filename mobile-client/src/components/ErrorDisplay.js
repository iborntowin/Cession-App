import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ErrorHandler } from '../utils/errorHandling';

/**
 * Component for displaying user-friendly error messages with retry options
 */
const ErrorDisplay = ({ 
  error, 
  context = '', 
  onRetry = null, 
  onDismiss = null,
  showDetails = false,
  style = {},
  compact = false 
}) => {
  if (!error) {
    return null;
  }

  const errorInfo = ErrorHandler.createUserFriendlyMessage(error, context);
  const classification = ErrorHandler.classify(error);

  const getErrorIcon = (type, severity) => {
    if (severity === 'high') return '🚨';
    if (type === 'network') return '📡';
    if (type === 'timeout') return '⏱️';
    if (type === 'sync') return '🔄';
    if (type === 'cache') return '💾';
    return '⚠️';
  };

  const getErrorColor = (severity) => {
    switch (severity) {
      case 'high': return '#DC2626';
      case 'medium': return '#D97706';
      case 'low': return '#059669';
      default: return '#6B7280';
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactContent}>
          <Text style={styles.compactIcon}>
            {getErrorIcon(classification.type, classification.severity)}
          </Text>
          <Text style={[styles.compactMessage, { color: getErrorColor(classification.severity) }]}>
            {errorInfo.message}
          </Text>
        </View>
        {errorInfo.isRetryable && onRetry && (
          <TouchableOpacity style={styles.compactRetryButton} onPress={handleRetry}>
            <Text style={styles.compactRetryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.errorCard, { borderLeftColor: getErrorColor(classification.severity) }]}>
        <View style={styles.header}>
          <Text style={styles.errorIcon}>
            {getErrorIcon(classification.type, classification.severity)}
          </Text>
          <View style={styles.headerText}>
            <Text style={styles.errorType}>
              {classification.type.replace('_', ' ').toUpperCase()} ERROR
            </Text>
            <Text style={styles.errorSeverity}>
              Severity: {classification.severity.toUpperCase()}
            </Text>
          </View>
          {onDismiss && (
            <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
              <Text style={styles.dismissText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.errorMessage}>{errorInfo.message}</Text>

        {showDetails && (
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>Technical Details:</Text>
            <Text style={styles.detailsText}>
              Type: {classification.type}
            </Text>
            <Text style={styles.detailsText}>
              Retryable: {classification.isRetryable ? 'Yes' : 'No'}
            </Text>
            {classification.attempts && (
              <Text style={styles.detailsText}>
                Attempts: {classification.attempts}
              </Text>
            )}
            {error.message && (
              <Text style={styles.detailsText}>
                Original: {error.message}
              </Text>
            )}
            {__DEV__ && error.stack && (
              <ScrollView style={styles.stackTrace} horizontal>
                <Text style={styles.stackText}>{error.stack}</Text>
              </ScrollView>
            )}
          </View>
        )}

        <View style={styles.actionButtons}>
          {errorInfo.isRetryable && onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}
          
          {onDismiss && (
            <TouchableOpacity style={styles.dismissActionButton} onPress={handleDismiss}>
              <Text style={styles.dismissActionButtonText}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

/**
 * Hook for managing error display state
 */
export const useErrorDisplay = () => {
  const [errors, setErrors] = React.useState([]);

  const showError = React.useCallback((error, context = '', options = {}) => {
    const errorId = Date.now().toString();
    const newError = {
      id: errorId,
      error,
      context,
      timestamp: new Date(),
      ...options
    };

    setErrors(prev => [...prev, newError]);

    // Auto-dismiss after timeout if specified
    if (options.autoDismiss) {
      setTimeout(() => {
        dismissError(errorId);
      }, options.autoDismiss);
    }

    return errorId;
  }, []);

  const dismissError = React.useCallback((errorId) => {
    setErrors(prev => prev.filter(e => e.id !== errorId));
  }, []);

  const clearAllErrors = React.useCallback(() => {
    setErrors([]);
  }, []);

  const retryError = React.useCallback((errorId, retryFunction) => {
    const error = errors.find(e => e.id === errorId);
    if (error && retryFunction) {
      dismissError(errorId);
      retryFunction();
    }
  }, [errors, dismissError]);

  return {
    errors,
    showError,
    dismissError,
    clearAllErrors,
    retryError
  };
};

/**
 * Component for displaying multiple errors in a stack
 */
export const ErrorStack = ({ errors, onRetry, onDismiss, maxVisible = 3 }) => {
  const visibleErrors = errors.slice(0, maxVisible);
  const hiddenCount = Math.max(0, errors.length - maxVisible);

  if (errors.length === 0) {
    return null;
  }

  return (
    <View style={styles.stackContainer}>
      {visibleErrors.map((errorItem, index) => (
        <ErrorDisplay
          key={errorItem.id}
          error={errorItem.error}
          context={errorItem.context}
          onRetry={() => onRetry && onRetry(errorItem.id)}
          onDismiss={() => onDismiss && onDismiss(errorItem.id)}
          compact={index > 0}
          style={{ marginBottom: 8 }}
        />
      ))}
      
      {hiddenCount > 0 && (
        <View style={styles.hiddenCountContainer}>
          <Text style={styles.hiddenCountText}>
            +{hiddenCount} more error{hiddenCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  errorCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  errorType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  errorSeverity: {
    fontSize: 10,
    color: '#6B7280',
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  errorMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  detailsSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  stackTrace: {
    maxHeight: 100,
    marginTop: 8,
  },
  stackText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  dismissActionButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  dismissActionButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  compactContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  compactMessage: {
    fontSize: 12,
    flex: 1,
  },
  compactRetryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  compactRetryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  stackContainer: {
    marginVertical: 8,
  },
  hiddenCountContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  hiddenCountText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default ErrorDisplay;