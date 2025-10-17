// Toast utility functions
// Import this in any component to show toasts easily

export const toast = {
  success(message, options = {}) {
    if (typeof window !== 'undefined' && window.addToast) {
      return window.addToast({
        message,
        type: 'success',
        duration: options.duration || 5000,
        action: options.action
      });
    }
  },
  
  error(message, options = {}) {
    if (typeof window !== 'undefined' && window.addToast) {
      return window.addToast({
        message,
        type: 'error',
        duration: options.duration || 7000, // Errors stay longer
        action: options.action
      });
    }
  },
  
  warning(message, options = {}) {
    if (typeof window !== 'undefined' && window.addToast) {
      return window.addToast({
        message,
        type: 'warning',
        duration: options.duration || 6000,
        action: options.action
      });
    }
  },
  
  info(message, options = {}) {
    if (typeof window !== 'undefined' && window.addToast) {
      return window.addToast({
        message,
        type: 'info',
        duration: options.duration || 5000,
        action: options.action
      });
    }
  },
  
  // Special toasts
  promise(promise, messages) {
    let toastId;
    
    // Show loading toast
    if (typeof window !== 'undefined' && window.addToast) {
      toastId = window.addToast({
        message: messages.loading,
        type: 'info',
        duration: 0 // Don't auto-dismiss
      });
    }
    
    return promise
      .then((data) => {
        // Remove loading toast
        if (toastId && typeof window !== 'undefined' && window.removeToast) {
          window.removeToast(toastId);
        }
        
        // Show success
        const message = typeof messages.success === 'function' 
          ? messages.success(data) 
          : messages.success;
        toast.success(message);
        
        return data;
      })
      .catch((error) => {
        // Remove loading toast
        if (toastId && typeof window !== 'undefined' && window.removeToast) {
          window.removeToast(toastId);
        }
        
        // Show error
        const message = typeof messages.error === 'function' 
          ? messages.error(error) 
          : messages.error;
        toast.error(message);
        
        throw error;
      });
  }
};

// Export for direct import
export default toast;
