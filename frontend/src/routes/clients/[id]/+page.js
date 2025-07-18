import { getBackendUrl } from '$lib/config';
import { getAuthHeaders } from '$lib/api';
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
    console.log('Client Page - Loading client data for ID:', params.id);

    if (!params.id || params.id === 'undefined' || params.id === 'new') {
        throw redirect(307, '/clients');
    }

    try {
        const BACKEND_URL = getBackendUrl();
        const headers = getAuthHeaders();
        
        const response = await fetch(`${BACKEND_URL}/api/v1/clients/${params.id}`, {
            headers: headers
        });

        if (!response.ok) {
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
        return {
            id: params.id,
            error: error.message
        };
    }
} 