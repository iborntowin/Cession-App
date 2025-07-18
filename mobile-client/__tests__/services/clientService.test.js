import { ClientService } from '../../src/services/clientService';

describe('ClientService', () => {
  let clientService;
  
  const mockClients = [
    {
      id: 'client-1',
      fullName: 'John Doe',
      cin: '12345678',
      phoneNumber: '+216123456789',
      address: '123 Main St',
      workerNumber: '1234567890',
      workplace: { id: 'wp-1', name: 'Tech Company' },
      job: { id: 'job-1', name: 'Software Engineer' },
      cessions: [
        {
          id: 'cession-1',
          monthlyPayment: 250.00,
          status: 'ACTIVE',
          remainingBalance: 5000.00,
          totalLoanAmount: 6000.00,
          currentProgress: 16.67,
          bankOrAgency: 'Test Bank'
        }
      ]
    },
    {
      id: 'client-2',
      fullName: 'Jane Smith',
      cin: '87654321',
      phoneNumber: '+216987654321',
      address: '456 Oak Ave',
      workerNumber: '0987654321',
      workplace: { id: 'wp-2', name: 'Finance Corp' },
      job: { id: 'job-2', name: 'Accountant' },
      cessions: [
        {
          id: 'cession-2',
          monthlyPayment: 300.00,
          status: 'ACTIVE',
          remainingBalance: 4000.00,
          totalLoanAmount: 5000.00,
          currentProgress: 20.00,
          bankOrAgency: 'Another Bank'
        },
        {
          id: 'cession-3',
          monthlyPayment: 150.00,
          status: 'COMPLETED',
          remainingBalance: 0.00,
          totalLoanAmount: 3000.00,
          currentProgress: 100.00,
          bankOrAgency: 'Third Bank'
        }
      ]
    }
  ];

  beforeEach(() => {
    clientService = new ClientService();
  });

  describe('getAllClients', () => {
    test('returns all clients', () => {
      // Act
      const result = clientService.getAllClients(mockClients);

      // Assert
      expect(result).toEqual(mockClients);
      expect(result).toHaveLength(2);
    });

    test('returns empty array when no clients provided', () => {
      // Act
      const result = clientService.getAllClients([]);

      // Assert
      expect(result).toEqual([]);
    });

    test('handles null/undefined input', () => {
      // Act & Assert
      expect(clientService.getAllClients(null)).toEqual([]);
      expect(clientService.getAllClients(undefined)).toEqual([]);
    });
  });

  describe('getClientById', () => {
    test('returns client by ID', () => {
      // Act
      const result = clientService.getClientById(mockClients, 'client-1');

      // Assert
      expect(result).toEqual(mockClients[0]);
      expect(result.fullName).toBe('John Doe');
    });

    test('returns null for non-existent ID', () => {
      // Act
      const result = clientService.getClientById(mockClients, 'non-existent');

      // Assert
      expect(result).toBeNull();
    });

    test('handles empty clients array', () => {
      // Act
      const result = clientService.getClientById([], 'client-1');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('searchClients', () => {
    test('searches by full name', () => {
      // Act
      const result = clientService.searchClients(mockClients, 'john');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe('John Doe');
    });

    test('searches by CIN', () => {
      // Act
      const result = clientService.searchClients(mockClients, '87654321');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe('Jane Smith');
    });

    test('searches by worker number', () => {
      // Act
      const result = clientService.searchClients(mockClients, '1234567890');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe('John Doe');
    });

    test('searches by phone number', () => {
      // Act
      const result = clientService.searchClients(mockClients, '+216987654321');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe('Jane Smith');
    });

    test('search is case insensitive', () => {
      // Act
      const result = clientService.searchClients(mockClients, 'JOHN DOE');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe('John Doe');
    });

    test('returns multiple matches', () => {
      // Act - search for partial phone number that might match multiple
      const result = clientService.searchClients(mockClients, '+216');

      // Assert
      expect(result).toHaveLength(2); // Both clients have +216 phone numbers
    });

    test('returns empty array for no matches', () => {
      // Act
      const result = clientService.searchClients(mockClients, 'nonexistent');

      // Assert
      expect(result).toEqual([]);
    });

    test('handles empty search query', () => {
      // Act
      const result = clientService.searchClients(mockClients, '');

      // Assert
      expect(result).toEqual(mockClients); // Should return all clients
    });

    test('handles null/undefined search query', () => {
      // Act & Assert
      expect(clientService.searchClients(mockClients, null)).toEqual(mockClients);
      expect(clientService.searchClients(mockClients, undefined)).toEqual(mockClients);
    });
  });

  describe('filterClientsByCessionStatus', () => {
    test('filters by ACTIVE status', () => {
      // Act
      const result = clientService.filterClientsByCessionStatus(mockClients, 'ACTIVE');

      // Assert
      expect(result).toHaveLength(2); // Both clients have active cessions
      result.forEach(client => {
        expect(client.cessions.some(c => c.status === 'ACTIVE')).toBe(true);
      });
    });

    test('filters by COMPLETED status', () => {
      // Act
      const result = clientService.filterClientsByCessionStatus(mockClients, 'COMPLETED');

      // Assert
      expect(result).toHaveLength(1); // Only Jane Smith has completed cessions
      expect(result[0].fullName).toBe('Jane Smith');
      expect(result[0].cessions.some(c => c.status === 'COMPLETED')).toBe(true);
    });

    test('returns all clients for ALL status', () => {
      // Act
      const result = clientService.filterClientsByCessionStatus(mockClients, 'ALL');

      // Assert
      expect(result).toEqual(mockClients);
    });

    test('returns empty array for non-existent status', () => {
      // Act
      const result = clientService.filterClientsByCessionStatus(mockClients, 'NONEXISTENT');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('sortClients', () => {
    test('sorts by name ascending', () => {
      // Act
      const result = clientService.sortClients(mockClients, 'name', 'asc');

      // Assert
      expect(result[0].fullName).toBe('Jane Smith');
      expect(result[1].fullName).toBe('John Doe');
    });

    test('sorts by name descending', () => {
      // Act
      const result = clientService.sortClients(mockClients, 'name', 'desc');

      // Assert
      expect(result[0].fullName).toBe('John Doe');
      expect(result[1].fullName).toBe('Jane Smith');
    });

    test('sorts by CIN ascending', () => {
      // Act
      const result = clientService.sortClients(mockClients, 'cin', 'asc');

      // Assert
      expect(result[0].cin).toBe('12345678');
      expect(result[1].cin).toBe('87654321');
    });

    test('sorts by CIN descending', () => {
      // Act
      const result = clientService.sortClients(mockClients, 'cin', 'desc');

      // Assert
      expect(result[0].cin).toBe('87654321');
      expect(result[1].cin).toBe('12345678');
    });

    test('sorts by workplace name', () => {
      // Act
      const result = clientService.sortClients(mockClients, 'workplace', 'asc');

      // Assert
      expect(result[0].workplace.name).toBe('Finance Corp');
      expect(result[1].workplace.name).toBe('Tech Company');
    });

    test('handles invalid sort field', () => {
      // Act
      const result = clientService.sortClients(mockClients, 'invalid', 'asc');

      // Assert
      expect(result).toEqual(mockClients); // Should return original order
    });

    test('handles invalid sort direction', () => {
      // Act
      const result = clientService.sortClients(mockClients, 'name', 'invalid');

      // Assert
      expect(result[0].fullName).toBe('Jane Smith'); // Should default to ascending
    });
  });

  describe('getClientStatistics', () => {
    test('calculates client statistics', () => {
      // Act
      const result = clientService.getClientStatistics(mockClients);

      // Assert
      expect(result.totalClients).toBe(2);
      expect(result.totalCessions).toBe(3);
      expect(result.activeCessions).toBe(2);
      expect(result.completedCessions).toBe(1);
      expect(result.totalOutstandingBalance).toBe(9000.00); // 5000 + 4000
      expect(result.averageMonthlyPayment).toBe(233.33); // (250 + 300 + 150) / 3
    });

    test('handles empty clients array', () => {
      // Act
      const result = clientService.getClientStatistics([]);

      // Assert
      expect(result.totalClients).toBe(0);
      expect(result.totalCessions).toBe(0);
      expect(result.activeCessions).toBe(0);
      expect(result.completedCessions).toBe(0);
      expect(result.totalOutstandingBalance).toBe(0);
      expect(result.averageMonthlyPayment).toBe(0);
    });

    test('handles clients with no cessions', () => {
      // Arrange
      const clientsWithoutCessions = [
        { ...mockClients[0], cessions: [] }
      ];

      // Act
      const result = clientService.getClientStatistics(clientsWithoutCessions);

      // Assert
      expect(result.totalClients).toBe(1);
      expect(result.totalCessions).toBe(0);
      expect(result.activeCessions).toBe(0);
      expect(result.completedCessions).toBe(0);
      expect(result.totalOutstandingBalance).toBe(0);
      expect(result.averageMonthlyPayment).toBe(0);
    });
  });

  describe('getClientsByWorkplace', () => {
    test('groups clients by workplace', () => {
      // Act
      const result = clientService.getClientsByWorkplace(mockClients);

      // Assert
      expect(result).toHaveProperty('Tech Company');
      expect(result).toHaveProperty('Finance Corp');
      expect(result['Tech Company']).toHaveLength(1);
      expect(result['Finance Corp']).toHaveLength(1);
      expect(result['Tech Company'][0].fullName).toBe('John Doe');
      expect(result['Finance Corp'][0].fullName).toBe('Jane Smith');
    });

    test('handles clients without workplace', () => {
      // Arrange
      const clientsWithoutWorkplace = [
        { ...mockClients[0], workplace: null }
      ];

      // Act
      const result = clientService.getClientsByWorkplace(clientsWithoutWorkplace);

      // Assert
      expect(result).toHaveProperty('Unknown');
      expect(result['Unknown']).toHaveLength(1);
    });
  });

  describe('validateClientData', () => {
    test('validates correct client data', () => {
      // Act
      const result = clientService.validateClientData(mockClients[0]);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('identifies missing required fields', () => {
      // Arrange
      const invalidClient = {
        id: 'client-1',
        // Missing fullName, cin, etc.
      };

      // Act
      const result = clientService.validateClientData(invalidClient);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Full name is required');
      expect(result.errors).toContain('CIN is required');
    });

    test('validates CIN format', () => {
      // Arrange
      const clientWithInvalidCin = {
        ...mockClients[0],
        cin: '123' // Too short
      };

      // Act
      const result = clientService.validateClientData(clientWithInvalidCin);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CIN must be 8 digits');
    });

    test('validates phone number format', () => {
      // Arrange
      const clientWithInvalidPhone = {
        ...mockClients[0],
        phoneNumber: 'invalid-phone'
      };

      // Act
      const result = clientService.validateClientData(clientWithInvalidPhone);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid phone number format');
    });
  });
});