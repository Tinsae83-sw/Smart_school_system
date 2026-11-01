"use client";

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'am' : 'en');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      title={`Current language: ${language === 'en' ? 'English' : 'Amharic'}`}
    >
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[2rem]">
        {language === 'en' ? 'EN' : 'AM'}
      </span>
    </button>
  );
}
