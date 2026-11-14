import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import en from './i18n/en.json';
import te from './i18n/te.json';
import hi from './i18n/hi.json';

export const TRANSLATIONS = { en, te, hi };

const I18nContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem('whyline_lang');
      return saved && TRANSLATIONS[saved] ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((newLang) => {
    if (!TRANSLATIONS[newLang]) return;
    setLangState((prev) => {
      if (prev === newLang) return prev;
      try {
        localStorage.setItem('whyline_lang', newLang);
      } catch {
        // ignore storage errors
      }
      document.documentElement.lang = newLang;
      window.dispatchEvent(new CustomEvent('whyline-lang-changed', { detail: { lang: newLang, prev } }));
      return newLang;
    });
  }, []);

  const t = useCallback(
    (key, vars) => {
      const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
      let val = dict[key];
      if (val === undefined) {
        if (import.meta.env?.DEV) {
          console.warn(`[i18n] Missing "${lang}" translation for key: "${key}"`);
        }
        val = TRANSLATIONS.en[key] ?? key;
      }
      if (vars && typeof val === 'string') {
        for (const [k, v] of Object.entries(vars)) {
          val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return val;
    },
    [lang]
  );

  return React.createElement(
    I18nContext.Provider,
    { value: { lang, setLang, t } },
    children
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
