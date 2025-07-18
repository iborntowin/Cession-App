import { browser } from '$app/environment';

// Dynamically import Tauri APIs only in browser environment
let invoke, listen;
let tauriInitialized = false;

async function initializeTauri() {
  if (!browser || tauriInitialized) return;
  
  // Check if we're in a Tauri environment
  if (typeof window !== 'undefined' && !window.__TAURI__) {
    console.log('Not in Tauri environment, skipping Tauri API initialization');
    return;
  }
  
  try {
    // Use Function constructor to avoid static analysis
    const importTauri = new Function('return import("@tauri-apps/api/tauri")');
    const importEvent = new Function('return import("@tauri-apps/api/event")');
    
    const tauriModule = await importTauri();
    const eventModule = await importEvent();
    
    invoke = tauriModule.invoke;
    listen = eventModule.listen;
    tauriInitialized = true;
    
    console.log('Tauri APIs initialized successfully');
  } catch (error) {
    console.warn('Tauri APIs not available:', error);
  }
}

/**
 * Error Service for handling application errors and recovery
 */
class ErrorService {
  constructor() {
    this.errorListeners = [];
    this.recoveryListeners = [];
    this.notificationListeners = [];
    this.initialized = false;
    this.init();
  }

  /**
   * Initialize the error service
   */
  async init() {
    await initializeTauri();
    await this.setupEventListeners();
    this.initialized = true;
  }

  /**
   * Setup Tauri event listeners for error events
   */
  async setupEventListeners() {
    if (!browser) {
      console.log('Skipping event listeners setup - not in browser environment');
      return;
    }

    // Wait for Tauri to be initialized
    if (!tauriInitialized) {
      console.log('Tauri not initialized yet, skipping event listeners setup');
      return;
    }

    try {
      // Listen for error events from Rust backend
      await listen('error-occurred', (event) => {
        this.handleErrorEvent(event.payload);
      });

      await listen('recovery-successful', (event) => {
        this.handleRecoverySuccess(event.payload);
      });

      await listen('recovery-failed', (event) => {
        this.handleRecoveryFailure(event.payload);
      });

      await listen('backend-error', (event) => {
        this.handleBackendError(event.payload);
      });

      console.log('Error service event listeners initialized');
    } catch (error) {
      console.error('Failed to setup error service event listeners:', error);
    }
  }

