import { apiService } from './apiService';
import { supabaseService } from './supabaseService';
import { ErrorHandler } from '../utils/errorHandling';

class CessionService {
  constructor() {
    this.isInitialized = false;
    this.initializeService();
  }

  /**
   * Initialize the service with automatic Supabase connection
   */
  async initializeService() {
    try {
      await supabaseService.initialize();
      this.isInitialized = true;
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to initialize CessionService');
    }
  }

  /**
   * Get all cessions from Supabase export data
   */
  async getAllCessions() {
    try {
      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initializeService();
      }

      // Try to get fresh data from Supabase using current mode and selection
      const result = await supabaseService.getCurrentData();
      
      if (result.cessions) {
        return result.cessions;
      } else {
        throw new Error('No cession data found in export');
      }
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to fetch cessions from Supabase');
      
      // Try to get cached data
      try {
        const cachedResult = await supabaseService.getCachedData();
        if (cachedResult && cachedResult.data) {
          const data = cachedResult.data.data || cachedResult.data;
          if (data.cessions) {
            return data.cessions;
          }
        }
      } catch (cacheError) {
        ErrorHandler.logError(cacheError, 'Failed to get cached cession data');
      }

      // Fallback to API if both Supabase and cache fail
      try {
        const response = await apiService.get('/cessions');
        return response.data || response;
      } catch (apiError) {
        throw new Error(`Failed to fetch cessions: ${error.message}`);
      }
    }
  }

  /**
   * Get cession by ID from Supabase export data
   */
  async getCessionById(cessionId) {
    try {
      if (!cessionId) {
        throw new Error('Cession ID is required');
      }

      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initializeService();
      }

      // Try to get fresh data from Supabase using current mode and selection
      const result = await supabaseService.getCurrentData();
      
      if (!result.cessions) {
        throw new Error('No cession data found in export');
      }

      const cessions = result.cessions;

      const cession = cessions.find(c => c.id === cessionId || c.id === parseInt(cessionId));
      
      if (!cession) {
        throw new Error('Cession not found');
      }

      return cession;
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to fetch cession from Supabase');
      
      // Try to get cached data
      try {
        const cachedResult = await supabaseService.getCachedData();
        if (cachedResult && cachedResult.data) {
          const data = cachedResult.data.data || cachedResult.data;
          if (data.cessions) {
            const cession = data.cessions.find(c => c.id === cessionId || c.id === parseInt(cessionId));
            if (cession) {
              return cession;
            }
          }
        }
      } catch (cacheError) {
        ErrorHandler.logError(cacheError, 'Failed to get cached cession data');
      }

      // Fallback to API if both Supabase and cache fail
      try {
        const response = await apiService.get(`/cessions/${cessionId}`);
        return response.data || response;
      } catch (apiError) {
        throw new Error(`Failed to fetch cession details: ${error.message}`);
      }
    }
  }

  /**
   * Get cessions by client ID
   */
  async getCessionsByClientId(clientId) {
    try {
      if (!clientId) {
        throw new Error('Client ID is required');
      }

      const allCessions = await this.getAllCessions();
      return allCessions.filter(cession => 
        cession.clientId === clientId || cession.clientId === parseInt(clientId)
      );
    } catch (error) {
      throw new Error(`Failed to fetch client cessions: ${error.message}`);
    }
  }

  /**
   * Get cessions by status
   */
  async getCessionsByStatus(status) {
    try {
      const allCessions = await this.getAllCessions();
      return allCessions.filter(cession => cession.status === status);
    } catch (error) {
      throw new Error(`Failed to fetch cessions by status: ${error.message}`);
    }
  }

  /**
   * Get overdue cessions
   */
  async getOverdueCessions() {
    try {
      const allCessions = await this.getAllCessions();
      const now = new Date();
      
      return allCessions.filter(cession => {
        if (cession.status === 'OVERDUE') return true;
        
        // Check if expected payoff date has passed
        if (cession.expectedPayoffDate) {
          const payoffDate = new Date(cession.expectedPayoffDate);
          return payoffDate < now && cession.status === 'ACTIVE';
        }
        
        return false;
      });
    } catch (error) {
      throw new Error(`Failed to fetch overdue cessions: ${error.message}`);
    }
  }

  /**
   * Get cession statistics
   */
  async getCessionStatistics() {
    try {
      const allCessions = await this.getAllCessions();
      
      const stats = {
        total: allCessions.length,
        active: 0,
        completed: 0,
        overdue: 0,
        totalLoanAmount: 0,
        totalRemainingBalance: 0,
        totalMonthlyPayments: 0,
        averageProgress: 0
      };

      let totalProgress = 0;

      allCessions.forEach(cession => {
        // Count by status
        switch (cession.status) {
          case 'ACTIVE':
            stats.active++;
            break;
          case 'COMPLETED':
            stats.completed++;
            break;
          case 'OVERDUE':
            stats.overdue++;
            break;
        }

        // Sum financial data
        stats.totalLoanAmount += cession.totalLoanAmount || 0;
        stats.totalRemainingBalance += cession.remainingBalance || 0;
        stats.totalMonthlyPayments += cession.monthlyPayment || 0;
        totalProgress += cession.currentProgress || 0;
      });

      // Calculate average progress
      stats.averageProgress = allCessions.length > 0 ? totalProgress / allCessions.length : 0;

      return stats;
    } catch (error) {
      throw new Error(`Failed to calculate cession statistics: ${error.message}`);
    }
  }

  /**
   * Filter cessions by various criteria
   */
  filterCessions(cessions, filters) {
    if (!cessions || !Array.isArray(cessions)) {
      return [];
    }

    return cessions.filter(cession => {
      // Status filter
      if (filters.status && cession.status !== filters.status) {
        return false;
      }

      // Client ID filter
      if (filters.clientId && cession.clientId !== filters.clientId) {
        return false;
      }

      // Bank/Agency filter
      if (filters.bankOrAgency && !cession.bankOrAgency?.toLowerCase().includes(filters.bankOrAgency.toLowerCase())) {
        return false;
      }

      // Monthly payment range filter
      if (filters.minMonthlyPayment && cession.monthlyPayment < filters.minMonthlyPayment) {
        return false;
      }
      if (filters.maxMonthlyPayment && cession.monthlyPayment > filters.maxMonthlyPayment) {
        return false;
      }

      // Remaining balance range filter
      if (filters.minRemainingBalance && cession.remainingBalance < filters.minRemainingBalance) {
        return false;
      }
      if (filters.maxRemainingBalance && cession.remainingBalance > filters.maxRemainingBalance) {
        return false;
      }

      // Progress range filter
      if (filters.minProgress && cession.currentProgress < filters.minProgress) {
        return false;
      }
      if (filters.maxProgress && cession.currentProgress > filters.maxProgress) {
        return false;
      }

      return true;
    });
  }

  /**
   * Sort cessions by various criteria
   */
  sortCessions(cessions, sortBy = 'id', sortOrder = 'asc') {
    if (!cessions || !Array.isArray(cessions)) {
      return [];
    }

    return [...cessions].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle null/undefined values
      if (aValue == null) aValue = sortBy === 'id' ? 0 : '';
      if (bValue == null) bValue = sortBy === 'id' ? 0 : '';

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        // Numeric comparison
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });
  }

  /**
   * Format cession for display
   */
  formatCessionForDisplay(cession) {
    return {
      ...cession,
      formattedMonthlyPayment: `${(cession.monthlyPayment || 0).toFixed(2)} TND`,
      formattedRemainingBalance: `${(cession.remainingBalance || 0).toFixed(2)} TND`,
      formattedTotalLoanAmount: `${(cession.totalLoanAmount || 0).toFixed(2)} TND`,
      formattedProgress: `${(cession.currentProgress || 0).toFixed(1)}%`,
      formattedStartDate: cession.startDate ? new Date(cession.startDate).toLocaleDateString() : 'N/A',
      formattedEndDate: cession.endDate ? new Date(cession.endDate).toLocaleDateString() : 'N/A',
      formattedExpectedPayoffDate: cession.expectedPayoffDate ? new Date(cession.expectedPayoffDate).toLocaleDateString() : 'N/A',
      isOverdue: this.isCessionOverdue(cession),
      daysUntilPayoff: this.getDaysUntilPayoff(cession)
    };
  }

  /**
   * Check if a cession is overdue
   */
  isCessionOverdue(cession) {
    if (cession.status === 'OVERDUE') return true;
    if (cession.status === 'COMPLETED') return false;
    
    if (cession.expectedPayoffDate) {
      const payoffDate = new Date(cession.expectedPayoffDate);
      const now = new Date();
      return payoffDate < now;
    }
    
    return false;
  }

  /**
   * Get days until payoff (negative if overdue)
   */
  getDaysUntilPayoff(cession) {
    if (!cession.expectedPayoffDate) return null;
    
    const payoffDate = new Date(cession.expectedPayoffDate);
    const now = new Date();
    const diffTime = payoffDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
}

export const cessionService = new CessionService();
export default cessionService;