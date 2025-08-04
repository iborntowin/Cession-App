import { browser } from '$app/environment';
import { writable, derived, get } from 'svelte/store';

// Available languages
export const languages = {
  en: { name: 'English', isRTL: false },
  fr: { name: 'Français', isRTL: false },
  ar: { name: 'العربية', isRTL: true }
};

// Default language
export const defaultLanguage = 'en';

// Load translations
import en from './en.json';
import fr from './fr.json';
import ar from './ar.json';

const translations = {
  en,
  fr,
  ar
};

// Create a writable store for the current language
export const currentLanguage = writable(browser ? localStorage.getItem('language') || defaultLanguage : defaultLanguage);

function handlePluralization(key: string, params: any, lang: string): string {
  const value = key.split('.').reduce((obj, k) => obj?.[k], translations[lang]);
  if (!value) return key;

  if (typeof value === 'string' && value.includes('plural')) {
    const count = params?.count || 0;
    const pluralForms = value.match(/{([^}]+)}/g)?.map(form => {
      const [condition, text] = form.slice(1, -1).split('=');
      return { condition, text };
    });

    if (pluralForms) {
      for (const { condition, text } of pluralForms) {
        if (condition === 'one' && count === 1) return text;
        if (condition === 'other' && count !== 1) return text;
      }
    }
  }

  return value;
}

// Create a derived store for translations
export const t = derived(currentLanguage, ($currentLanguage) => {
  return (key: string, params?: any, fallback?: string) => {
    const value = key.split('.').reduce((obj, k) => obj?.[k], translations[$currentLanguage]);
    
    if (!value) {
      console.warn(`Translation key not found: ${key}`);
      return fallback || key;
    }

    if (typeof value === 'string') {
      let result = value;
      
      // Handle parameter interpolation
      if (params && typeof params === 'object') {
        Object.keys(params).forEach(param => {
          if (param && param.length > 0) {
            try {
              const regex = new RegExp(`{${param}}`, 'g');
              result = result.replace(regex, params[param]);
            } catch (e) {
              console.warn(`Invalid regex parameter: ${param}`, e);
            }
          }
        });
      }
      
      // Handle pluralization
      if (value.includes('plural')) {
        result = handlePluralization(key, params || {}, $currentLanguage);
      }
      
      return result;
    }
    return value;
  };
});

// Initialize language from localStorage on the client side
if (browser) {
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage && savedLanguage in languages) {
    currentLanguage.set(savedLanguage);
    document.documentElement.lang = savedLanguage;
    document.documentElement.dir = languages[savedLanguage].isRTL ? 'rtl' : 'ltr';
  } else {
    currentLanguage.set(defaultLanguage);
    document.documentElement.lang = defaultLanguage;
    document.documentElement.dir = languages[defaultLanguage].isRTL ? 'rtl' : 'ltr';
  }
}

// Function to set the language
export function setLanguage(lang: string) {
  if (lang in languages) {
    currentLanguage.set(lang);
    if (browser) {
      localStorage.setItem('language', lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = languages[lang].isRTL ? 'rtl' : 'ltr';
  }
  }
}