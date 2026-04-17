/**
 * i18n configuration file
 * Sets up internationalization with react-i18next
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationEN from '../locales/en/translation.json';
import translationHE from '../locales/he/translation.json';
import translationES from '../locales/es/translation.json';

const SUPPORTED_LANGUAGES = ['en', 'he', 'es'];

function normalizeLanguage(language) {
  if (!language || typeof language !== 'string') return 'en';
  const lower = language.toLowerCase();
  if (lower.startsWith('he')) return 'he';
  if (lower.startsWith('es')) return 'es';
  return 'en';
}

// Prefer saved language, then browser language, then fallback to English.
const savedLanguage = localStorage.getItem('i18nextLng');
const browserLanguage = typeof navigator !== 'undefined' ? navigator.language : '';
const normalizedLanguage = normalizeLanguage(savedLanguage || browserLanguage);
const defaultLanguage = SUPPORTED_LANGUAGES.includes(normalizedLanguage) ? normalizedLanguage : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: translationEN
      },
      he: {
        translation: translationHE
      },
      es: {
        translation: translationES
      }
    },
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false
    }
  });

// Update HTML dir attribute based on language
function updateDocumentDirection(language) {
  document.documentElement.setAttribute('dir', language === 'he' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', language);
}

// Set initial direction
updateDocumentDirection(defaultLanguage);

// Listen for language changes
i18n.on('languageChanged', function(lng) {
  updateDocumentDirection(lng);
  localStorage.setItem('i18nextLng', lng);
});

export default i18n;


