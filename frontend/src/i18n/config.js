/**
 * i18n configuration file
 * Sets up internationalization with react-i18next
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationEN from '../locales/en/translation.json';
import translationHE from '../locales/he/translation.json';
import translationES from '../locales/es/translation.json';

// Get saved language from localStorage or default to 'en'
const savedLanguage = localStorage.getItem('i18nextLng') || 'en';
const defaultLanguage = (savedLanguage === 'he' || savedLanguage === 'es') ? savedLanguage : 'en';

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


