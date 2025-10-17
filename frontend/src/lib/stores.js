import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Initialize stores with null values
export const token = writable(null);
export const user = writable(null);
export const loading = writable(false);
export const alert = writable({ show: false, message: '', type: 'info' });

// Initialize stores with localStorage values if in browser
if (browser) {
  const storedToken = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  
  if (storedToken) {
    console.log('Token Store - Initializing from localStorage');
    token.set(storedToken);
  }
  
  if (storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser);
      console.log('User Store - Initializing from localStorage');
      user.set(parsedUser);
    } catch (error) {
      console.error('User Store - Error parsing stored user:', error);
      localStorage.removeItem('user');
    }
  }
}

// Derived auth store that combines token and user
export const auth = derived(
  [token, user],
  ([$token, $user]) => ({
    isAuthenticated: !!$token,
    token: $token,
    user: $user
  })
);

// Subscribe to token changes to update localStorage
if (browser) {
  token.subscribe(value => {
    console.log('Token Store - Token changed:', !!value);
    if (value) {
      console.log('Token Store - Setting token in localStorage');
      try {
        localStorage.setItem('token', value);
      } catch (error) {
        console.error('Token Store - Error setting token in localStorage:', error);
      }
    } else {
      console.log('Token Store - Removing token from localStorage');
      try {
        localStorage.removeItem('token');
      } catch (error) {
        console.error('Token Store - Error removing token from localStorage:', error);
      }
    }
  });

  // Subscribe to user changes to update localStorage
  user.subscribe(value => {
    if (value) {
      try {
        localStorage.setItem('user', JSON.stringify(value));
      } catch (error) {
        console.error('User Store - Error setting user in localStorage:', error);
      }
    } else {
      try {
        localStorage.removeItem('user');
      } catch (error) {
        console.error('User Store - Error removing user from localStorage:', error);
      }
    }
  });
}

// Function to show alert using modern toast system
export const showAlert = (message, type = 'info') => {
  // Use modern toast system if available
  if (browser && typeof window !== 'undefined' && window.addToast) {
    const duration = type === 'error' ? 7000 : type === 'success' ? 5000 : 5000;
    window.addToast({
      message,
      type,
      duration
    });
  } else {
    // Fallback to old alert system
    alert.set({ show: true, message, type });
    setTimeout(() => {
      alert.set({ show: false, message: '', type: 'info' });
    }, 5000);
  }
};

// Function to clear authentication state
export const clearAuth = () => {
  if (browser) {
    try {
      console.log('clearAuth called: removing token and user from localStorage');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error clearing auth state:', error);
    }
  }
  console.log('clearAuth called: setting token and user to null in store');
  token.set(null);
  user.set(null);
};

// Function to set authentication state
export const setAuth = (newToken, userData) => {
  if (browser) {
    try {
      if (newToken) {
        localStorage.setItem('token', newToken);
      }
      if (userData) {
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Error setting auth state:', error);
    }
  }
  console.log('setAuth called: setting token and user in store', { hasToken: !!newToken, hasUser: !!userData });
  token.set(newToken);
  user.set(userData);
};
