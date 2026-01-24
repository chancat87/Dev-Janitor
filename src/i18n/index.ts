import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import zh from './zh.json';

// Get saved language or detect system language
const getSavedLanguage = (): string => {
  const saved = localStorage.getItem('dev-janitor-language');
  if (saved) return saved;
  
  const systemLang = navigator.language.toLowerCase();
  return systemLang.startsWith('zh') ? 'zh' : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export const changeLanguage = (lang: string) => {
  i18n.changeLanguage(lang);
  localStorage.setItem('dev-janitor-language', lang);
};

export default i18n;
