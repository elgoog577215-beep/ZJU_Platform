import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'zh',
    supportedLngs: ['zh', 'en'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    debug: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },
    detection: {
      order: ['localStorage', 'htmlTag', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    }
  });

export default i18n;
