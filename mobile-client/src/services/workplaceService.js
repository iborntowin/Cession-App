import { apiService } from './apiService';
import { supabaseService } from './supabaseService';
import { ErrorHandler } from '../utils/errorHandling';

class WorkplaceService {
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
      ErrorHandler.logError(error, 'Failed to initialize WorkplaceService');
    }
  }

  /**
   * Get all workplaces from export data (offline-first approach)
   */
  async getAllWorkplaces() {
    try {
      const data = await supabaseService.getCurrentData();
      return data.workplaces || [];
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to fetch workplaces from export data');
      throw new Error(`Failed to fetch workplaces: ${error.message}`);
    }
  }

  /**
   * Get all jobs from export data
   */
  async getAllJobs() {
    try {
      const data = await supabaseService.getCurrentData();
      return data.jobs || [];
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to fetch jobs from export data');
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }
  }

  /**
   * Get workplace by ID
   */
  async getWorkplaceById(workplaceId) {
    try {
      if (!workplaceId) {
        throw new Error('Workplace ID is required');
      }

      const allWorkplaces = await this.getAllWorkplaces();
      const workplace = allWorkplaces.find(w => w.id === workplaceId || w.id === parseInt(workplaceId));

      if (!workplace) {
        throw new Error('Workplace not found');
      }

      return workplace;
    } catch (error) {
      throw new Error(`Failed to fetch workplace: ${error.message}`);
    }
  }

  /**
   * Filter workplaces by various criteria
   */
  filterWorkplaces(workplaces, filters) {
    if (!workplaces || !Array.isArray(workplaces)) {
      return [];
    }

    return workplaces.filter(workplace => {
      // Name filter
      if (filters.name && !workplace.name?.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }

      // Has jobs filter
      if (filters.hasJobs !== undefined) {
        const hasJobs = workplace.jobs && workplace.jobs.length > 0;
        if (filters.hasJobs !== hasJobs) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Sort workplaces by various criteria
   */
  sortWorkplaces(workplaces, sortBy = 'name', sortOrder = 'asc') {
    if (!workplaces || !Array.isArray(workplaces)) {
      return [];
    }

    return [...workplaces].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      // Handle jobs count
      if (sortBy === 'jobsCount') {
        aValue = a.jobs ? a.jobs.length : 0;
        bValue = b.jobs ? b.jobs.length : 0;
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
   * Calculate workplace analytics
   */
  async calculateWorkplaceAnalytics(workplaces, clients = []) {
    try {
      if (!workplaces || !Array.isArray(workplaces)) {
        return {};
      }

      const data = await supabaseService.getCurrentData();
      const allJobs = data.jobs || [];

      const analytics = {
        totalWorkplaces: workplaces.length,
        totalJobs: allJobs.length,
        workplacesWithJobs: 0,
        workplacesWithoutJobs: 0,
        averageJobsPerWorkplace: 0,
        mostPopularWorkplace: null,
        clientDistribution: {}
      };

      // Calculate job statistics
      workplaces.forEach(workplace => {
        const jobCount = allJobs.filter(job => job.workplaceId === workplace.id).length;
        if (jobCount > 0) {
          analytics.workplacesWithJobs++;
        } else {
          analytics.workplacesWithoutJobs++;
        }
      });

      analytics.averageJobsPerWorkplace = analytics.totalWorkplaces > 0
        ? analytics.totalJobs / analytics.totalWorkplaces
        : 0;

      // Calculate client distribution if clients data is available
      if (clients && Array.isArray(clients)) {
        const workplaceClientCounts = {};

        clients.forEach(client => {
          if (client.workplaceName) {
            const name = client.workplaceName.trim();
            workplaceClientCounts[name] = (workplaceClientCounts[name] || 0) + 1;
          } else if (client.workplaceId) {
            // Find workplace by ID
            const workplace = workplaces.find(w => w.id === client.workplaceId);
            if (workplace) {
              workplaceClientCounts[workplace.name] = (workplaceClientCounts[workplace.name] || 0) + 1;
            }
          }
        });

        analytics.clientDistribution = workplaceClientCounts;

        // Find most popular workplace
        const mostPopular = Object.entries(workplaceClientCounts)
          .sort(([,a], [,b]) => b - a)[0];

        if (mostPopular) {
          analytics.mostPopularWorkplace = {
            name: mostPopular[0],
            clientCount: mostPopular[1]
          };
        }
      }

      return analytics;
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to calculate workplace analytics');
      return {
        totalWorkplaces: workplaces ? workplaces.length : 0,
        totalJobs: 0,
        workplacesWithJobs: 0,
        workplacesWithoutJobs: workplaces ? workplaces.length : 0,
        averageJobsPerWorkplace: 0,
        mostPopularWorkplace: null,
        clientDistribution: {}
      };
    }
  }

  /**
   * Format workplace for display
   */
  async formatWorkplaceForDisplay(workplace, clients = []) {
    try {
      if (!workplace) {
        return {
          jobsCount: 0,
          clientCount: 0,
          formattedCreatedAt: 'N/A',
          hasJobs: false
        };
      }

      const data = await supabaseService.getCurrentData();
      const allJobs = data.jobs || [];
      const workplaceJobs = allJobs.filter(job => job.workplaceId === workplace.id);

      const clientCount = clients.filter(c =>
        c.workplaceId === workplace.id ||
        c.workplaceName === workplace.name
      ).length;

      return {
        ...workplace,
        jobsCount: workplaceJobs.length,
        clientCount,
        formattedCreatedAt: workplace.createdAt ? new Date(workplace.createdAt).toLocaleDateString() : 'N/A',
        hasJobs: workplaceJobs.length > 0
      };
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to format workplace for display');
      return {
        ...workplace,
        jobsCount: 0,
        clientCount: 0,
        formattedCreatedAt: 'N/A',
        hasJobs: false
      };
    }
  }

  /**
   * Get jobs for a workplace
   */
  async getWorkplaceJobs(workplace) {
    try {
      if (!workplace || !workplace.id) {
        console.log('getWorkplaceJobs: Invalid workplace', workplace);
        return [];
      }

      const data = await supabaseService.getCurrentData();
      const allJobs = data.jobs || [];

      console.log(`getWorkplaceJobs: Found ${allJobs.length} total jobs for workplace ${workplace.id}`);

      const workplaceJobs = allJobs.filter(job => {
        const matches = job && job.workplaceId === workplace.id;
        if (matches) {
          console.log(`getWorkplaceJobs: Found job ${job.name} for workplace ${workplace.id}`);
        }
        return matches;
      });

      console.log(`getWorkplaceJobs: Returning ${workplaceJobs.length} jobs for workplace ${workplace.id}`);
      return workplaceJobs;
    } catch (error) {
      console.error('getWorkplaceJobs: Error', error);
      ErrorHandler.logError(error, 'Failed to fetch jobs for workplace');
      return [];
    }
  }

  /**
   * Search workplaces by name
   */
  async searchWorkplaces(workplaces, searchQuery) {
    try {
      if (!searchQuery || !workplaces || !Array.isArray(workplaces)) {
        return workplaces;
      }

      const data = await supabaseService.getCurrentData();
      const allJobs = data.jobs || [];
      const query = searchQuery.toLowerCase();

      return workplaces.filter(workplace => {
        // Check workplace name
        if (workplace.name?.toLowerCase().includes(query)) {
          return true;
        }

        // Check jobs for this workplace
        const workplaceJobs = allJobs.filter(job => job.workplaceId === workplace.id);
        return workplaceJobs.some(job => job.name?.toLowerCase().includes(query));
      });
    } catch (error) {
      ErrorHandler.logError(error, 'Failed to search workplaces');
      return workplaces;
    }
  }
}

export const workplaceService = new WorkplaceService();
export default workplaceService;