import { getBackendUrl } from '$lib/config';
import { getAuthHeaders } from '$lib/api';
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
    // Validate parameters
    if (!params.id || params.id === 'undefined' || !params.cessionId || params.cessionId === 'undefined') {
        throw redirect(303, '/clients');
    }

    try {
        const BACKEND_URL = getBackendUrl();
        const headers = getAuthHeaders();

        // Fetch client data
        const clientResponse = await fetch(`${BACKEND_URL}/api/v1/clients/${params.id}`, {
            headers: headers
        });

        if (!clientResponse.ok) {
            throw new Error('Failed to fetch client');
        }

        const client = await clientResponse.json();

        // Fetch cession data
        const cessionResponse = await fetch(`${BACKEND_URL}/api/v1/cessions/${params.cessionId}`, {
            headers: headers
        });

        if (!cessionResponse.ok) {
            throw new Error('Failed to fetch cession');
        }

        const cession = await cessionResponse.json();

        return {
            client,
            cession,
            clientId: params.id,
            cessionId: params.cessionId
        };
    } catch (error) {
        console.error('Error loading cession details:', error);
        throw error;
    }
} 