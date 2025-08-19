/**
 * Enhanced form validation utilities with security best practices
 */

/**
 * Validates CIN (Tunisian National ID)
 * @param {string} cin - The CIN to validate
 * @returns {object} - Validation result with isValid and message
 */
export function validateCIN(cin) {
  if (!cin) {
    return { isValid: false, message: 'CIN is required' };
  }
  
  // Remove any whitespace
  const cleanCIN = cin.trim();
  
  // Must be exactly 8 digits
  if (!/^\d{8}$/.test(cleanCIN)) {
    return { isValid: false, message: 'CIN must be exactly 8 digits' };
  }
  
  // Additional CIN validation rules (if any specific format required)
  // For now, 8 digits is sufficient for Tunisian CIN
  
  return { isValid: true, message: 'CIN is valid' };
}

/**
 * Validates worker number
 * @param {string} workerNumber - The worker number to validate
 * @returns {object} - Validation result with isValid and message
 */
export function validateWorkerNumber(workerNumber) {
  if (!workerNumber) {
    return { isValid: false, message: 'Worker number is required' };
  }
  
  // Remove any whitespace
  const cleanWorkerNumber = workerNumber.trim();
  
  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(cleanWorkerNumber)) {
    return { isValid: false, message: 'Worker number must be exactly 10 digits' };
  }
  
  return { isValid: true, message: 'Worker number is valid' };
}

/**
 * Validates phone number (international format support)
 * @param {string} phoneNumber - The phone number to validate
 * @param {boolean} required - Whether the field is required
 * @returns {object} - Validation result with isValid and message
 */
export function validatePhoneNumber(phoneNumber, required = false) {
  if (!phoneNumber || phoneNumber.trim() === '') {
    if (required) {
      return { isValid: false, message: 'Phone number is required' };
    }
    return { isValid: true, message: 'Phone number is optional' };
  }
  
  const cleanPhone = phoneNumber.trim();
  
  // Support international formats: +216XXXXXXXX, 216XXXXXXXX, or local 8-digit
  const phoneRegex = /^(?:\+?216)?[0-9]{8}$/;
  
  if (!phoneRegex.test(cleanPhone.replace(/[\s()-]/g, ''))) {
    return { isValid: false, message: 'Phone number format is invalid. Use +216XXXXXXXX or XXXXXXXX' };
  }
  
  return { isValid: true, message: 'Phone number is valid' };
}

/**
 * Validates email address
 * @param {string} email - The email to validate
 * @param {boolean} required - Whether the field is required
 * @returns {object} - Validation result with isValid and message
 */
export function validateEmail(email, required = false) {
  if (!email || email.trim() === '') {
    if (required) {
      return { isValid: false, message: 'Email is required' };
    }
    return { isValid: true, message: 'Email is optional' };
  }
  
  const cleanEmail = email.trim().toLowerCase();
  
  // RFC 5322 compliant email regex (simplified but secure)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(cleanEmail)) {
    return { isValid: false, message: 'Email format is invalid' };
  }
  
  if (cleanEmail.length > 255) {
    return { isValid: false, message: 'Email cannot exceed 255 characters' };
  }
  
  return { isValid: true, message: 'Email is valid' };
}

/**
 * Validates full name with support for Arabic and Latin characters
 * @param {string} fullName - The full name to validate
 * @returns {object} - Validation result with isValid and message
 */
