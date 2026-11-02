import { notFound } from 'next/navigation'
import { locale as rootLocale } from 'next/root-params'

import { dictionaries } from './dictionaries'
import { isLocale, type Locale } from './locales'

/** The page's language, from the [locale] segment above the root layout. Server components only. */
export async function getLocale(): Promise<Locale> {
  const value = await rootLocale()
  if (!isLocale(value)) notFound()
  return value
}

/** The page's dictionary. Server components only; client components use useI18n(). */
export async function getT() {
  return dictionaries[await getLocale()]
}
