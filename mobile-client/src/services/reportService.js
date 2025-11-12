import { apiService } from './apiService';
import { cessionService } from './cessionService';
import { clientService } from './clientService';
import { paymentService } from './paymentService';
import { ErrorHandler } from '../utils/errorHandling';

class ReportService {
  constructor() {
    this.isInitialized = false;
    this.initializeService();
  }

  /**
   * Initialize the service
   */
  async initializeService() {
    try {
      this.isInitialized = true;
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to initialize ReportService');
    }
  }

  /**
   * Generate comprehensive reports
   */
  async generateReports(filters = {}) {
    try {
      // Load all required data with error handling
      const [cessionsResult, clientsResult, paymentsResult] = await Promise.allSettled([
        cessionService.getAllCessions(),
        clientService.getAllClients(),
        paymentService.getAllPayments().catch(error => {
          // Silently handle API failures for offline mode
          return []; // Return empty array as fallback
        })
      ]);

      // Extract data from results, using empty arrays as fallbacks
      const cessions = cessionsResult.status === 'fulfilled' ? cessionsResult.value : [];
      const clients = clientsResult.status === 'fulfilled' ? clientsResult.value : [];
      const payments = paymentsResult.status === 'fulfilled' ? paymentsResult.value : [];

      // Apply filters
      const filteredCessions = this.filterCessions(cessions, filters);
      const filteredClients = this.filterClients(clients, filters);
      const filteredPayments = this.filterPayments(payments, filters);

      // Generate different report types
      const reports = {
        summary: this.generateSummaryReport(filteredCessions, filteredClients, filteredPayments),
        clientReport: this.generateClientReport(filteredCessions, filteredClients),
        paymentReport: this.generatePaymentReport(filteredPayments, filteredCessions, filteredClients),
        cessionReport: this.generateCessionReport(filteredCessions, filteredClients),
        monthlyReport: this.generateMonthlyReport(filteredCessions, filteredPayments, filters.month),
        filters: filters
      };

      return reports;
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to generate reports');
      throw new Error(`Failed to generate reports: ${error.message}`);
    }
  }

  /**
   * Generate summary report
   */
  generateSummaryReport(cessions, clients, payments) {
    const totalCessions = cessions.length;
    const totalClients = clients.length;
    const totalPayments = payments.length;

    const totalLoanAmount = cessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
    const totalPaymentAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const activeCessions = cessions.filter(c => c.status === 'ACTIVE').length;
    const completedCessions = cessions.filter(c => c.status === 'FINISHED' || c.status === 'COMPLETED').length;

    const completedPayments = payments.filter(p => p.status === 'COMPLETED' || p.status === 'PAID').length;
    const pendingPayments = payments.filter(p => p.status === 'PENDING').length;
    const overduePayments = payments.filter(p => p.status === 'OVERDUE').length;

    return {
      totalCessions,
      totalClients,
      totalPayments,
      totalLoanAmount,
      totalPaymentAmount,
      activeCessions,
      completedCessions,
      completedPayments,
      pendingPayments,
      overduePayments,
      completionRate: totalCessions > 0 ? (completedCessions / totalCessions) * 100 : 0,
      paymentSuccessRate: totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0,
      averageLoanAmount: totalCessions > 0 ? totalLoanAmount / totalCessions : 0,
      averagePaymentAmount: totalPayments > 0 ? totalPaymentAmount / totalPayments : 0
    };
  }

