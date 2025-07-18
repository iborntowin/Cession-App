import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';

// Available languages
export const languages = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية'
};

// Default language
export const defaultLanguage = 'en';

// Create a writable store for the current language
export const currentLanguage = writable(browser ? localStorage.getItem('language') || defaultLanguage : defaultLanguage);

// Translations object
const translations = {
  en: {
    'common.language.select': 'Select Language',
    'common.language.english': 'English',
    'common.language.french': 'French',
    'common.language.arabic': 'Arabic',
    // Add more English translations here
  },
  fr: {
    'common.language.select': 'Choisir la langue',
    'common.language.english': 'Anglais',
    'common.language.french': 'Français',
    'common.language.arabic': 'Arabe',
    // Add more French translations here
  },
  ar: {
    'common.language.select': 'اختر اللغة',
    'common.language.english': 'الإنجليزية',
    'common.language.french': 'الفرنسية',
    'common.language.arabic': 'العربية',
    // Add more Arabic translations here
  }
};

// Create a derived store for translations
export const t = derived(currentLanguage, ($currentLanguage) => {
  const translation = translations[$currentLanguage] || translations[defaultLanguage];
  return (key) => translation[key] || key;
});

// Function to load translations for a specific language
export function loadTranslations(lang) {
  return translations[lang] || translations[defaultLanguage];
}

// Function to change language
export function setLanguage(lang) {
  if (browser) {
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
  currentLanguage.set(lang);
} 