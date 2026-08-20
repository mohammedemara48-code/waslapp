import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { dictionaries, LOCALES, type Dict, type Locale } from "./dictionaries";

const STORAGE_KEY = "wasl.locale";

function readStored(): Locale {
  if (typeof window === "undefined") return "ar";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "ar" || v === "en" || v === "ur") return v;
  } catch {
    /* ignore */
  }
  return "ar";
}

function applyDocument(locale: Locale) {
  if (typeof document === "undefined") return;
  const meta = LOCALES.find((l) => l.id === locale) ?? LOCALES[0]!;
  document.documentElement.lang = locale === "ur" ? "ur" : locale;
  document.documentElement.dir = meta.dir;
  document.documentElement.dataset.locale = locale;
}

type I18nValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: Dict;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStored());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyDocument(next);
  }, []);

  useEffect(() => {
    applyDocument(locale);
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const meta = LOCALES.find((l) => l.id === locale) ?? LOCALES[0]!;
    return { locale, dir: meta.dir, t: dictionaries[locale], setLocale };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return { locale: "ar", dir: "rtl", t: dictionaries.ar, setLocale: () => {} };
  }
  return ctx;
}

export { LOCALES, dictionaries };
export type { Locale, Dict };
