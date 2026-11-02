import type { Validate } from 'payload'

import { defaultLocale } from '../i18n/locales'

/**
 * For a translatable field that must not be empty: required in Russian only.
 * Other languages may stay empty while a translation is in progress (the site shows the Russian text),
 * so an editor can translate one field without filling in every other one first.
 */
export const requiredInRussian = {
  localized: true,
  validate: ((value, { req }) =>
    req.locale !== defaultLocale || (typeof value === 'string' && value.trim() !== '') || req.t('validation:required')) as Validate<string>,
} as const
