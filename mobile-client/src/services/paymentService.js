import { apiService } from './apiService';
import { supabaseService } from './supabaseService';
import { dataService } from './DataService';
import { ErrorHandler } from '../utils/errorHandling';

class PaymentService {
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
      ErrorHandler.logError(error, 'Failed to initialize PaymentService');
    }
  }

  /**
   * Get all payments from cached export data with offline support
   */
  async getAllPayments() {
    try {
      // Try to get fresh data from Supabase using current mode and selection
      const result = await supabaseService.getCurrentData();
      
      console.log('PaymentService: checking result for payments:', {
        hasResult: !!result,
        hasPayments: !!result?.payments,
        paymentsCount: result?.payments?.length || 0
      });
      
      if (result && result.payments && Array.isArray(result.payments)) {
        console.log(`PaymentService: returning ${result.payments.length} payments`);
        return result.payments;
      } else {
        console.log('PaymentService: no valid payments found, trying fallbacks');
      }
    } catch (error) {
      console.log('PaymentService: error getting current data:', error.message);
    }

    // Try to get cached data using DataService
    try {
      const cachedData = await dataService.getCachedData();
      if (cachedData && cachedData.payments && Array.isArray(cachedData.payments)) {
        console.log(`PaymentService: returning ${cachedData.payments.length} cached payments`);
        return cachedData.payments;
      }
    } catch (cacheError) {
      console.log('PaymentService: cache error:', cacheError.message);
    }

    // Also try Supabase cache as fallback
    try {
      const cachedResult = await supabaseService.getCachedData();
      if (cachedResult && cachedResult.data) {
        const data = cachedResult.data.data || cachedResult.data;
        if (data.payments && Array.isArray(data.payments)) {
          console.log(`PaymentService: returning ${data.payments.length} supabase cached payments`);
          return data.payments;
        }
      }
    } catch (supabaseCacheError) {
      console.log('PaymentService: supabase cache error:', supabaseCacheError.message);
    }

    // Return empty array as last resort (don't throw error for payments)
    console.log('PaymentService: all methods failed, returning empty array');
    return [];
  }

  /**
   * Get payments for a specific cession
   */
  async getCessionPayments(cessionId) {
    try {
      if (!cessionId) {
        throw new Error('Cession ID is required');
      }

      const response = await apiService.get(`/payments/cession/${cessionId}`);
      return response.data || response;
    } catch (error) {
      throw new Error(`Failed to fetch cession payments: ${error.message}`);
    }
  }

  /**
   * Get payments by date range for a cession
   */
  async getPaymentsByDateRange(cessionId, startDate, endDate) {
    try {
      if (!cessionId || !startDate || !endDate) {
        throw new Error('Cession ID, start date, and end date are required');
      }

      const response = await apiService.get(`/payments/cession/${cessionId}/date-range`, {
        startDate,
        endDate
      });
      return response.data || response;
    } catch (error) {
      throw new Error(`Failed to fetch payments by date range: ${error.message}`);
    }
  }

  /**
   * Get danger clients analysis
   */
  async getDangerClientsAnalysis(thresholdMonths = 1, unstartedDaysThreshold = 1) {
    try {
      const response = await apiService.get('/payments/danger-clients-analysis', {
        thresholdMonths,
        unstartedDaysThreshold
      });
      return response.data || response;
    } catch (error) {
      throw new Error(`Failed to fetch danger clients analysis: ${error.message}`);
    }
  }

  /**
   * Filter payments by various criteria
   */
  filterPayments(payments, filters) {
    if (!payments || !Array.isArray(payments)) {
      return [];
    }

    return payments.filter(payment => {
      // Status filter
      if (filters.status && payment.status !== filters.status) {
        return false;
      }

      // Cession ID filter
      if (filters.cessionId && payment.cessionId !== filters.cessionId) {
        return false;
      }

      // Client ID filter
      if (filters.clientId && payment.clientId !== filters.clientId) {
        return false;
      }

      // Amount range filter
      if (filters.minAmount && payment.amount < filters.minAmount) {
        return false;
      }
      if (filters.maxAmount && payment.amount > filters.maxAmount) {
        return false;
      }

      // Date range filter
      if (filters.startDate && new Date(payment.paymentDate || payment.createdAt) < new Date(filters.startDate)) {
        return false;
      }
      if (filters.endDate && new Date(payment.paymentDate || payment.createdAt) > new Date(filters.endDate)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Sort payments by various criteria
   */
  sortPayments(payments, sortBy = 'paymentDate', sortOrder = 'desc') {
    if (!payments || !Array.isArray(payments)) {
      return [];
    }

    return [...payments].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle date fields
      if (sortBy === 'paymentDate' || sortBy === 'createdAt' || sortBy === 'dueDate') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      // Handle null/undefined values
      if (aValue == null) aValue = sortBy === 'id' ? 0 : '';
      if (bValue == null) bValue = sortBy === 'id' ? 0 : '';

      // Numeric comparison for amount
      if (sortBy === 'amount') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      }

      // Default comparison
      return sortOrder === 'asc' ? (aValue < bValue ? -1 : aValue > bValue ? 1 : 0) : (aValue > bValue ? -1 : aValue < bValue ? 1 : 0);
    });
  }

  /**
   * Calculate payment status based on payment data
   */
  calculatePaymentStatus(payment) {
    if (!payment) return 'PENDING';

    // Always calculate status based on payment date and due date
    // Ignore any existing status field from the data source
    const paymentDate = payment.paymentDate ? new Date(payment.paymentDate) : null;
    const dueDate = payment.dueDate ? new Date(payment.dueDate) : null;
    const now = new Date();

    // If payment has been made (has payment date), it's completed
    if (paymentDate) {
      // If payment was made after due date, it was overdue but now paid
      if (dueDate && paymentDate > dueDate) {
        return 'COMPLETED'; // Was overdue, now paid
      }
      return 'COMPLETED'; // Normal completed payment
    }

    // If no payment date but has due date
    if (dueDate) {
      // If due date is in the past, it's overdue
      if (dueDate < now) {
        return 'OVERDUE';
      }
      // If due date is in the future, it's pending
      return 'PENDING';
    }

    // Default to completed for existing payments without due dates
    return 'COMPLETED';
  }

  /**
   * Calculate payment analytics
   */
  calculatePaymentAnalytics(payments) {
    if (!payments || !Array.isArray(payments)) {
      return {};
    }

    const analytics = {
      totalPayments: payments.length,
      totalAmount: 0,
      completedPayments: 0,
      pendingPayments: 0,
      overduePayments: 0,
      averageAmount: 0,
      monthlyTotals: {},
      statusBreakdown: {}
    };

    payments.forEach(payment => {
      const amount = payment.amount || 0;
      analytics.totalAmount += amount;

      // Calculate status for this payment
      const status = this.calculatePaymentStatus(payment);
      analytics.statusBreakdown[status] = (analytics.statusBreakdown[status] || 0) + 1;

      // Status counts
      if (status === 'COMPLETED' || status === 'PAID') {
        analytics.completedPayments++;
      } else if (status === 'PENDING') {
        analytics.pendingPayments++;
      } else if (status === 'OVERDUE') {
        analytics.overduePayments++;
      }

      // Monthly totals
      const date = new Date(payment.paymentDate || payment.createdAt);
      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        analytics.monthlyTotals[monthKey] = (analytics.monthlyTotals[monthKey] || 0) + amount;
      }
    });

    analytics.averageAmount = analytics.totalPayments > 0 ? analytics.totalAmount / analytics.totalPayments : 0;

    // Calculate success rate
    const totalProcessedPayments = analytics.completedPayments + analytics.overduePayments;
    analytics.paymentSuccessRate = totalProcessedPayments > 0 ? (analytics.completedPayments / totalProcessedPayments) * 100 : 0;

    return analytics;
  }

  /**
   * Format payment for display
   */
  formatPaymentForDisplay(payment) {
    return {
      ...payment,
      formattedAmount: `${(payment.amount || 0).toFixed(3)} TND`,
      formattedPaymentDate: payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A',
      formattedCreatedAt: payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A',
      formattedDueDate: payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'N/A',
      isOverdue: this.isPaymentOverdue(payment),
      daysOverdue: this.getDaysOverdue(payment)
    };
  }

  /**
   * Check if a payment is overdue
   */
  isPaymentOverdue(payment) {
    const status = this.calculatePaymentStatus(payment);
    return status === 'OVERDUE';
  }

  /**
   * Get days overdue for a payment
   */
  getDaysOverdue(payment) {
    if (!payment.dueDate || !this.isPaymentOverdue(payment)) return 0;

    const dueDate = new Date(payment.dueDate);
    const now = new Date();
    const diffTime = now - dueDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get payments for a specific client
   */
  async getPaymentsByClientId(clientId) {
    try {
      if (!clientId) {
        throw new Error('Client ID is required');
      }

      const allPayments = await this.getAllPayments();
      return allPayments.filter(payment => payment.clientId === clientId);
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to fetch payments by client ID');
      return [];
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;