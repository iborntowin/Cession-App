// Currency formatter for TND
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'N/A';
  return new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 3
  }).format(amount);
}

// FIXED: Utility function to normalize dates for consistent backend communication
export function normalizeDate(dateInput) {
  if (!dateInput) return null;
  
  try {
    let date;
    if (typeof dateInput === 'string') {
      // If already in YYYY-MM-DD format, return as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return dateInput;
      }
      date = new Date(dateInput);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      return null;
    }
    
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Return in YYYY-MM-DD format (ISO date string without time)
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error normalizing date:', dateInput, error);
    return null;
  }
}

// Date formatter with both English and French month names
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  // FIXED: Handle date parsing consistently across dev/prod environments
  let date;
  try {
    // If the dateString is in ISO format (YYYY-MM-DD), parse it as UTC to avoid timezone issues
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      // Parse as UTC date to avoid timezone conversion issues
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day); // month is 0-indexed in JS Date
    } else {
      date = new Date(dateString);
    }
    
    // Validate the date
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Invalid Date';
    }
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return 'Invalid Date';
  }
  
  // FIXED: Use consistent timezone for formatting to avoid dev/prod differences
  const options = { 
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
    day: 'numeric'
  };
  
  try {
    // Format: "12 June 2024 (12 juin 2024)"
    const englishMonth = date.toLocaleString('en-US', { ...options, month: 'long' });
    const frenchMonth = date.toLocaleString('fr-FR', { ...options, month: 'long' });
    
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${day} ${englishMonth.split(' ')[0]} ${year} (${day} ${frenchMonth.split(' ')[0]} ${year})`;
  } catch (error) {
    console.error('Error formatting date:', date, error);
    // Fallback to simple format
    return date.toISOString().split('T')[0];
  }
} 