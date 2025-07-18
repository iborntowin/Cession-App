import {
  validateClient,
  validateCession,
  validateExportData,
  validateMetadata,
  validateSearchParams,
  isValidDateString,
  sanitizeClientData,
  sanitizeCessionData,
  checkDataFreshness
} from '../src/utils/dataValidation';

describe('Data Validation Utilities', () => {
  describe('validateClient', () => {
    const validClient = {
      id: 'client-1',
      clientNumber: 1001,
      fullName: 'John Doe',
      cin: '12345678',
      phoneNumber: '+216123456789',
      address: '123 Main St',
      workerNumber: '1234567890',
      workplace: {
        id: 'workplace-1',
        name: 'Company A'
      },
      job: {
        id: 'job-1',
        name: 'Engineer'
      },
      cessions: []
    };

    it('should validate a valid client', () => {
      const result = validateClient(validClient);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null or non-object client', () => {
      expect(validateClient(null).isValid).toBe(false);
      expect(validateClient('string').isValid).toBe(false);
      expect(validateClient(123).isValid).toBe(false);
    });

    it('should require id field', () => {
      const client = { ...validClient };
      delete client.id;
      
      const result = validateClient(client);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Client ID is required');
    });

    it('should require fullName field', () => {
      const client = { ...validClient };
      delete client.fullName;
      
      const result = validateClient(client);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Client full name is required and must be a string');
    });

    it('should require clientNumber field', () => {
      const client = { ...validClient };
      delete client.clientNumber;
      
      const result = validateClient(client);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Client number is required and must be a number');
    });

    it('should validate workplace structure', () => {
      const client = { ...validClient, workplace: { id: 'wp-1' } }; // missing name
      
      const result = validateClient(client);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Workplace name is required');
    });

    it('should validate job structure', () => {
      const client = { ...validClient, job: { name: 'Engineer' } }; // missing id
      
      const result = validateClient(client);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Job ID is required');
    });

    it('should validate cessions array', () => {
      const client = { ...validClient, cessions: 'not-an-array' };
      
      const result = validateClient(client);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cessions must be an array');
    });
  });

  describe('validateCession', () => {
    const validCession = {
      id: 'cession-1',
      monthlyPayment: 250.00,
      startDate: '2024-01-01',
      endDate: null,
      expectedPayoffDate: '2026-01-01',
      remainingBalance: 5000.00,
      totalLoanAmount: 6000.00,
      currentProgress: 16.67,
      monthsRemaining: 22,
      bankOrAgency: 'Bank A',
      status: 'ACTIVE'
    };

    it('should validate a valid cession', () => {
      const result = validateCession(validCession);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null or non-object cession', () => {
      expect(validateCession(null).isValid).toBe(false);
      expect(validateCession('string').isValid).toBe(false);
    });

    it('should require id field', () => {
      const cession = { ...validCession };
      delete cession.id;
      
      const result = validateCession(cession);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cession ID is required');
    });

    it('should validate monthlyPayment as positive number', () => {
      const cession = { ...validCession, monthlyPayment: -100 };
      
      const result = validateCession(cession);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Monthly payment must be a positive number');
    });

    it('should require startDate', () => {
      const cession = { ...validCession };
      delete cession.startDate;
      
      const result = validateCession(cession);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date is required');
    });

    it('should validate date formats', () => {
      const cession = { ...validCession, startDate: 'invalid-date' };
      
      const result = validateCession(cession);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date must be a valid date string');
    });

    it('should validate status values', () => {
      const cession = { ...validCession, status: 'INVALID_STATUS' };
      
      const result = validateCession(cession);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Status must be one of: ACTIVE, COMPLETED, SUSPENDED, CANCELLED');
    });

    it('should validate progress range', () => {
      const cession = { ...validCession, currentProgress: 150 };
      
      const result = validateCession(cession);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current progress must be a number between 0 and 100');
    });
  });

  describe('validateExportData', () => {
    const validExportData = {
      metadata: {
        exportTime: '2025-01-15T10:30:00Z',
        version: '1.0',
        recordCount: {
          clients: 1,
          cessions: 1
        }
      },
      clients: [
        {
          id: 'client-1',
          clientNumber: 1001,
          fullName: 'John Doe',
          cessions: []
        }
      ]
    };

    it('should validate valid export data', () => {
      const result = validateExportData(validExportData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null or non-object data', () => {
      expect(validateExportData(null).isValid).toBe(false);
      expect(validateExportData('string').isValid).toBe(false);
    });

    it('should require metadata', () => {
      const data = { ...validExportData };
      delete data.metadata;
      
      const result = validateExportData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Metadata is required');
    });

    it('should require clients array', () => {
      const data = { ...validExportData, clients: 'not-an-array' };
      
      const result = validateExportData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Clients must be an array');
    });
  });

  describe('validateMetadata', () => {
    const validMetadata = {
      exportTime: '2025-01-15T10:30:00Z',
      version: '1.0',
      recordCount: {
        clients: 1,
        cessions: 1
      }
    };

    it('should validate valid metadata', () => {
      const result = validateMetadata(validMetadata);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require exportTime', () => {
      const metadata = { ...validMetadata };
      delete metadata.exportTime;
      
      const result = validateMetadata(metadata);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Export time is required');
    });

    it('should validate exportTime format', () => {
      const metadata = { ...validMetadata, exportTime: 'invalid-date' };
      
      const result = validateMetadata(metadata);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Export time must be a valid ISO date string');
    });

    it('should require version', () => {
      const metadata = { ...validMetadata };
      delete metadata.version;
      
      const result = validateMetadata(metadata);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Version is required');
    });

    it('should validate recordCount structure', () => {
      const metadata = { ...validMetadata, recordCount: 'not-an-object' };
      
      const result = validateMetadata(metadata);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Record count must be an object');
    });
  });

  describe('isValidDateString', () => {
    it('should validate correct date strings', () => {
      expect(isValidDateString('2025-01-15')).toBe(true);
      expect(isValidDateString('2025-01-15T10:30:00Z')).toBe(true);
      expect(isValidDateString('2024-12-31')).toBe(true);
    });

    it('should reject invalid date strings', () => {
      expect(isValidDateString('invalid-date')).toBe(false);
      expect(isValidDateString('2025-13-01')).toBe(false);
      expect(isValidDateString('2025-01-32')).toBe(false);
      expect(isValidDateString(null)).toBe(false);
      expect(isValidDateString(123)).toBe(false);
    });
  });

  describe('sanitizeClientData', () => {
    it('should sanitize valid client data', () => {
      const client = {
        id: 'client-1',
        clientNumber: 1001,
        fullName: '  John Doe  ',
        cin: '  12345678  ',
        workplace: { id: 'wp-1', name: '  Company A  ' },
        cessions: []
      };

      const result = sanitizeClientData(client);
      
      expect(result.fullName).toBe('John Doe');
      expect(result.cin).toBe('12345678');
      expect(result.workplace.name).toBe('Company A');
    });

    it('should handle null client', () => {
      expect(sanitizeClientData(null)).toBeNull();
    });

    it('should provide defaults for missing fields', () => {
      const client = { id: 'client-1' };
      
      const result = sanitizeClientData(client);
      
      expect(result.clientNumber).toBe(0);
      expect(result.fullName).toBe('');
      expect(result.cessions).toEqual([]);
    });
  });

  describe('sanitizeCessionData', () => {
    it('should sanitize valid cession data', () => {
      const cession = {
        id: 'cession-1',
        monthlyPayment: '250.50',
        remainingBalance: '5000.75',
        currentProgress: '16.67',
        monthsRemaining: '22'
      };

      const result = sanitizeCessionData(cession);
      
      expect(result.monthlyPayment).toBe(250.50);
      expect(result.remainingBalance).toBe(5000.75);
      expect(result.currentProgress).toBe(16.67);
      expect(result.monthsRemaining).toBe(22);
    });

    it('should handle null cession', () => {
      expect(sanitizeCessionData(null)).toBeNull();
    });

    it('should enforce minimum values', () => {
      const cession = {
        id: 'cession-1',
        monthlyPayment: -100,
        remainingBalance: -500,
        currentProgress: -10
      };

      const result = sanitizeCessionData(cession);
      
      expect(result.monthlyPayment).toBe(0);
      expect(result.remainingBalance).toBe(0);
      expect(result.currentProgress).toBe(0);
    });

    it('should enforce maximum progress', () => {
      const cession = {
        id: 'cession-1',
        currentProgress: 150
      };

      const result = sanitizeCessionData(cession);
      
      expect(result.currentProgress).toBe(100);
    });
  });

  describe('validateSearchParams', () => {
    it('should validate valid search params', () => {
      const params = {
        query: 'John Doe',
        status: 'ACTIVE',
        sortBy: 'fullName',
        sortOrder: 'asc'
      };

      const result = validateSearchParams(params);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized.query).toBe('John Doe');
    });

    it('should trim query strings', () => {
      const params = { query: '  John Doe  ' };
      
      const result = validateSearchParams(params);
      
      expect(result.sanitized.query).toBe('John Doe');
    });

    it('should validate status values', () => {
      const params = { status: 'INVALID_STATUS' };
      
      const result = validateSearchParams(params);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Status must be one of: ALL, ACTIVE, COMPLETED, SUSPENDED, CANCELLED');
    });

    it('should validate sort fields', () => {
      const params = { sortBy: 'invalidField' };
      
      const result = validateSearchParams(params);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Sort field must be one of: fullName, clientNumber, cin, workerNumber');
    });

    it('should validate sort order', () => {
      const params = { sortOrder: 'invalid' };
      
      const result = validateSearchParams(params);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Sort order must be one of: asc, desc');
    });
  });

  describe('checkDataFreshness', () => {
    it('should identify fresh data', () => {
      const recentTimestamp = Date.now() - 1000; // 1 second ago
      
      const result = checkDataFreshness(recentTimestamp);
      
      expect(result.isFresh).toBe(true);
      expect(result.age).toBeLessThan(2000);
    });

    it('should identify stale data', () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      
      const result = checkDataFreshness(oldTimestamp);
      
      expect(result.isFresh).toBe(false);
      expect(result.ageDays).toBe(1);
    });

    it('should handle null timestamp', () => {
      const result = checkDataFreshness(null);
      
      expect(result.isFresh).toBe(false);
      expect(result.age).toBeNull();
    });

    it('should use custom max age', () => {
      const timestamp = Date.now() - 2000; // 2 seconds ago
      const maxAge = 1000; // 1 second
      
      const result = checkDataFreshness(timestamp, maxAge);
      
      expect(result.isFresh).toBe(false);
    });
  });
});