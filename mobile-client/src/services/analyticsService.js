import { apiService } from './apiService';
import { cessionService } from './cessionService';
import { clientService } from './clientService';
import { paymentService } from './paymentService';
import { ErrorHandler } from '../utils/errorHandling';

class AnalyticsService {
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
      ErrorHandler.logError(error, 'Failed to initialize AnalyticsService');
    }
  }

  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics() {
    try {
      // Load all required data in parallel with error handling
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

      // Calculate analytics
      const analytics = {
        overview: this.calculateOverviewStats(cessions, clients, payments),
        monthlyTrends: this.calculateMonthlyTrends(cessions, payments).trends,
        monthlyPayments: this.calculateMonthlyTrends(cessions, payments).payments,
        clientAnalytics: this.calculateClientAnalytics(clients, cessions),
        paymentAnalytics: payments.length > 0 ? paymentService.calculatePaymentAnalytics(payments) : this.getEmptyPaymentAnalytics(),
        cessionAnalytics: cessionService.getCessionStatistics ? await cessionService.getCessionStatistics().catch(() => this.getEmptyCessionAnalytics()) : this.getEmptyCessionAnalytics(),
        riskAnalysis: this.calculateRiskAnalysis(cessions, payments),
        businessInsights: this.generateBusinessInsights(cessions, clients, payments)
      };

      return analytics;
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to fetch dashboard analytics');
      // Return minimal analytics with available data
      return this.getFallbackAnalytics();
    }
  }

  /**
   * Calculate overview statistics
   */
  calculateOverviewStats(cessions, clients, payments) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Basic counts
    const totalClients = clients.length;
    const totalCessions = cessions.length;
    const activeCessions = cessions.filter(c => c.status === 'ACTIVE').length;
    const completedCessions = cessions.filter(c => c.status === 'FINISHED' || c.status === 'COMPLETED').length;

    // Financial calculations
    const totalLoanAmount = cessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0);
    const monthlyPaymentTotal = cessions
      .filter(c => c.status === 'ACTIVE')
      .reduce((sum, c) => sum + (c.monthlyPayment || 0), 0);

    // Current month payments (all exported payments are considered completed)
    const currentMonthPayments = payments.filter(p => {
      const paymentDate = new Date(p.createdAt || p.paymentDate);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    });
    const monthlyRevenue = currentMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCessions = cessions.filter(c => {
      const createdDate = new Date(c.createdAt);
      return createdDate >= thirtyDaysAgo;
    }).length;

    const recentClients = clients.filter(c => {
      const createdDate = new Date(c.createdAt || c.dateCreated);
      return createdDate >= thirtyDaysAgo;
    }).length;

    return {
      totalClients,
      totalCessions,
      activeCessions,
      completedCessions,
      totalLoanAmount,
      monthlyPaymentTotal,
      monthlyRevenue,
      recentCessions,
      recentClients,
      completionRate: totalCessions > 0 ? (completedCessions / totalCessions) * 100 : 0,
      averageLoanAmount: totalCessions > 0 ? totalLoanAmount / totalCessions : 0
    };
  }

  /**
   * Calculate monthly trends
   */
  calculateMonthlyTrends(cessions, payments) {
    const now = new Date();
    const trends = [];
    const paymentsByMonth = [];

    // Calculate last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      // New cessions this month (created or started)
      const monthCessions = cessions.filter(c => {
        const createdDate = new Date(c.createdAt || c.startDate);
        return createdDate >= monthStart && createdDate <= monthEnd;
      });

      // Active cessions during this month
      const activeCessions = cessions.filter(c => {
        if (c.status !== 'ACTIVE') return false;
        const startDate = new Date(c.startDate);
        const endDate = new Date(c.startDate);
        endDate.setMonth(endDate.getMonth() + (c.paymentCount || 0));
        return startDate <= monthEnd && endDate >= monthStart;
      });

      // Payments this month (all exported payments are considered completed)
      const monthPayments = payments.filter(p => {
        const paymentDate = new Date(p.createdAt || p.paymentDate);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      });

      trends.push({
        month: monthStart.toLocaleDateString('default', { month: 'short' }),
        year: monthStart.getFullYear(),
        count: monthCessions.length,
        value: monthCessions.reduce((sum, c) => sum + (c.totalLoanAmount || 0), 0),
        activeCessionsCount: activeCessions.length,
        activeValue: activeCessions.reduce((sum, c) => sum + (c.monthlyPayment || 0), 0)
      });

      paymentsByMonth.push({
        month: monthStart.toLocaleDateString('default', { month: 'short' }),
        year: monthStart.getFullYear(),
        count: monthPayments.length,
        amount: monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      });
    }

    return { trends, payments: paymentsByMonth };
  }

  /**
   * Calculate client analytics
   */
  calculateClientAnalytics(clients, cessions) {
    const clientStats = {};

    // Group cessions by client
    cessions.forEach(cession => {
      const clientId = cession.clientId;
      if (!clientStats[clientId]) {
        const client = clients.find(c => c.id === clientId);
        clientStats[clientId] = {
          clientId,
          clientName: client?.fullName || 'Unknown Client',
          totalCessions: 0,
          activeCessions: 0,
          completedCessions: 0,
          totalLoanAmount: 0,
          totalPaid: 0
        };
      }

      clientStats[clientId].totalCessions++;
      clientStats[clientId].totalLoanAmount += cession.totalLoanAmount || 0;

      if (cession.status === 'ACTIVE') {
        clientStats[clientId].activeCessions++;
      } else if (cession.status === 'FINISHED' || cession.status === 'COMPLETED') {
        clientStats[clientId].completedCessions++;
      }
    });

    // Convert to array and sort by total loan amount
    const topClients = Object.values(clientStats)
      .sort((a, b) => b.totalLoanAmount - a.totalLoanAmount)
      .slice(0, 10);

    return {
      totalUniqueClients: Object.keys(clientStats).length,
      topClients,
      clientRetention: Object.values(clientStats).filter(c => c.totalCessions > 1).length,
      averageCessionsPerClient: Object.values(clientStats).length > 0
        ? cessions.length / Object.values(clientStats).length
        : 0
    };
  }

  /**
   * Calculate risk analysis
   */
  calculateRiskAnalysis(cessions, payments) {
    const now = new Date();

    // Overdue cessions
    const overdueCessions = cessions.filter(c => {
      if (c.status !== 'ACTIVE') return false;
      if (!c.startDate || !c.paymentCount) return false;

      const endDate = new Date(c.startDate);
      endDate.setMonth(endDate.getMonth() + c.paymentCount);
      return endDate < now;
    });

    // High-risk clients (multiple overdue cessions)
    const highRiskClients = {};
    overdueCessions.forEach(cession => {
      const clientId = cession.clientId;
      highRiskClients[clientId] = (highRiskClients[clientId] || 0) + 1;
    });

    // Payment trends
    const recentPayments = payments.filter(p => {
      const paymentDate = new Date(p.createdAt || p.paymentDate);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return paymentDate >= thirtyDaysAgo;
    });

    const onTimePayments = recentPayments.filter(p => {
      // All exported payments are considered completed/on-time
      return true;
    }).length;

    const paymentSuccessRate = recentPayments.length > 0
      ? (onTimePayments / recentPayments.length) * 100
      : 100;

    return {
      overdueCessions: overdueCessions.length,
      highRiskClients: Object.keys(highRiskClients).length,
      paymentSuccessRate,
      riskScore: Math.max(0, 100 - (overdueCessions.length * 2)),
      criticalAlerts: overdueCessions.length > 5 ? 'High' : overdueCessions.length > 2 ? 'Medium' : 'Low'
    };
  }

  /**
   * Generate business insights
   */
  generateBusinessInsights(cessions, clients, payments) {
    const insights = [];

    // Revenue growth insight
    const currentMonth = new Date();
    const lastMonth = new Date(currentMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const currentMonthRevenue = payments.filter(p => {
      const paymentDate = new Date(p.createdAt || p.paymentDate);
      return paymentDate.getMonth() === currentMonth.getMonth() &&
             paymentDate.getFullYear() === currentMonth.getFullYear();
    }).reduce((sum, p) => sum + (p.amount || 0), 0);

    const lastMonthRevenue = payments.filter(p => {
      const paymentDate = new Date(p.createdAt || p.paymentDate);
      return paymentDate.getMonth() === lastMonth.getMonth() &&
             paymentDate.getFullYear() === lastMonth.getFullYear();
    }).reduce((sum, p) => sum + (p.amount || 0), 0);

    if (lastMonthRevenue > 0) {
      const growthRate = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
      insights.push({
        type: growthRate >= 0 ? 'positive' : 'negative',
        title: 'Revenue Growth',
        value: `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`,
        description: `Compared to last month`
      });
    }

    // Client acquisition insight
    const recentClients = clients.filter(c => {
      const createdDate = new Date(c.createdAt || c.dateCreated);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdDate >= thirtyDaysAgo;
    }).length;

    insights.push({
      type: 'info',
      title: 'New Clients',
      value: recentClients,
      description: 'In the last 30 days'
    });

    // Completion rate insight
    const completedCessions = cessions.filter(c => c.status === 'FINISHED' || c.status === 'COMPLETED').length;
    const completionRate = cessions.length > 0 ? (completedCessions / cessions.length) * 100 : 0;

    insights.push({
      type: completionRate >= 80 ? 'positive' : completionRate >= 60 ? 'warning' : 'negative',
      title: 'Completion Rate',
      value: `${completionRate.toFixed(1)}%`,
      description: `${completedCessions} of ${cessions.length} cessions completed`
    });

    return insights;
  }

  /**
   * Get empty payment analytics when payment data is not available
   */
  getEmptyPaymentAnalytics() {
    return {
      totalPayments: 0,
      totalAmount: 0,
      completedPayments: 0,
      pendingPayments: 0,
      overduePayments: 0,
      averageAmount: 0,
      monthlyTotals: {},
      statusBreakdown: {}
    };
  }

  /**
   * Get empty cession analytics when cession data is not available
   */
  getEmptyCessionAnalytics() {
    return {
      total: 0,
      active: 0,
      completed: 0,
      overdue: 0,
      totalLoanAmount: 0,
      totalRemainingBalance: 0,
      totalMonthlyPayments: 0,
      averageProgress: 0
    };
  }

  /**
   * Get fallback analytics when all data sources fail
   */
  getFallbackAnalytics() {
    return {
      overview: {
        totalClients: 0,
        totalCessions: 0,
        activeCessions: 0,
        completedCessions: 0,
        totalLoanAmount: 0,
        monthlyPaymentTotal: 0,
        monthlyRevenue: 0,
        recentCessions: 0,
        recentClients: 0,
        completionRate: 0,
        averageLoanAmount: 0
      },
      monthlyTrends: [],
      monthlyPayments: [],
      clientAnalytics: {
        totalUniqueClients: 0,
        topClients: [],
        clientRetention: 0,
        averageCessionsPerClient: 0
      },
      paymentAnalytics: this.getEmptyPaymentAnalytics(),
      cessionAnalytics: this.getEmptyCessionAnalytics(),
      riskAnalysis: {
        overdueCessions: 0,
        highRiskClients: 0,
        paymentSuccessRate: 100,
        riskScore: 100,
        criticalAlerts: 'Low'
      },
      businessInsights: [{
        type: 'info',
        title: 'Offline Mode',
        value: 'Active',
        description: 'Using cached data - some features may be limited'
      }]
    };
  }

  /**
   * Format analytics for display
   */
  formatAnalyticsForDisplay(analytics) {
    return {
      ...analytics,
      overview: {
        ...analytics.overview,
        formattedTotalLoanAmount: `${analytics.overview.totalLoanAmount.toFixed(3)} TND`,
        formattedMonthlyRevenue: `${analytics.overview.monthlyRevenue.toFixed(3)} TND`,
        formattedAverageLoanAmount: `${analytics.overview.averageLoanAmount.toFixed(3)} TND`
      },
      monthlyTrends: analytics.monthlyTrends.map(trend => ({
        ...trend,
        formattedRevenue: `${trend.revenue.toFixed(3)} TND`
      }))
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;