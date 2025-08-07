import { useState, useEffect } from 'react';
import { languageService } from '../services/languageService';

export const useTranslation = () => {
  const [currentLanguage, setCurrentLanguage] = useState(languageService.getCurrentLanguage());

  useEffect(() => {
    // Initialize language service
    languageService.initialize();

    // Listen for language changes
    const unsubscribe = languageService.addListener((language) => {
      setCurrentLanguage(language);
    });

    return unsubscribe;
  }, []);

  const t = (key, params = {}) => {
    const translation = languageService.t(key, params);
    // Ensure we always return a string
    return typeof translation === 'string' ? translation : String(translation || key);
  };

  const formatCurrency = (amount, currency = 'TND') => {
    const formatted = languageService.formatCurrency(amount, currency);
    // Ensure we always return a string
    return typeof formatted === 'string' ? formatted : String(formatted || '0.00 ' + currency);
  };

  const formatDate = (date, options = {}) => {
    const formatted = languageService.formatDate(date, options);
    // Ensure we always return a string
    return typeof formatted === 'string' ? formatted : String(formatted || 'N/A');
  };

  const isRTL = () => {
    return languageService.isRTLLanguage();
  };

  const getTextAlign = () => {
    return languageService.getTextAlign();
  };

  const getTextDirection = () => {
    return languageService.getTextDirection();
  };

  return {
    t,
    formatCurrency,
    formatDate,
    isRTL,
    getTextAlign,
    getTextDirection,
    currentLanguage,
    setLanguage: languageService.setLanguage.bind(languageService),
    getAvailableLanguages: languageService.getAvailableLanguages.bind(languageService)
  };
};

export default useTranslation;