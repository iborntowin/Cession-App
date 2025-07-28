/**
 * Page-specific loading states to prevent global flickering
 */
import { writable } from 'svelte/store';

// Create individual loading stores for each page
export const clientsLoading = writable(false);
export const cessionsLoading = writable(false);
export const inventoryLoading = writable(false);
export const paymentsLoading = writable(false);
export const financeLoading = writable(false);
export const sellingLoading = writable(false);

// Helper function to create page-specific loading manager
export function createPageLoadingManager(pageStore) {
  return {
    start: () => pageStore.set(true),
    stop: () => pageStore.set(false),
    async wrap(asyncFunction) {
      pageStore.set(true);
      try {
        return await asyncFunction();
      } finally {
        pageStore.set(false);
      }
    }
  };
}

// Pre-created managers for common pages
export const clientsLoadingManager = createPageLoadingManager(clientsLoading);
export const cessionsLoadingManager = createPageLoadingManager(cessionsLoading);
export const inventoryLoadingManager = createPageLoadingManager(inventoryLoading);
export const paymentsLoadingManager = createPageLoadingManager(paymentsLoading);
export const financeLoadingManager = createPageLoadingManager(financeLoading);
export const sellingLoadingManager = createPageLoadingManager(sellingLoading);