export function validateFullName(fullName) {
  if (!fullName || fullName.trim() === '') {
    return { isValid: false, message: 'Full name is required' };
  }
  
  const cleanName = fullName.trim();
  
  if (cleanName.length < 2) {
    return { isValid: false, message: 'Full name must be at least 2 characters' };
  }
  
  if (cleanName.length > 100) {
    return { isValid: false, message: 'Full name cannot exceed 100 characters' };
  }
  
  // Allow Latin letters, Arabic letters, spaces, hyphens, apostrophes
  const nameRegex = /^[a-zA-Z\u0600-\u06FF\s'-]+$/;
  
  if (!nameRegex.test(cleanName)) {
    return { isValid: false, message: 'Full name can only contain letters, spaces, hyphens, and apostrophes' };
  }
  
  return { isValid: true, message: 'Full name is valid' };
}

/**
 * Validates address
 * @param {string} address - The address to validate
 * @returns {object} - Validation result with isValid and message
 */
export function validateAddress(address) {
  if (!address || address.trim() === '') {
    return { isValid: false, message: 'Address is required' };
  }
  
  const cleanAddress = address.trim();
  
  if (cleanAddress.length < 5) {
    return { isValid: false, message: 'Address must be at least 5 characters' };
  }
  
  if (cleanAddress.length > 500) {
    return { isValid: false, message: 'Address cannot exceed 500 characters' };
  }
  
  // Basic address validation - allow most characters but prevent script injection
  const addressRegex = /^[a-zA-Z0-9\u0600-\u06FF\s.,-/()#]+$/;
  
  if (!addressRegex.test(cleanAddress)) {
    return { isValid: false, message: 'Address contains invalid characters' };
  }
  
  return { isValid: true, message: 'Address is valid' };
}

/**
 * Sanitizes input to prevent XSS attacks
 * @param {string} input - The input to sanitize
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
  if (!input) return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates file upload (for documents)
 * @param {File} file - The file to validate
 * @param {Array} allowedTypes - Allowed MIME types
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {object} - Validation result with isValid and message
 */
export function validateFileUpload(file, allowedTypes = ['application/pdf'], maxSize = 10 * 1024 * 1024) {
  if (!file) {
    return { isValid: false, message: 'File is required' };
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
  }
  
  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return { isValid: false, message: `File size exceeds ${maxSizeMB}MB limit` };
  }
  
  // Additional file name validation
  const fileName = file.name;
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
    return { isValid: false, message: 'File name contains invalid characters' };
  }
  
  return { isValid: true, message: 'File is valid' };
}

/**
 * Comprehensive form validation for client creation
 * @param {object} formData - The form data to validate
 * @returns {object} - Validation result with isValid, errors object, and summary
 */
export function validateClientForm(formData) {
  const errors = {};
  
  // Validate full name
  const nameValidation = validateFullName(formData.fullName);
  if (!nameValidation.isValid) {
    errors.fullName = nameValidation.message;
  }
  
  // Validate CIN
  const cinValidation = validateCIN(formData.cin);
  if (!cinValidation.isValid) {
    errors.cin = cinValidation.message;
  }
  
  // Validate worker number
  const workerNumberValidation = validateWorkerNumber(formData.workerNumber);
  if (!workerNumberValidation.isValid) {
    errors.workerNumber = workerNumberValidation.message;
  }
  
  // Validate phone number (optional)
  const phoneValidation = validatePhoneNumber(formData.phoneNumber, false);
  if (!phoneValidation.isValid) {
    errors.phoneNumber = phoneValidation.message;
  }
  
  // Validate email (optional)
  if (formData.email) {
    const emailValidation = validateEmail(formData.email, false);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.message;
    }
  }
  
  // Validate address
  const addressValidation = validateAddress(formData.address);
  if (!addressValidation.isValid) {
    errors.address = addressValidation.message;
  }
  
  // Validate workplace selection
  if (!formData.workplaceId) {
    errors.workplace = 'Workplace is required';
  }
  
  // Validate job selection
  if (!formData.jobId) {
    errors.job = 'Job is required';
  }
  
  const isValid = Object.keys(errors).length === 0;
  
  return {
    isValid,
    errors,
    summary: isValid ? 'All fields are valid' : `${Object.keys(errors).length} field(s) have errors`
  };
}

/**
 * Debounce function for search and validation
 * @param {Function} func - The function to debounce
 * @param {number} wait - The delay in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
