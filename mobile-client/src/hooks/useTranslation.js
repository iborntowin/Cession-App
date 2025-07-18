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
    return languageService.t(key, params);
  };

  const formatCurrency = (amount, currency = 'TND') => {
    return languageService.formatCurrency(amount, currency);
  };

  const formatDate = (date, options = {}) => {
    return languageService.formatDate(date, options);
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