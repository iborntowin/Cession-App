// Format currency using Intl.NumberFormat
export function formatCurrency(amount) {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 3
  }).format(amount);
}

// Format date using Intl.DateTimeFormat
export function formatDate(date) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date));
}

// Re-export debounce from helpers
export { debounce } from './helpers';