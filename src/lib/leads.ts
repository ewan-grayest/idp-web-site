/**
 * Enquiry (lead) helpers for header control 0.1.7–0.1.10 and entity CTAs.
 * The consent box is unticked every time: a box ticked in advance or remembered from an earlier visit
 * is not valid consent under 152-ФЗ (it replaces the earlier "remembered once ticked" decision on 0.1.9).
 * The server writes each consent to «Журнал согласий» (src/collections/Consents.ts).
 */

/** Where the old "remembered" tick lived; kept only to remove it */
export const CONSENT_KEY = 'idp.consent'

export type LeadEntity = { type: 'page' | 'project' | 'person' | 'partner'; ref?: string }

export type LeadInput = {
  email: string
  consent: boolean
  originUrl: string
  context?: string
  entity?: LeadEntity
  /** Site language the visitor wrote from, so the studio can answer in it */
  locale?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type LeadProblem = 'email' | 'consent' | null

export function checkLead(input: Pick<LeadInput, 'email' | 'consent'>): LeadProblem {
  if (!EMAIL_RE.test(input.email.trim())) return 'email'
  if (!input.consent) return 'consent'
  return null
}

export async function sendLead(input: LeadInput, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const res = await fetchImpl('/api/v1/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, email: input.email.trim() }),
  })
  return res.ok
}

/** Browsers that kept the tick from the old "remembered" box forget it. */
export function forgetRememberedConsent(): void {
  try {
    localStorage.removeItem(CONSENT_KEY)
  } catch {
    /* storage disabled */
  }
}
