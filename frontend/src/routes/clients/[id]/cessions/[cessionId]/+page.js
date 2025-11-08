import { browser } from '$app/environment';
import { getBackendUrl } from '$lib/config';
import { getAuthHeaders } from '$lib/api';
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
    // Validate parameters
    if (!params.id || params.id === 'undefined' || !params.cessionId || params.cessionId === 'undefined') {
        throw redirect(303, '/clients');
    }

    // During SSR, don't attempt to fetch data - let the client component handle it
    if (!browser) {
        return {
            client: null,
            cession: null,
            clientId: params.id,
            cessionId: params.cessionId,
            error: null
        };
    }

    try {
        const BACKEND_URL = getBackendUrl();
        const headers = getAuthHeaders();

        // Fetch client data
        const clientResponse = await fetch(`${BACKEND_URL}/api/v1/clients/${params.id}`, {
            headers: headers
        });

        if (!clientResponse.ok) {
            if (clientResponse.status === 401 || clientResponse.status === 403) {
                // Authentication error - redirect to login
                throw redirect(303, '/login');
            }
            throw new Error('Failed to fetch client');
        }

        const client = await clientResponse.json();

        // Fetch cession data
        const cessionResponse = await fetch(`${BACKEND_URL}/api/v1/cessions/${params.cessionId}`, {
            headers: headers
        });

        if (!cessionResponse.ok) {
            if (cessionResponse.status === 401 || cessionResponse.status === 403) {
                // Authentication error - redirect to login
                throw redirect(303, '/login');
            }
            throw new Error('Failed to fetch cession');
        }

        const cession = await cessionResponse.json();

        return {
            client,
            cession,
            clientId: params.id,
            cessionId: params.cessionId,
            error: null
        };
    } catch (error) {
        console.error('Error loading cession details:', error);

        // If it's an authentication error, redirect to login
        if (error.message.includes('No authentication token found') ||
            error.message.includes('Authentication failed')) {
            throw redirect(303, '/login');
        }

        // For other errors, return error state
        return {
            client: null,
            cession: null,
            clientId: params.id,
            cessionId: params.cessionId,
            error: error.message
        };
    }
} 