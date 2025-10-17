// Toast utility functions
// Import this in any component to show toasts easily

export const toast = {
  success(message, options = {}) {
    if (typeof window !== 'undefined' && (window as any).addToast) {
      return (window as any).addToast({
        message,
        type: 'success',
        duration: options?.duration || 5000,
        action: options?.action
      });
    }
  },
  
  error(message: string, options?: Partial<ToastOptions>) {
    if (typeof window !== 'undefined' && (window as any).addToast) {
      return (window as any).addToast({
        message,
        type: 'error',
        duration: options?.duration || 7000, // Errors stay longer
        action: options?.action
      });
    }
  },
  
  warning(message: string, options?: Partial<ToastOptions>) {
    if (typeof window !== 'undefined' && (window as any).addToast) {
      return (window as any).addToast({
        message,
        type: 'warning',
        duration: options?.duration || 6000,
        action: options?.action
      });
    }
  },
  
  info(message: string, options?: Partial<ToastOptions>) {
    if (typeof window !== 'undefined' && (window as any).addToast) {
      return (window as any).addToast({
        message,
        type: 'info',
        duration: options?.duration || 5000,
        action: options?.action
      });
    }
  },
  
  // Special toasts
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) {
    let toastId: string | undefined;
    
    // Show loading toast
    if (typeof window !== 'undefined' && (window as any).addToast) {
      toastId = (window as any).addToast({
        message: messages.loading,
        type: 'info',
        duration: 0 // Don't auto-dismiss
      });
    }
    
    return promise
      .then((data) => {
        // Remove loading toast
        if (toastId && typeof window !== 'undefined' && (window as any).removeToast) {
          (window as any).removeToast(toastId);
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
        if (toastId && typeof window !== 'undefined' && (window as any).removeToast) {
          (window as any).removeToast(toastId);
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
