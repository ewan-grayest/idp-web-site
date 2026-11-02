'use client'

import { createContext, useContext, useMemo } from 'react'

import { dictionaries, type Dictionary } from './dictionaries'
import { defaultLocale, localePath, type Locale } from './locales'

type I18n = { locale: Locale; t: Dictionary; href: (path: string) => string }

const I18nContext = createContext<I18n | null>(null)

/** Set once in the root layout, so client components know the page's language. */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: dictionaries[locale], href: (path: string) => localePath(locale, path) }), [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/** Language, dictionary and a link helper that adds the language prefix ("/studio" → "/en/studio"). */
export function useI18n(): I18n {
  return useContext(I18nContext) ?? { locale: defaultLocale, t: dictionaries[defaultLocale], href: (p) => p }
}
