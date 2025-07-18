import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

// Translation files
import en from '../translations/en.json';
import fr from '../translations/fr.json';
import ar from '../translations/ar.json';

const LANGUAGE_KEY = 'app_language';
const DEFAULT_LANGUAGE = 'en';

class LanguageService {
  constructor() {
    this.currentLanguage = DEFAULT_LANGUAGE;
    this.translations = {
      en,
      fr,
      ar
    };
    this.listeners = [];
    this.isRTL = false;
  }

  /**
   * Initialize language service
   */
  async initialize() {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage && this.translations[savedLanguage]) {
        await this.setLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Failed to initialize language service:', error);
    }
  }

  /**
   * Get current language
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Get available languages
   */
  getAvailableLanguages() {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
    ];
  }

  /**
   * Set language
   */
  async setLanguage(languageCode) {
    if (!this.translations[languageCode]) {
      throw new Error(`Language ${languageCode} not supported`);
    }

    const wasRTL = this.isRTL;
    this.currentLanguage = languageCode;
    this.isRTL = languageCode === 'ar';

    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
      
      // Update RTL layout for Arabic - only if RTL state changed
      if (wasRTL !== this.isRTL) {
        I18nManager.allowRTL(true); // Always allow RTL
        I18nManager.forceRTL(this.isRTL);
        
        // Note: App restart may be required for RTL changes to take full effect
        console.log(`RTL mode ${this.isRTL ? 'enabled' : 'disabled'} for language: ${languageCode}`);
      }
      
      // Notify listeners
      this.notifyListeners(languageCode);
      
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  }

  /**
   * Get translation for a key
   */
  t(key, params = {}) {
    const keys = key.split('.');
    let translation = this.translations[this.currentLanguage];

    for (const k of keys) {
      if (translation && typeof translation === 'object' && translation[k]) {
        translation = translation[k];
      } else {
        // Fallback to English if translation not found
        translation = this.translations[DEFAULT_LANGUAGE];
        for (const fallbackKey of keys) {
          if (translation && typeof translation === 'object' && translation[fallbackKey]) {
            translation = translation[fallbackKey];
          } else {
            return key; // Return key if no translation found
          }
        }
        break;
      }
    }

    if (typeof translation !== 'string') {
      return key;
    }

    // Replace parameters
    return this.replaceParams(translation, params);
  }

  /**
   * Replace parameters in translation string
   */
  replaceParams(text, params) {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  /**
   * Check if current language is RTL
   */
  isRTLLanguage() {
    return this.isRTL;
  }

  /**
   * Add language change listener
   */
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of language change
   */
  notifyListeners(language) {
    this.listeners.forEach(listener => {
      try {
        listener(language);
      } catch (error) {
        console.error('Error in language listener:', error);
      }
    });
  }

  /**
   * Format currency based on language
   */
  formatCurrency(amount, currency = 'TND') {
    const locale = this.getLocale();
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${amount.toFixed(2)} ${currency}`;
    }
  }

  /**
   * Format date based on language
   */
  formatDate(date, options = {}) {
    const locale = this.getLocale();
    try {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
      }).format(new Date(date));
    } catch (error) {
      // Fallback formatting
      return new Date(date).toLocaleDateString();
    }
  }

  /**
   * Get locale string for current language
   */
  getLocale() {
    switch (this.currentLanguage) {
      case 'ar':
        return 'ar-TN';
      case 'fr':
        return 'fr-TN';
      default:
        return 'en-US';
    }
  }

  /**
   * Get text direction for current language
   */
  getTextDirection() {
    return this.isRTL ? 'rtl' : 'ltr';
  }

  /**
   * Get text alignment for current language
   */
  getTextAlign() {
    return this.isRTL ? 'right' : 'left';
  }
}

export const languageService = new LanguageService();
export default languageService;