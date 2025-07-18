import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
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