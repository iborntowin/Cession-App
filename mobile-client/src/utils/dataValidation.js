/**
 * Data validation utilities for mobile app
 */

/**
 * Validate client data structure
 */
export const validateClient = (client) => {
  const errors = [];

  if (!client || typeof client !== 'object') {
    errors.push('Client must be an object');
    return { isValid: false, errors };
  }

  // Required fields
  if (!client.id) {
    errors.push('Client ID is required');
  }

  if (!client.fullName || typeof client.fullName !== 'string') {
    errors.push('Client full name is required and must be a string');
  }

  if (!client.clientNumber || typeof client.clientNumber !== 'number') {
    errors.push('Client number is required and must be a number');
  }

  // Optional but validated fields
  if (client.cin && typeof client.cin !== 'string') {
    errors.push('CIN must be a string');
  }

  if (client.phoneNumber && typeof client.phoneNumber !== 'string') {
    errors.push('Phone number must be a string');
  }

  if (client.workerNumber && typeof client.workerNumber !== 'string') {
    errors.push('Worker number must be a string');
  }

  // Validate workplace if present
  if (client.workplace) {
    if (typeof client.workplace !== 'object') {
      errors.push('Workplace must be an object');
    } else {
      if (!client.workplace.id) {
        errors.push('Workplace ID is required');
      }
      if (!client.workplace.name) {
        errors.push('Workplace name is required');
      }
    }
  }

  // Validate job if present
  if (client.job) {
    if (typeof client.job !== 'object') {
      errors.push('Job must be an object');
    } else {
      if (!client.job.id) {
        errors.push('Job ID is required');
      }
      if (!client.job.name) {
        errors.push('Job name is required');
      }
    }
  }

  // Validate cessions array
  if (client.cessions) {
    if (!Array.isArray(client.cessions)) {
      errors.push('Cessions must be an array');
    } else {
      client.cessions.forEach((cession, index) => {
        const cessionValidation = validateCession(cession);
        if (!cessionValidation.isValid) {
          errors.push(`Cession ${index + 1}: ${cessionValidation.errors.join(', ')}`);
        }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate cession data structure
 */
export const validateCession = (cession) => {
  const errors = [];

  if (!cession || typeof cession !== 'object') {
    errors.push('Cession must be an object');
    return { isValid: false, errors };
  }

  // Required fields
  if (!cession.id) {
    errors.push('Cession ID is required');
  }

  if (typeof cession.monthlyPayment !== 'number' || cession.monthlyPayment < 0) {
    errors.push('Monthly payment must be a positive number');
  }

  if (!cession.startDate) {
    errors.push('Start date is required');
  } else if (!isValidDateString(cession.startDate)) {
    errors.push('Start date must be a valid date string');
  }

  if (cession.endDate && !isValidDateString(cession.endDate)) {
    errors.push('End date must be a valid date string');
  }

  if (cession.expectedPayoffDate && !isValidDateString(cession.expectedPayoffDate)) {
    errors.push('Expected payoff date must be a valid date string');
  }

  if (typeof cession.remainingBalance !== 'number' || cession.remainingBalance < 0) {
    errors.push('Remaining balance must be a positive number');
  }

  if (typeof cession.totalLoanAmount !== 'number' || cession.totalLoanAmount <= 0) {
    errors.push('Total loan amount must be a positive number');
  }

  if (typeof cession.currentProgress !== 'number' || cession.currentProgress < 0 || cession.currentProgress > 100) {
    errors.push('Current progress must be a number between 0 and 100');
  }

  if (typeof cession.monthsRemaining !== 'number' || cession.monthsRemaining < 0) {
    errors.push('Months remaining must be a positive number');
  }

  // Validate status - be more lenient for caching
  const validStatuses = ['ACTIVE', 'COMPLETED', 'SUSPENDED', 'CANCELLED'];
  if (cession.status && !validStatuses.includes(cession.status)) {
    // Don't fail validation, just log a warning
    console.warn(`Invalid cession status "${cession.status}", will be normalized to ACTIVE`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate payment data structure
 */
export const validatePayment = (payment) => {
  const errors = [];

  if (!payment || typeof payment !== 'object') {
    errors.push('Payment must be an object');
    return { isValid: false, errors };
  }

  // Required fields
  if (!payment.id) {
    errors.push('Payment ID is required');
  }

  if (!payment.cessionId) {
    errors.push('Cession ID is required');
  }

  if (typeof payment.amount !== 'number' || payment.amount < 0) {
    errors.push('Amount must be a positive number');
  }

  if (!payment.paymentDate) {
    errors.push('Payment date is required');
  } else if (!isValidDateString(payment.paymentDate)) {
    errors.push('Payment date must be a valid date string');
  }

  // Optional fields
  if (payment.notes && typeof payment.notes !== 'string') {
    errors.push('Notes must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate export data structure
 */
export const validateExportData = (data) => {
  const errors = [];

  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return { isValid: false, errors };
  }

  // Validate metadata
  if (!data.metadata) {
    errors.push('Metadata is required');
  } else {
    const metadataValidation = validateMetadata(data.metadata);
    if (!metadataValidation.isValid) {
      errors.push(`Metadata validation failed: ${metadataValidation.errors.join(', ')}`);
    }
  }

  // Validate clients array
  if (!Array.isArray(data.clients)) {
    errors.push('Clients must be an array');
  } else {
    data.clients.forEach((client, index) => {
      const clientValidation = validateClient(client);
      if (!clientValidation.isValid) {
        errors.push(`Client ${index + 1}: ${clientValidation.errors.join(', ')}`);
      }
    });
  }

  // Validate payments array (optional for backward compatibility)
  if (data.payments !== undefined && !Array.isArray(data.payments)) {
    errors.push('Payments must be an array if present');
  } else if (Array.isArray(data.payments)) {
    data.payments.forEach((payment, index) => {
      const paymentValidation = validatePayment(payment);
      if (!paymentValidation.isValid) {
        errors.push(`Payment ${index + 1}: ${paymentValidation.errors.join(', ')}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate metadata structure
 */
export const validateMetadata = (metadata) => {
  const errors = [];

  if (!metadata || typeof metadata !== 'object') {
    errors.push('Metadata must be an object');
    return { isValid: false, errors };
  }

  if (!metadata.exportTime) {
    errors.push('Export time is required');
  } else if (!isValidDateString(metadata.exportTime)) {
    errors.push('Export time must be a valid ISO date string');
  }

  if (!metadata.version) {
    errors.push('Version is required');
  }

  if (!metadata.recordCount) {
    errors.push('Record count is required');
  } else {
    if (typeof metadata.recordCount !== 'object') {
      errors.push('Record count must be an object');
    } else {
      if (typeof metadata.recordCount.clients !== 'number' || metadata.recordCount.clients < 0) {
        errors.push('Client count must be a non-negative number');
      }
      if (typeof metadata.recordCount.cessions !== 'number' || metadata.recordCount.cessions < 0) {
        errors.push('Cession count must be a non-negative number');
      }
      // Payments count is optional for backward compatibility
      if (metadata.recordCount.payments !== undefined && 
          (typeof metadata.recordCount.payments !== 'number' || metadata.recordCount.payments < 0)) {
        errors.push('Payment count must be a non-negative number if present');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Check if a string is a valid date
 */
export const isValidDateString = (dateString) => {
  if (typeof dateString !== 'string') return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString().substring(0, 10) === dateString.substring(0, 10);
};

/**
 * Sanitize client data for display
 */
export const sanitizeClientData = (client) => {
  if (!client || typeof client !== 'object') return null;

  // Ensure required fields have valid values
  const sanitized = {
    id: client.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    clientNumber: parseInt(client.clientNumber) || 0,
    fullName: (client.fullName || 'Unknown Client').trim(),
    cin: (client.cin || '').trim(),
    phoneNumber: (client.phoneNumber || '').trim(),
    address: (client.address || '').trim(),
    workerNumber: (client.workerNumber || '').trim(),
    workplace: client.workplace && typeof client.workplace === 'object' ? {
      id: client.workplace.id || '',
      name: (client.workplace.name || 'Unknown Workplace').trim()
    } : null,
    job: client.job && typeof client.job === 'object' ? {
      id: client.job.id || '',
      name: (client.job.name || 'Unknown Job').trim()
    } : null,
    cessions: []
  };

  // Sanitize cessions array
  if (Array.isArray(client.cessions)) {
    sanitized.cessions = client.cessions
      .map(cession => sanitizeCessionData(cession))
      .filter(Boolean); // Remove null/invalid cessions
  }

  return sanitized;
};

/**
 * Sanitize cession data for display
 */
export const sanitizeCessionData = (cession) => {
  if (!cession) return null;

  // Normalize status to valid values
  const validStatuses = ['ACTIVE', 'COMPLETED', 'SUSPENDED', 'CANCELLED'];
  let normalizedStatus = 'ACTIVE'; // Default status
  
  if (cession.status && typeof cession.status === 'string') {
    const upperStatus = cession.status.toUpperCase();
    if (validStatuses.includes(upperStatus)) {
      normalizedStatus = upperStatus;
    } else {
      // Try to map common variations
      const statusMappings = {
        'ACTIF': 'ACTIVE',
        'TERMINE': 'COMPLETED',
        'FINI': 'COMPLETED',
        'COMPLETE': 'COMPLETED',
        'SUSPENDU': 'SUSPENDED',
        'PAUSE': 'SUSPENDED',
        'ANNULE': 'CANCELLED',
        'CANCEL': 'CANCELLED',
        'UNKNOWN': 'ACTIVE',
        'PENDING': 'ACTIVE',
        'EN_COURS': 'ACTIVE',
        'IN_PROGRESS': 'ACTIVE'
      };
      
      normalizedStatus = statusMappings[upperStatus] || 'ACTIVE';
    }
  }

  return {
    id: cession.id || '',
    monthlyPayment: Math.max(0, parseFloat(cession.monthlyPayment) || 0),
    startDate: cession.startDate || '',
    endDate: cession.endDate || null,
    expectedPayoffDate: cession.expectedPayoffDate || null,
    remainingBalance: Math.max(0, parseFloat(cession.remainingBalance) || 0),
    totalLoanAmount: Math.max(0, parseFloat(cession.totalLoanAmount) || 0),
    currentProgress: Math.min(100, Math.max(0, parseFloat(cession.currentProgress) || 0)),
    monthsRemaining: Math.max(0, parseInt(cession.monthsRemaining) || 0),
    bankOrAgency: (cession.bankOrAgency || '').trim(),
    status: normalizedStatus
  };
};

/**
 * Validate search parameters
 */
export const validateSearchParams = (params) => {
  const errors = [];
  const sanitized = {};

  if (params.query !== undefined) {
    if (typeof params.query !== 'string') {
      errors.push('Search query must be a string');
    } else {
      sanitized.query = params.query.trim();
    }
  }

  if (params.status !== undefined) {
    const validStatuses = ['ALL', 'ACTIVE', 'COMPLETED', 'SUSPENDED', 'CANCELLED'];
    if (!validStatuses.includes(params.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    } else {
      sanitized.status = params.status;
    }
  }

  if (params.sortBy !== undefined) {
    const validSortFields = ['fullName', 'clientNumber', 'cin', 'workerNumber'];
    if (!validSortFields.includes(params.sortBy)) {
      errors.push(`Sort field must be one of: ${validSortFields.join(', ')}`);
    } else {
      sanitized.sortBy = params.sortBy;
    }
  }

  if (params.sortOrder !== undefined) {
    const validOrders = ['asc', 'desc'];
    if (!validOrders.includes(params.sortOrder)) {
      errors.push(`Sort order must be one of: ${validOrders.join(', ')}`);
    } else {
      sanitized.sortOrder = params.sortOrder;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
};

/**
 * Check data freshness
 */
export const checkDataFreshness = (timestamp, maxAgeMs = 24 * 60 * 60 * 1000) => {
  if (!timestamp) return { isFresh: false, age: null };
  
  const age = Date.now() - timestamp;
  const isFresh = age <= maxAgeMs;
  
  return {
    isFresh,
    age,
    ageHours: Math.floor(age / (60 * 60 * 1000)),
    ageDays: Math.floor(age / (24 * 60 * 60 * 1000))
  };
};