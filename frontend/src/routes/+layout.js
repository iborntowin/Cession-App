import { redirect } from '@sveltejs/kit';
import { token } from '$lib/stores';
import { get } from 'svelte/store';
import { browser } from '$app/environment';

/** @type {import('./$types').LayoutLoad} */
export function load({ url }) {
  let currentToken = null;
  if (browser) {
    currentToken = get(token);
  }
  
  console.log('Layout Load - Current URL:', url.pathname);
  console.log('Layout Load - Token exists:', !!currentToken);
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup'];
  const isPublicRoute = publicRoutes.includes(url.pathname);
  console.log('Layout Load - Is Public Route:', isPublicRoute);
  
  // We return the token and let the svelte component handle redirection reactively
  return {
    token: currentToken,
    isPublicRoute
  };
}
