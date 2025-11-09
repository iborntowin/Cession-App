import { browser } from '$app/environment';

// Detect if we're running in Tauri
function isTauri() {
    return browser && window.__TAURI__ !== undefined;
}

// Use environment variable for backend URL
export const config = {
    backendUrl: 'http://127.0.0.1:8082',
    apiPrefix: '', // Prefix is now included in the env variable

    // Supabase configuration for database sync
    supabase: {
        url: 'https://your-project.supabase.co', // Replace with your Supabase project URL
        anonKey: 'your-anon-key', // Replace with your Supabase anon key
        storageBucket: 'database-sync' // Bucket name for database files
    }
};

export function getBackendUrl() {
    // In Tauri, always use 127.0.0.1 instead of localhost
    // This ensures it works in both dev and production Tauri builds
    return 'http://127.0.0.1:8082';
} 