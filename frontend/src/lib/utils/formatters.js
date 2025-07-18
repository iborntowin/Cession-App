// Currency formatter for TND
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'N/A';
  return new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 3
  }).format(amount);
}

// Date formatter with both English and French month names
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  
  // Format: "12 June 2024 (12 Juin 2024)"
  const englishMonth = date.toLocaleString('en-US', { month: 'long' });
  const frenchMonth = date.toLocaleString('fr-FR', { month: 'long' });
  
  return `${date.getDate()} ${englishMonth} ${date.getFullYear()} (${date.getDate()} ${frenchMonth} ${date.getFullYear()})`;
} 