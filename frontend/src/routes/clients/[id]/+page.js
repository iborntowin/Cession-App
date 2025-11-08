import { browser } from '$app/environment';
import { getBackendUrl } from '$lib/config';
import { getAuthHeaders } from '$lib/api';
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
    console.log('Client Page - Loading client data for ID:', params.id);

    if (!params.id || params.id === 'undefined' || params.id === 'new') {
        throw redirect(307, '/clients');
    }

    // During SSR, don't attempt to fetch data - let the client component handle it
    if (!browser) {
        return {
            id: params.id,
            client: null,
            cessions: [],
            error: null
        };
    }

    try {
        const BACKEND_URL = getBackendUrl();
        const headers = getAuthHeaders();

        const response = await fetch(`${BACKEND_URL}/api/v1/clients/${params.id}`, {
            headers: headers
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Authentication error - redirect to login
                throw redirect(303, '/login');
            }
            throw new Error('Failed to fetch client');
        }

        const client = await response.json();

        // Fetch client's cessions
        const cessionsResponse = await fetch(`${BACKEND_URL}/api/v1/cessions/client/${params.id}`, {
            headers: headers
        });

        if (!cessionsResponse.ok) {
            throw new Error('Failed to fetch cessions');
        }

        const cessions = await cessionsResponse.json();

        return {
            id: params.id,
            client,
            cessions
        };
    } catch (error) {
        console.error('Client Page - Error loading client:', error);

        // If it's an authentication error, redirect to login
        if (error.message.includes('No authentication token found') ||
            error.message.includes('Authentication failed')) {
            throw redirect(303, '/login');
        }

        // For other errors, return error state
        return {
            id: params.id,
            client: null,
            cessions: [],
            error: error.message
        };
    }
} 