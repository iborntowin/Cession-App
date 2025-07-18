import { storageService } from '../utils/storage';

class ConfigService {
  constructor() {
    this.SUPABASE_URL_KEY = 'supabase_public_url';
  }

  /**
   * Set the Supabase public URL
   */
  async setSupabaseUrl(url) {
    try {
      await storageService.setItem(this.SUPABASE_URL_KEY, url);
      return true;
    } catch (error) {
      console.error('Error saving Supabase URL:', error);
      throw new Error('Failed to save Supabase URL');
    }
  }

  /**
   * Get the stored Supabase public URL
   */
  async getSupabaseUrl() {
    try {
      return await storageService.getItem(this.SUPABASE_URL_KEY);
    } catch (error) {
      console.error('Error getting Supabase URL:', error);
      return null;
    }
  }

  /**
   * Check if Supabase URL is configured
   */
  async hasSupabaseUrl() {
    const url = await this.getSupabaseUrl();
    return url && url.trim() !== '';
  }

  /**
   * Clear the stored Supabase URL
   */
  async clearSupabaseUrl() {
    try {
      await storageService.removeItem(this.SUPABASE_URL_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing Supabase URL:', error);
      throw new Error('Failed to clear Supabase URL');
    }
  }

  /**
   * Validate if a URL looks like a valid Supabase public URL
   */
  validateSupabaseUrl(url) {
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'URL is required' };
    }

    const trimmedUrl = url.trim();
    
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return { isValid: false, error: 'URL must start with http:// or https://' };
    }

    try {
      new URL(trimmedUrl);
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Get default/example Supabase URLs for testing
   */
  getExampleUrls() {
    return [
      'https://your-project.supabase.co/storage/v1/object/public/exports/data.json',
      'https://example.supabase.co/storage/v1/object/public/bucket/file.json'
    ];
  }
}

export const configService = new ConfigService();
export default configService;