/**
 * Navigation History Store
 * Provides browser-like back/forward navigation with scroll position preservation
 * and page state management
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

// Maximum number of history entries to keep
const MAX_HISTORY_SIZE = 50;

// Navigation history state
const createNavigationHistory = () => {
  const { subscribe, set, update } = writable({
    entries: [],
    currentIndex: -1,
    initialized: false
  });

  return {
    subscribe,
    
    /**
     * Initialize the history store
     */
    init: () => {
      if (!browser) return;
      
      update(state => {
        if (state.initialized) return state;
        
        // Try to restore from sessionStorage
        try {
          const saved = sessionStorage.getItem('navigationHistory');
          if (saved) {
            const parsed = JSON.parse(saved);
            return {
              ...parsed,
              initialized: true
            };
          }
        } catch (error) {
          console.error('Failed to restore navigation history:', error);
        }
        
        return {
          entries: [],
          currentIndex: -1,
          initialized: true
        };
      });
    },
    
    /**
     * Push a new entry to the history
     * @param {string} path - The URL path
     * @param {object} state - Optional state to save with the entry
     */
    push: (path, state = {}) => {
      if (!browser) return;
      
      update(history => {
        // Don't add duplicate consecutive entries
        if (history.currentIndex >= 0) {
          const currentEntry = history.entries[history.currentIndex];
          if (currentEntry && currentEntry.path === path) {
            // Update the current entry's state and scroll position
            history.entries[history.currentIndex] = {
              ...currentEntry,
              state: { ...currentEntry.state, ...state },
              scrollY: window.scrollY,
              scrollX: window.scrollX,
              timestamp: Date.now()
            };
            saveToSessionStorage(history);
            return history;
          }
        }
        
        // Remove entries after current index (forward history is lost)
        const entries = history.entries.slice(0, history.currentIndex + 1);
        
        // Add new entry with scroll position
        const newEntry = {
          path,
          state,
          scrollY: 0,
          scrollX: 0,
          timestamp: Date.now(),
          id: `${Date.now()}-${Math.random()}`
        };
        
        entries.push(newEntry);
        
        // Limit history size
        const trimmedEntries = entries.length > MAX_HISTORY_SIZE
          ? entries.slice(entries.length - MAX_HISTORY_SIZE)
          : entries;
        
        const newHistory = {
          entries: trimmedEntries,
          currentIndex: trimmedEntries.length - 1,
          initialized: true
        };
        
        saveToSessionStorage(newHistory);
        return newHistory;
      });
    },
    
    /**
     * Navigate back in history
     */
    back: async () => {
      if (!browser) return false;
      
      const state = get({ subscribe });
      
      if (!checkCanGoBack(state)) {
        return false;
      }
      
      // Save current scroll position
      const currentEntry = state.entries[state.currentIndex];
      if (currentEntry) {
        currentEntry.scrollY = window.scrollY;
        currentEntry.scrollX = window.scrollX;
      }
      
      const newIndex = state.currentIndex - 1;
      const targetEntry = state.entries[newIndex];
      
      if (!targetEntry) return false;
      
      // Update index
      update(history => {
        const newHistory = {
          ...history,
          currentIndex: newIndex
        };
        saveToSessionStorage(newHistory);
        return newHistory;
      });
      
      // Navigate to the target path
      await goto(targetEntry.path, { replaceState: true });
      
      // Restore scroll position after navigation
      requestAnimationFrame(() => {
        window.scrollTo({
          top: targetEntry.scrollY || 0,
          left: targetEntry.scrollX || 0,
          behavior: 'instant'
        });
      });
      
      return true;
    },
    
    /**
     * Navigate forward in history
     */
    forward: async () => {
      if (!browser) return false;
      
      const state = get({ subscribe });
      
      if (!checkCanGoForward(state)) {
        return false;
      }
      
      // Save current scroll position
      const currentEntry = state.entries[state.currentIndex];
      if (currentEntry) {
        currentEntry.scrollY = window.scrollY;
        currentEntry.scrollX = window.scrollX;
      }
      
      const newIndex = state.currentIndex + 1;
      const targetEntry = state.entries[newIndex];
      
      if (!targetEntry) return false;
      
      // Update index
      update(history => {
        const newHistory = {
          ...history,
          currentIndex: newIndex
        };
        saveToSessionStorage(newHistory);
        return newHistory;
      });
      
      // Navigate to the target path
      await goto(targetEntry.path, { replaceState: true });
      
      // Restore scroll position after navigation
      requestAnimationFrame(() => {
        window.scrollTo({
          top: targetEntry.scrollY || 0,
          left: targetEntry.scrollX || 0,
          behavior: 'instant'
        });
      });
      
      return true;
    },
    
    /**
     * Update the current entry's scroll position
     */
    updateScrollPosition: () => {
      if (!browser) return;
      
      update(history => {
        if (history.currentIndex >= 0 && history.entries[history.currentIndex]) {
          history.entries[history.currentIndex].scrollY = window.scrollY;
          history.entries[history.currentIndex].scrollX = window.scrollX;
          saveToSessionStorage(history);
        }
        return history;
      });
    },
    
    /**
     * Update the current entry's state
     * @param {object} state - State to merge with current entry
     */
    updateState: (state) => {
      if (!browser) return;
      
      update(history => {
        if (history.currentIndex >= 0 && history.entries[history.currentIndex]) {
          history.entries[history.currentIndex].state = {
            ...history.entries[history.currentIndex].state,
            ...state
          };
          saveToSessionStorage(history);
        }
        return history;
      });
    },
    
    /**
     * Clear all history
     */
    clear: () => {
      const newHistory = {
        entries: [],
        currentIndex: -1,
        initialized: true
      };
      
      set(newHistory);
      
      if (browser) {
        try {
          sessionStorage.removeItem('navigationHistory');
        } catch (error) {
          console.error('Failed to clear navigation history from sessionStorage:', error);
        }
      }
    },
    
    /**
     * Get current entry
     */
    getCurrent: () => {
      const state = get({ subscribe });
      if (state.currentIndex >= 0 && state.entries[state.currentIndex]) {
        return state.entries[state.currentIndex];
      }
      return null;
    }
  };
};

