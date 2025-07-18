// Currency formatting
export const formatCurrency = (amount, currency = 'TND') => {
  if (amount == null || isNaN(amount)) return 'N/A';
  
  const formattedAmount = parseFloat(amount).toFixed(2);
  return `${formattedAmount} ${currency}`;
};

// Date formatting
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

// Relative time formatting (e.g., "2 hours ago")
export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Never';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    
    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
    if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    
    return formatDate(dateString);
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Unknown';
  }
};

// Client number formatting
export const formatClientNumber = (number) => {
  if (!number) return 'N/A';
  return `#${number}`;
};

// Phone number formatting
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return 'N/A';
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format based on length (assuming Tunisian phone numbers)
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('216')) {
    return `+216 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  
  return phoneNumber; // Return original if can't format
};

// File size formatting
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

// Percentage formatting
export const formatPercentage = (value, decimals = 1) => {
  if (value == null || isNaN(value)) return '0%';
  return `${parseFloat(value).toFixed(decimals)}%`;
};

// Status formatting
export const formatStatus = (status) => {
  if (!status) return 'Unknown';
  
  const statusMap = {
    'ACTIVE': 'Active',
    'COMPLETED': 'Completed',
    'OVERDUE': 'Overdue',
    'PENDING': 'Pending',
    'CANCELLED': 'Cancelled',
    'SUCCESS': 'Success',
    'FAILED': 'Failed',
    'IN_PROGRESS': 'In Progress',
  };
  
  return statusMap[status] || status;
};

// Name formatting (capitalize first letter of each word)
export const formatName = (name) => {
  if (!name) return 'N/A';
  
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// CIN formatting (Tunisian National ID)
export const formatCIN = (cin) => {
  if (!cin) return 'N/A';
  
  // Remove all non-digit characters
  const cleaned = cin.replace(/\D/g, '');
  
  // Format as XXXXXXXX if 8 digits
  if (cleaned.length === 8) {
    return cleaned;
  }
  
  return cin; // Return original if can't format
};

// Worker number formatting
export const formatWorkerNumber = (workerNumber) => {
  if (!workerNumber) return 'N/A';
  return workerNumber.toString();
};

// Duration formatting (in months)
export const formatDuration = (months) => {
  if (!months || months === 0) return 'N/A';
  
  if (months < 12) {
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  let result = `${years} year${years > 1 ? 's' : ''}`;
  if (remainingMonths > 0) {
    result += ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  }
  
  return result;
};

// Progress formatting
export const formatProgress = (current, total) => {
  if (!total || total === 0) return '0%';
  
  const percentage = (current / total) * 100;
  return `${Math.min(percentage, 100).toFixed(1)}%`;
};

// Validation helpers
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,15}$/;
  return phoneRegex.test(phone);
};

export const isValidCIN = (cin) => {
  const cinRegex = /^[0-9]{8}$/;
  return cinRegex.test(cin);
};

// Text truncation
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

// Search highlighting
export const highlightSearchTerm = (text, searchTerm) => {
  if (!text || !searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

// Default export with all formatters
export default {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  formatClientNumber,
  formatPhoneNumber,
  formatFileSize,
  formatPercentage,
  formatStatus,
  formatName,
  formatCIN,
  formatWorkerNumber,
  formatDuration,
  formatProgress,
  isValidEmail,
  isValidPhoneNumber,
  isValidCIN,
  truncateText,
  highlightSearchTerm,
};