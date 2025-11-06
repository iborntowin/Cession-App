import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Handle Chrome DevTools requests
  if (event.url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
    return new Response(JSON.stringify({
      "version": "1.0",
      "manifest": {
        "name": "Cession Management App",
        "short_name": "Cession App",
        "description": "Salary cession management application",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#000000"
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // Get language from cookie or default to 'en'
  const lang = event.cookies.get('lang') || 'en';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  // Replace %lang% and %dir% placeholders in app.html
  return await resolve(event, {
    transformPageChunk: ({ html }) => {
      return html
        .replace('%lang%', lang)
        .replace('%dir%', dir);
    }
  });
};