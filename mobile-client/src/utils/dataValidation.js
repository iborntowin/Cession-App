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

  // Validate status
  const validStatuses = ['ACTIVE', 'COMPLETED', 'SUSPENDED', 'CANCELLED'];
  if (!cession.status || !validStatuses.includes(cession.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
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
  if (!client) return null;

  return {
    id: client.id || '',
    clientNumber: client.clientNumber || 0,
    fullName: (client.fullName || '').trim(),
    cin: (client.cin || '').trim(),
    phoneNumber: (client.phoneNumber || '').trim(),
    address: (client.address || '').trim(),
    workerNumber: (client.workerNumber || '').trim(),
    workplace: client.workplace ? {
      id: client.workplace.id || '',
      name: (client.workplace.name || '').trim()
    } : null,
    job: client.job ? {
      id: client.job.id || '',
      name: (client.job.name || '').trim()
    } : null,
    cessions: Array.isArray(client.cessions) 
      ? client.cessions.map(sanitizeCessionData).filter(Boolean)
      : []
  };
};

/**
 * Sanitize cession data for display
 */
export const sanitizeCessionData = (cession) => {
  if (!cession) return null;

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
    status: cession.status || 'UNKNOWN'
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