import { browser } from '$app/environment';

// Use environment variable for backend URL
export const config = {
    backendUrl: 'http://localhost:8082',
    apiPrefix: '' // Prefix is now included in the env variable
};

export function getBackendUrl() {
    return 'http://localhost:8082';
} 