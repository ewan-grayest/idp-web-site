/**
 * Enquiry (lead) helpers for header control 0.1.7–0.1.10 and entity CTAs.
 * Consent box is unticked by default and remembered once ticked
 * (confirmed decision, overrides spec 0.1.9).
 */

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

export function readConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === '1'
  } catch {
    return false
  }
}

/** A tick is remembered for next time; unticking forgets it. */
export function rememberConsent(on: boolean): void {
  try {
    if (on) localStorage.setItem(CONSENT_KEY, '1')
    else localStorage.removeItem(CONSENT_KEY)
  } catch {
    /* private mode: nothing to remember */
  }
}