  /**
   * Handle error event from backend
   */
  handleErrorEvent(errorData) {
    console.log('Error event received:', errorData);
    
    // Notify all error listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(errorData);
      } catch (error) {
        console.error('Error in error listener:', error);
      }
    });

    // Show notification for user
    this.showErrorNotification(errorData);
  }

  /**
   * Handle recovery success event
   */
  handleRecoverySuccess(recoveryData) {
    console.log('Recovery successful:', recoveryData);
    
    this.recoveryListeners.forEach(listener => {
      try {
        listener({ success: true, ...recoveryData });
      } catch (error) {
        console.error('Error in recovery listener:', error);
      }
    });

    // Show success notification
    this.showNotification({
      type: 'success',
      title: 'Recovery Successful',
      message: `${recoveryData.recovery_action} completed successfully`,
      autoHide: true,
      hideDelay: 3000
    });
  }

  /**
   * Handle recovery failure event
   */
  handleRecoveryFailure(recoveryData) {
    console.log('Recovery failed:', recoveryData);
    
    this.recoveryListeners.forEach(listener => {
      try {
        listener({ success: false, ...recoveryData });
      } catch (error) {
        console.error('Error in recovery listener:', error);
      }
    });

    // Show failure notification
    this.showNotification({
      type: 'error',
      title: 'Recovery Failed',
      message: `Failed to recover: ${recoveryData.error}`,
      actions: [
        { type: 'analyze_error', label: 'Get Help', primary: true },
        { type: 'dismiss', label: 'Dismiss', primary: false }
      ]
    });
  }

  /**
   * Handle backend error event
   */
  handleBackendError(errorMessage) {
    console.log('Backend error:', errorMessage);
    
    this.showNotification({
      type: 'error',
      title: 'Backend Error',
      message: errorMessage,
      actions: [
        { type: 'analyze_error', label: 'Troubleshoot', primary: true },
        { type: 'retry', label: 'Retry', primary: false },
        { type: 'dismiss', label: 'Dismiss', primary: false }
      ]
    });
  }

  /**
   * Show error notification to user
   */
  showErrorNotification(errorData) {
    const notification = {
      type: 'error',
      title: 'Application Error',
      message: errorData.error_info?.user_message || errorData.error || 'An unexpected error occurred',
      actions: [
        { type: 'analyze_error', label: 'Get Help', primary: true },
        { type: 'dismiss', label: 'Dismiss', primary: false }
      ]
    };

    this.showNotification(notification);
  }

  /**
   * Show notification to user
   */
  showNotification(notification) {
    this.notificationListeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  /**
   * Analyze error and get recovery suggestions
   */
  async analyzeError(errorMessage) {
    if (!browser || !invoke) {
      console.warn('Tauri invoke not available, using fallback error analysis');
      return this.getFallbackErrorInfo(errorMessage);
    }

    try {
      const errorInfo = await invoke('analyze_error', { errorMessage });
      return errorInfo;
    } catch (error) {
      console.error('Failed to analyze error:', error);
      return this.getFallbackErrorInfo(errorMessage);
    }
  }

  /**
   * Attempt error recovery
   */
  async attemptRecovery(recoveryAction) {
    if (!browser || !invoke) {
      console.warn('Tauri invoke not available, cannot attempt recovery');
      return { success: false, error: 'Recovery not available in this environment' };
    }

    try {
      const result = await invoke('attempt_error_recovery', { recoveryAction });
      return { success: true, result };
    } catch (error) {
      console.error('Failed to attempt recovery:', error);
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Get recovery suggestions for error type
   */
  async getRecoverySuggestions(errorType) {
    if (!browser || !invoke) {
      console.warn('Tauri invoke not available, using fallback recovery suggestions');
      return this.getFallbackRecoverySuggestions(errorType);
    }

    try {
      const suggestions = await invoke('get_recovery_suggestions', { errorType });
      return suggestions;
    } catch (error) {
      console.error('Failed to get recovery suggestions:', error);
      return this.getFallbackRecoverySuggestions(errorType);
    }
  }

  /**
   * Trigger automatic recovery
   */
  async triggerAutomaticRecovery(errorMessage) {
    if (!browser || !invoke) {
      console.warn('Tauri invoke not available, cannot trigger automatic recovery');
      return 'Automatic recovery not available in this environment';
    }

    try {
      const result = await invoke('trigger_automatic_recovery', { errorMessage });
      return result;
    } catch (error) {
      console.error('Failed to trigger automatic recovery:', error);
      throw error;
    }
  }

  /**
   * Get diagnostic information
   */
  async getDiagnosticInfo() {
    if (!browser || !invoke) {
      console.warn('Tauri invoke not available, cannot get diagnostic info');
      return null;
    }

    try {
      const diagnosticInfo = await invoke('get_diagnostic_info');
      return diagnosticInfo;
    } catch (error) {
      console.error('Failed to get diagnostic info:', error);
      throw error;
    }
  }

  /**
   * Export logs for support
   */
  async exportLogs() {
    if (!browser || !invoke) {
      console.warn('Tauri invoke not available, cannot export logs');
      return null;
    }

    try {
      const exportPath = await invoke('export_logs');
      return exportPath;
    } catch (error) {
      console.error('Failed to export logs:', error);
      throw error;
    }
  }

  /**
   * Fallback error info when Tauri is not available
   */
  getFallbackErrorInfo(errorMessage) {
    const errorType = this.classifyError(errorMessage);
    const guidance = this.getErrorGuidance(errorType);
    
    return {
      error_type: errorType,
      error_message: errorMessage,
      user_message: guidance.message,
      recovery_actions: [
        { ShowTroubleshootingGuide: 'https://docs.example.com/troubleshooting' },
        { ContactSupport: 'support@example.com' }
      ],
      technical_details: errorMessage,
      timestamp: new Date().toISOString(),
      severity: 'Medium'
    };
  }

  /**
   * Fallback recovery suggestions when Tauri is not available
   */
  getFallbackRecoverySuggestions(errorType) {
    const guidance = this.getErrorGuidance(errorType);
    return [
      { ShowTroubleshootingGuide: 'https://docs.example.com/troubleshooting' },
      { ContactSupport: 'support@example.com' }
    ];
  }

  /**
   * Classify error type based on error message
   */
  classifyError(errorMessage) {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('java') || message.includes('jre')) {
      return 'java_not_found';
    } else if (message.includes('jar') || message.includes('file not found')) {
      return 'jar_not_found';
    } else if (message.includes('port') || message.includes('address already in use')) {
      return 'port_conflict';
    } else if (message.includes('database') || message.includes('connection')) {
      return 'database_error';
    } else if (message.includes('permission') || message.includes('access denied')) {
      return 'permission_denied';
    } else {
      return 'unknown_error';
    }
  }

  /**
   * Add error listener
   */
  onError(listener) {
    this.errorListeners.push(listener);
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * Add recovery listener
   */
  onRecovery(listener) {
    this.recoveryListeners.push(listener);
    return () => {
      const index = this.recoveryListeners.indexOf(listener);
      if (index > -1) {
        this.recoveryListeners.splice(index, 1);
      }
    };
  }

  /**
   * Add notification listener
   */
  onNotification(listener) {
    this.notificationListeners.push(listener);
    return () => {
      const index = this.notificationListeners.indexOf(listener);
      if (index > -1) {
        this.notificationListeners.splice(index, 1);
      }
    };
  }

  /**
   * Handle common error scenarios with user-friendly messages
   */
  getErrorGuidance(errorType) {
    const guidance = {
      java_not_found: {
        title: 'Java Required',
        message: 'This application requires Java to run. Please install Java 17 or higher.',
        solutions: [
          'Download Java from the official website',
          'Restart the application after installation',
          'Contact support if the problem persists'
        ],
        downloadUrl: 'https://adoptium.net/temurin/releases/'
      },
      jar_not_found: {
        title: 'Application Files Missing',
        message: 'Some application files are missing or corrupted.',
        solutions: [
          'Reinstall the application',
          'Check if antivirus software is blocking files',
          'Run the application as administrator'
        ]
      },
      port_conflict: {
        title: 'Port Conflict',
        message: 'Another application is using the required network port.',
        solutions: [
          'Close other applications that might be using the port',
          'Restart your computer',
          'The application will try alternative ports automatically'
        ]
      },
      database_error: {
        title: 'Database Error',
        message: 'There was a problem with the application database.',
        solutions: [
          'The application will attempt to repair the database',
          'Restart the application',
          'Contact support if data recovery is needed'
        ]
      },
      permission_denied: {
        title: 'Permission Error',
        message: 'The application doesn\'t have the necessary permissions.',
        solutions: [
          'Run the application as administrator',
          'Check file and folder permissions',
          'Disable antivirus temporarily to test'
        ]
      }
    };

    return guidance[errorType] || {
      title: 'Unexpected Error',
      message: 'An unexpected error occurred.',
      solutions: [
        'Restart the application',
        'Check the troubleshooting guide',
        'Contact support for assistance'
      ]
    };
  }
}

// Create singleton instance
const errorService = new ErrorService();

export default errorService;