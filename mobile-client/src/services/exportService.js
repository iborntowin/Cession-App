import { apiService } from './apiService';

class ExportService {
  async getExportStatus() {
    try {
      const response = await apiService.get('/export/status');
      return response.data || response;
    } catch (error) {
      // Handle 204 No Content response (no exports yet)
      if (error.message.includes('204')) {
        return null;
      }
      throw new Error(`Failed to fetch export status: ${error.message}`);
    }
  }

  async triggerManualExport() {
    try {
      const response = await apiService.post('/export/manual');
      return response.data || response;
    } catch (error) {
      throw new Error(`Failed to trigger manual export: ${error.message}`);
    }
  }

  async getExportHistory() {
    try {
      const response = await apiService.get('/export/history');
      return response.data || response;
    } catch (error) {
      throw new Error(`Failed to fetch export history: ${error.message}`);
    }
  }

  async downloadExportFile(exportId) {
    try {
      if (!exportId) {
        throw new Error('Export ID is required');
      }
      
      const response = await apiService.get(`/export/${exportId}/download`);
      return response.data || response;
    } catch (error) {
      throw new Error(`Failed to download export file: ${error.message}`);
    }
  }

  // Utility methods for export data processing
  formatExportStatus(status) {
    const statusMap = {
      'SUCCESS': 'Completed',
      'FAILED': 'Failed',
      'IN_PROGRESS': 'In Progress',
      'PENDING': 'Pending'
    };
    return statusMap[status] || status;
  }

  getStatusColor(status) {
    switch (status) {
      case 'SUCCESS':
        return '#4CAF50';
      case 'FAILED':
        return '#FF5722';
      case 'IN_PROGRESS':
        return '#FF9800';
      case 'PENDING':
        return '#2196F3';
      default:
        return '#757575';
    }
  }

  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 KB';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  formatTimestamp(timestamp) {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }

  isExportRecent(timestamp, thresholdMinutes = 30) {
    if (!timestamp) return false;
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    return diffMins <= thresholdMinutes;
  }

  shouldShowRefreshIndicator(status) {
    return status === 'IN_PROGRESS' || status === 'PENDING';
  }
}

export const exportService = new ExportService();
export default exportService;