  /**
   * Generate client report
   */
  generateClientReport(cessions, clients) {
    const clientReport = clients.map(client => {
      const clientCessions = cessions.filter(c => c.clientId === client.id);
      const clientPayments = clientCessions.flatMap(cession =>
        cession.payments || []
      );

      const totalLoanAmount = clientCessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
      const totalPaid = clientPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const remainingBalance = totalLoanAmount - totalPaid;

      return {
        clientId: client.id,
        clientName: client.fullName,
        cin: client.cin,
        workerNumber: client.workerNumber,
        totalCessions: clientCessions.length,
        activeCessions: clientCessions.filter(c => c.status === 'ACTIVE').length,
        completedCessions: clientCessions.filter(c => c.status === 'FINISHED' || c.status === 'COMPLETED').length,
        totalLoanAmount,
        totalPaid,
        remainingBalance,
        lastPaymentDate: clientPayments.length > 0
          ? new Date(Math.max(...clientPayments.map(p => new Date(p.createdAt || p.paymentDate))))
          : null
      };
    });

    return clientReport.sort((a, b) => b.totalLoanAmount - a.totalLoanAmount);
  }

  /**
   * Generate payment report
   */
  generatePaymentReport(payments, cessions, clients) {
    return payments.map(payment => {
      const cession = cessions.find(c => c.id === payment.cessionId);
      const client = cession ? clients.find(c => c.id === cession.clientId) : null;

      return {
        paymentId: payment.id,
        amount: payment.amount,
        status: payment.status,
        paymentDate: payment.paymentDate || payment.createdAt,
        dueDate: payment.dueDate,
        clientName: client?.fullName || 'Unknown Client',
        cessionId: payment.cessionId,
        totalLoanAmount: cession?.totalLoanAmount || 0,
        monthlyPayment: cession?.monthlyPayment || 0,
        isOverdue: paymentService.isPaymentOverdue(payment),
        daysOverdue: paymentService.getDaysOverdue(payment)
      };
    }).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
  }

  /**
   * Generate cession report
   */
  generateCessionReport(cessions, clients) {
    return cessions.map(cession => {
      const client = clients.find(c => c.id === cession.clientId);
      const payments = cession.payments || [];
      const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const remainingBalance = (cession.totalLoanAmount || 0) - totalPaid;

      return {
        cessionId: cession.id,
        clientName: client?.fullName || 'Unknown Client',
        status: cession.status,
        totalLoanAmount: cession.totalLoanAmount,
        monthlyPayment: cession.monthlyPayment,
        paymentCount: cession.paymentCount,
        startDate: cession.startDate,
        endDate: cession.endDate,
        totalPaid,
        remainingBalance,
        progress: cession.currentProgress || 0,
        bankOrAgency: cession.bankOrAgency,
        isOverdue: cessionService.isCessionOverdue(cession)
      };
    }).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }

  /**
   * Generate monthly report
   */
  generateMonthlyReport(cessions, payments, selectedMonth = null) {
    const now = new Date();
    const targetMonth = selectedMonth ? new Date(selectedMonth) : now;
    const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);

    // Filter data for the month
    const monthCessions = cessions.filter(c => {
      const startDate = new Date(c.startDate);
      return startDate >= monthStart && startDate <= monthEnd;
    });

    const monthPayments = payments.filter(p => {
      const paymentDate = new Date(p.createdAt || p.paymentDate);
      return paymentDate >= monthStart && paymentDate <= monthEnd;
    });

    const completedPayments = monthPayments.filter(p =>
      p.status === 'COMPLETED' || p.status === 'PAID'
    );

