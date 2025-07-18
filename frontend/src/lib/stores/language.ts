import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { setLanguage as setI18nLanguage, currentLanguage as i18nCurrentLanguage } from '../i18n';

type Language = {
  code: string;
  name: string;
  isRTL: boolean;
};

const languageList: Language[] = [
  { code: 'en', name: 'English', isRTL: false },
  { code: 'fr', name: 'Français', isRTL: false },
  { code: 'ar', name: 'العربية', isRTL: true }
];

function createLanguageStore() {
  const defaultLanguage = languageList[0];
  let initialLanguage = defaultLanguage;

  // Check localStorage and browser language on client side
  if (browser) {
    const storedLang = localStorage.getItem('language');
    if (storedLang) {
      initialLanguage = languageList.find(lang => lang.code === storedLang) || defaultLanguage;
    } else {
      const browserLang = navigator.language.split('-')[0];
      initialLanguage = languageList.find(lang => lang.code === browserLang) || defaultLanguage;
    }
    
    // Set initial document direction and language
    document.documentElement.dir = initialLanguage.isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = initialLanguage.code;
    
    // Initialize i18n language
    setI18nLanguage(initialLanguage.code);
  }

  const { subscribe, set } = writable<Language>(initialLanguage);

  // Subscribe to i18n language changes
  if (browser) {
    i18nCurrentLanguage.subscribe(langCode => {
      const newLang = languageList.find(lang => lang.code === langCode) || defaultLanguage;
      if (newLang.code !== initialLanguage.code) {
        set(newLang);
        document.documentElement.dir = newLang.isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = newLang.code;
      }
    });
  }

  return {
    subscribe,
    setLanguage: (langCode: string) => {
      const newLang = languageList.find(lang => lang.code === langCode) || defaultLanguage;
      setI18nLanguage(newLang.code);
      
      // Store in localStorage
      if (browser) {
        localStorage.setItem('language', newLang.code);
      }
    },
    getLanguages: () => languageList
  };
}

export const language = createLanguageStore();