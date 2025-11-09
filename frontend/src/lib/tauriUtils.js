// Tauri API utilities - conditionally available based on environment

export async function getTauriInvoke() {
  if (typeof window !== 'undefined' && window.__TAURI__) {
    // In Tauri environment, try to get invoke from various possible locations
    if (window.__TAURI_INVOKE__) {
      return window.__TAURI_INVOKE__;
    }
    if (window.invoke) {
      return window.invoke;
    }
    // For development, return a mock function
    console.warn('Tauri invoke not found, using development mock');
    return async (cmd, args) => {
      console.log(`[MOCK] Tauri invoke: ${cmd}`, args);
      switch (cmd) {
        case 'get_platform_info':
          return { platform: 'windows' }; // Mock desktop platform
        case 'export_database_to_sqlite':
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
          return { success: true, message: 'Database exported successfully' };
        case 'upload_database_to_supabase':
          await new Promise(resolve => setTimeout(resolve, 1500));
          return { success: true, message: 'Database uploaded to Supabase' };
        case 'download_database_from_supabase':
          await new Promise(resolve => setTimeout(resolve, 1200));
          return { success: true, message: 'Database downloaded from Supabase' };
        case 'get_latest_database_info':
          return {
            fileSize: 2048000,
            lastModified: new Date().toISOString(),
            version: '1.0.0'
          };
        default:
          throw new Error(`Unknown Tauri command: ${cmd}`);
      }
    };
  } else {
    throw new Error('Not running in Tauri environment');
  }
}

export function isTauriEnvironment() {
  return typeof window !== 'undefined' && window.__TAURI__;
}