    return {
      month: targetMonth.toLocaleDateString('default', { month: 'long', year: 'numeric' }),
      newCessions: monthCessions.length,
      totalPayments: monthPayments.length,
      completedPayments: completedPayments.length,
      totalRevenue: completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      averagePayment: completedPayments.length > 0
        ? completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / completedPayments.length
        : 0
    };
  }

  /**
   * Filter cessions based on criteria
   */
  filterCessions(cessions, filters) {
    return cessions.filter(cession => {
      if (filters.status && cession.status !== filters.status) return false;
      if (filters.clientId && cession.clientId !== filters.clientId) return false;
      if (filters.month) {
        const cessionMonth = new Date(cession.startDate).getMonth();
        const cessionYear = new Date(cession.startDate).getFullYear();
        const filterMonth = new Date(filters.month).getMonth();
        const filterYear = new Date(filters.month).getFullYear();
        if (cessionMonth !== filterMonth || cessionYear !== filterYear) return false;
      }
      return true;
    });
  }

  /**
   * Filter clients based on criteria
   */
  filterClients(clients, filters) {
    return clients.filter(client => {
      if (filters.clientId && client.id !== filters.clientId) return false;
      return true;
    });
  }

  /**
   * Filter payments based on criteria
   */
  filterPayments(payments, filters) {
    return payments.filter(payment => {
      if (filters.status && payment.status !== filters.status) return false;
      if (filters.clientId && payment.clientId !== filters.clientId) return false;
      if (filters.month) {
        const paymentMonth = new Date(payment.createdAt || payment.paymentDate).getMonth();
        const paymentYear = new Date(payment.createdAt || payment.paymentDate).getFullYear();
        const filterMonth = new Date(filters.month).getMonth();
        const filterYear = new Date(filters.month).getFullYear();
        if (paymentMonth !== filterMonth || paymentYear !== filterYear) return false;
      }
      return true;
    });
  }

  /**
   * Export report data
   */
  async exportReport(reportType, filters = {}) {
    try {
      const reports = await this.generateReports(filters);

      // Format for export
      const exportData = {
        generatedAt: new Date().toISOString(),
        filters,
        data: reports[reportType] || reports.summary
      };

      return exportData;
    } catch (error) {
      throw new Error(`Failed to export report: ${error.message}`);
    }
  }

  /**
   * Format report data for display
   */
  formatReportForDisplay(report, type) {
    switch (type) {
      case 'summary':
        return {
          ...report,
          formattedTotalLoanAmount: `${report.totalLoanAmount.toFixed(3)} TND`,
          formattedTotalPaymentAmount: `${report.totalPaymentAmount.toFixed(3)} TND`,
          formattedAverageLoanAmount: `${report.averageLoanAmount.toFixed(3)} TND`,
          formattedAveragePaymentAmount: `${report.averagePaymentAmount.toFixed(3)} TND`,
          formattedCompletionRate: `${report.completionRate.toFixed(1)}%`,
          formattedPaymentSuccessRate: `${report.paymentSuccessRate.toFixed(1)}%`
        };

      case 'clientReport':
        return report.map(item => ({
          ...item,
          formattedTotalLoanAmount: `${item.totalLoanAmount.toFixed(3)} TND`,
          formattedTotalPaid: `${item.totalPaid.toFixed(3)} TND`,
          formattedRemainingBalance: `${item.remainingBalance.toFixed(3)} TND`,
          formattedLastPaymentDate: item.lastPaymentDate ? item.lastPaymentDate.toLocaleDateString() : 'Never'
        }));

      case 'paymentReport':
        return report.map(item => ({
          ...item,
          formattedAmount: `${item.amount.toFixed(3)} TND`,
          formattedPaymentDate: new Date(item.paymentDate).toLocaleDateString(),
          formattedDueDate: item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A',
          formattedTotalLoanAmount: `${item.totalLoanAmount.toFixed(3)} TND`,
          formattedMonthlyPayment: `${item.monthlyPayment.toFixed(3)} TND`
        }));

      case 'cessionReport':
        return report.map(item => ({
          ...item,
          formattedTotalLoanAmount: `${item.totalLoanAmount.toFixed(3)} TND`,
          formattedMonthlyPayment: `${item.monthlyPayment.toFixed(3)} TND`,
          formattedTotalPaid: `${item.totalPaid.toFixed(3)} TND`,
          formattedRemainingBalance: `${item.remainingBalance.toFixed(3)} TND`,
          formattedStartDate: new Date(item.startDate).toLocaleDateString(),
          formattedEndDate: item.endDate ? new Date(item.endDate).toLocaleDateString() : 'N/A',
          formattedProgress: `${item.progress.toFixed(1)}%`
        }));

      default:
        return report;
    }
  }
}

export const reportService = new ReportService();
export default reportService;