/**
 * Helper function to check if we can go back
 */
function checkCanGoBack(state) {
  return state.currentIndex > 0;
}

/**
 * Helper function to check if we can go forward
 */
function checkCanGoForward(state) {
  return state.currentIndex < state.entries.length - 1;
}

/**
 * Save history to sessionStorage
 */
function saveToSessionStorage(history) {
  if (!browser) return;
  
  try {
    sessionStorage.setItem('navigationHistory', JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save navigation history to sessionStorage:', error);
  }
}

// Create the store instance
export const navigationHistory = createNavigationHistory();

// Derived stores for UI state
export const canGoBack = derived(
  navigationHistory,
  $history => $history.currentIndex > 0
);

export const canGoForward = derived(
  navigationHistory,
  $history => $history.currentIndex < $history.entries.length - 1
);

export const currentEntry = derived(
  navigationHistory,
  $history => {
    if ($history.currentIndex >= 0 && $history.entries[$history.currentIndex]) {
      return $history.entries[$history.currentIndex];
    }
    return null;
  }
);

export const historyLength = derived(
  navigationHistory,
  $history => $history.entries.length
);

// Keyboard shortcut support
if (browser) {
  window.addEventListener('keydown', (e) => {
    // Alt+Left Arrow = Back
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      navigationHistory.back();
    }
    // Alt+Right Arrow = Forward
    else if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      navigationHistory.forward();
    }
  });
  
  // Save scroll position periodically
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      navigationHistory.updateScrollPosition();
    }, 150);
  }, { passive: true });
}
