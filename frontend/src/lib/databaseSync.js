import { showAlert } from './stores';
import { getTauriInvoke } from './tauriUtils';

// Database sync service for unified Tauri app
export class DatabaseSyncService {
  constructor() {
    this.platform = null;
    this.isInitialized = false;
    this.invoke = null;
  }

  // Initialize Tauri API
  async initializeTauriAPI() {
    if (this.invoke) return this.invoke;

    this.invoke = await getTauriInvoke();
    return this.invoke;
  }

  // Initialize the service and detect platform
  async initialize() {
    try {
      if (this.isInitialized) return;

      await this.initializeTauriAPI();

      // Get platform info from Tauri
      const platformInfo = await this.invoke('get_platform_info');
      this.platform = platformInfo.platform;
      this.isInitialized = true;

      console.log('DatabaseSyncService initialized for platform:', this.platform);
      return { success: true, platform: this.platform };
    } catch (error) {
      console.error('Failed to initialize DatabaseSyncService:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current platform
  getPlatform() {
    return this.platform;
  }

  // Check if running on desktop (uses H2 database)
  isDesktop() {
    return this.platform === 'windows' || this.platform === 'macos' || this.platform === 'linux';
  }

  // Check if running on mobile (uses SQLite database)
  isMobile() {
    return this.platform === 'ios' || this.platform === 'android';
  }

  // Export H2 database to SQLite format (desktop only)
  async exportDatabaseToSqlite() {
    if (!this.isDesktop()) {
      throw new Error('Database export is only available on desktop platforms');
    }

    try {
      showAlert('Exporting database...', 'info');
      const result = await this.invoke('export_database_to_sqlite');
      showAlert('Database exported successfully', 'success');
      return { success: true, data: result };
    } catch (error) {
      console.error('Database export failed:', error);
      showAlert(`Database export failed: ${error}`, 'error');
      return { success: false, error: error.message };
    }
  }

  // Upload SQLite database to Supabase (desktop only)
  async uploadDatabaseToSupabase(localDbPath = null) {
    if (!this.isDesktop()) {
      throw new Error('Database upload is only available on desktop platforms');
    }

    try {
      showAlert('Uploading database to cloud...', 'info');
      const result = await this.invoke('upload_database_to_supabase', { local_db_path: localDbPath });
      showAlert('Database uploaded successfully', 'success');
      return { success: true, data: result };
    } catch (error) {
      console.error('Database upload failed:', error);
      showAlert(`Database upload failed: ${error}`, 'error');
      return { success: false, error: error.message };
    }
  }

  // Download SQLite database from Supabase (mobile only)
  async downloadDatabaseFromSupabase(filename = null) {
    if (!this.isMobile()) {
      throw new Error('Database download is only available on mobile platforms');
    }

    try {
      showAlert('Downloading database from cloud...', 'info');
      const result = await this.invoke('download_database_from_supabase', { filename });
      showAlert('Database downloaded successfully', 'success');
      return { success: true, data: result };
    } catch (error) {
      console.error('Database download failed:', error);
      showAlert(`Database download failed: ${error}`, 'error');
      return { success: false, error: error.message };
    }
  }

  // Get latest database info from Supabase
  async getLatestDatabaseInfo() {
    try {
      const result = await this.invoke('get_latest_database_info');
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get database info:', error);
      return { success: false, error: error.message };
    }
  }

  // Sync database based on platform
  async syncDatabase() {
    try {
      if (this.isDesktop()) {
        // Desktop: Export H2 to SQLite and upload to Supabase
        const exportResult = await this.exportDatabaseToSqlite();
        if (!exportResult.success) {
          return exportResult;
        }

        const uploadResult = await this.uploadDatabaseToSupabase(exportResult.data);
        return uploadResult;
      } else if (this.isMobile()) {
        // Mobile: Download SQLite from Supabase
        const downloadResult = await this.downloadDatabaseFromSupabase();
        return downloadResult;
      } else {
        throw new Error('Unknown platform for database sync');
      }
    } catch (error) {
      console.error('Database sync failed:', error);
      showAlert(`Database sync failed: ${error}`, 'error');
      return { success: false, error: error.message };
    }
  }

  // Check if database sync is needed
  async checkSyncNeeded() {
    try {
      const latestInfo = await this.getLatestDatabaseInfo();
      if (!latestInfo.success) {
        return { success: false, error: latestInfo.error };
      }

      // For mobile, check if local database is older than cloud version
      if (this.isMobile()) {
        // This would need additional logic to compare timestamps
        // For now, we'll assume sync is needed if we can reach Supabase
        return { success: true, needed: true, reason: 'Mobile platform requires cloud sync' };
      }

      // For desktop, sync is typically initiated manually
      return { success: true, needed: false, reason: 'Desktop platform syncs on demand' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
export const databaseSyncService = new DatabaseSyncService();