export const ssr = false;

import { clientsApi } from '$lib/api';
import { redirect } from '@sveltejs/kit';

export async function load({ params }) {
    if (!params.id || params.id === 'undefined') {
        throw redirect(307, '/clients');
    }

    try {
        const response = await clientsApi.getById(params.id);
        if (!response.success) {
            throw new Error(response.error || 'Failed to load client');
        }

        return {
            client: response.data
        };
    } catch (error) {
        console.error('Error loading client:', error);
        return {
            error: error.message
        };
    }
} 