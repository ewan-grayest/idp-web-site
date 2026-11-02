import type { Locale } from '../locales'
import en from './en'
import ru, { type Dictionary } from './ru'
import zh from './zh'

/** All dictionaries are small, so they are bundled together; client components pick theirs from context. */
export const dictionaries: Record<Locale, Dictionary> = { ru, en, zh }

export type { Dictionary }
