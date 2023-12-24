import i18n from 'i18next';
import enTranslation from './en/translation.json';
import deTranslation from './de/translation.json';
import { initReactI18next } from 'react-i18next';

export const resources = {
  en: {
    translation: enTranslation
  },
  de: {
    translation: deTranslation
  },
} as const

  
i18n.use(initReactI18next).init({
  lng: 'en',
  // debug: process.env.NODE_ENV === 'development' ? true : false,
  debug: false,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // not needed for react as it escapes by default
  },
  nsSeparator: false,
  keySeparator: false,
  resources,
})
