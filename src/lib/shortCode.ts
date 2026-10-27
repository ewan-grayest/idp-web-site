// No look-alike characters (0/O, 1/l/I), so a short link can be read aloud or retyped
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function makeShortCode(length = 5): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

/** 5.7.4: short permalink served by /p/[code]. */
export const shortPath = (code: string) => `/p/${code}`
