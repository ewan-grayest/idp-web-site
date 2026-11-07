import { createHash } from 'crypto'
import type { PayloadRequest } from 'payload'

import { dictionaries } from '../i18n/dictionaries'
import { defaultLocale, isLocale, type Locale } from '../i18n/locales'
import { LEGAL_SLUGS } from './privacy'

/**
 * Proof of consent (152-ФЗ, ч. 3 ст. 9: the operator proves that consent was given).
 * Every tick of a consent box and every cookie choice is written to «Журнал согласий» (collection `consents`)
 * with the time, IP address, browser, page, the exact wording shown and the version of each linked document.
 * Records can't be edited, and can't be deleted until they are older than the retention period.
 */
export const CONSENT_RETENTION_DAYS = 366

const LEGAL_DOCS = LEGAL_SLUGS

export type ConsentPurpose = 'personal-data' | 'publication' | 'cookies'
export type ConsentDecision = 'agree' | 'necessary-only'
export type ConsentSource = 'lead' | 'review' | 'cookie-banner'

/** The wording the visitor saw next to the box or in the banner, in their site language. */
export function consentWording(purpose: ConsentPurpose, decision: ConsentDecision, locale: Locale): string {
  const t = dictionaries[locale]
  if (purpose === 'personal-data') return t.header.consent
  if (purpose === 'publication') return t.privacy.publication
  const button = decision === 'agree' ? t.privacy.cookies.all : t.privacy.cookies.necessary
  return `${t.privacy.cookies.text} → «${button}»`
}

export const docsFor = (purpose: ConsentPurpose): string[] =>
  purpose === 'publication' ? [LEGAL_DOCS.publication, LEGAL_DOCS.policy] : purpose === 'cookies' ? [LEGAL_DOCS.policy] : [LEGAL_DOCS.consent, LEGAL_DOCS.policy]

export const toLocale = (value: unknown): Locale => (typeof value === 'string' && isLocale(value) ? value : defaultLocale)

/** The visitor's address as the reverse proxy saw it (Caddy sets X-Forwarded-For; see deploy/Caddyfile). */
export function clientIp(headers: Headers | undefined): string {
  const forwarded = headers?.get('x-forwarded-for')?.split(',')[0]?.trim()
  return (forwarded || headers?.get('x-real-ip')?.trim() || 'unknown').slice(0, 64)
}

export type DocVersion = { slug: string; id?: number | string; title?: string; updatedAt?: string; sha256?: string; missing?: true }

/** Which version of each document the visitor was shown: its last change and a fingerprint of its text. */
export async function documentVersions(req: PayloadRequest, slugs: string[], locale: Locale): Promise<DocVersion[]> {
  const found = await req.payload.find({
    collection: 'legal',
    where: { slug: { in: slugs } },
    depth: 0,
    limit: slugs.length,
    locale,
    overrideAccess: true,
    req,
  })
  return slugs.map((slug) => {
    const doc = found.docs.find((d) => d.slug === slug)
    if (!doc) return { slug, missing: true }
    const sha256 = createHash('sha256').update(JSON.stringify({ title: doc.title, text: doc.text ?? null })).digest('hex')
    return { slug, id: doc.id, title: doc.title ?? undefined, updatedAt: doc.updatedAt, sha256 }
  })
}

type Entry = {
  purpose: Exclude<ConsentPurpose, 'cookies'>
  source: Exclude<ConsentSource, 'cookie-banner'>
  sourceId: string | number
  subject: string
  originUrl?: string | null
  locale?: string | null
}

/**
 * Writes a consent record from a lead or review hook, in the same transaction:
 * if the record can't be written, the lead or review isn't saved either.
 */
export async function logConsent(req: PayloadRequest, entry: Entry) {
  await req.payload.create({
    collection: 'consents',
    data: { ...entry, sourceId: String(entry.sourceId), decision: 'agree', originUrl: entry.originUrl ?? '', locale: toLocale(entry.locale) },
    overrideAccess: true,
    context: { consentFromServer: true },
    req,
  })
}
