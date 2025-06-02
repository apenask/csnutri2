import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Arquivos de tradução (exemplo)
import translationPT from './locales/pt/translation.json';
import translationEN from './locales/en/translation.json';

const resources = {
  pt: {
    translation: translationPT,
  },
  en: {
    translation: translationEN,
  },
};

i18n
  .use(LanguageDetector) // Detecta o idioma do navegador
  .use(initReactI18next) // Passa o i18n instance para react-i18next
  .init({
    resources,
    fallbackLng: 'pt', // Idioma padrão se a detecção falhar ou o idioma não existir
    debug: import.meta.env?.MODE === 'development', // Logs no console em desenvolvimento
    interpolation: {
      escapeValue: false, // React já protege contra XSS
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    }
  });

export default i18n;