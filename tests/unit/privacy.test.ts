// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Consents } from '@/collections/Consents'
import { Reviews } from '@/collections/Reviews'
import { clientIp, consentWording, docsFor } from '@/lib/consentLog'
import { CONSENT_KEY, forgetRememberedConsent } from '@/lib/leads'
import { COOKIE_CHOICE, LEGAL_LINKS, logCookieChoice, readCookieChoice, saveCookieChoice } from '@/lib/privacy'
import { footerColumns } from '@/lib/site'

afterEach(() => {
  document.cookie = `${COOKIE_CHOICE}=; path=/; max-age=0`
})

describe('152-ФЗ: consent boxes', () => {
  it('forgets a tick remembered by the old header box', () => {
    localStorage.setItem(CONSENT_KEY, '1')
    forgetRememberedConsent()
    expect(localStorage.getItem(CONSENT_KEY)).toBeNull()
  })

  it('logs the wording the visitor saw, in their language', () => {
    expect(consentWording('personal-data', 'agree', 'ru')).toBe('Даю согласие на обработку моих персональных данных')
    expect(consentWording('publication', 'agree', 'en')).toContain('published')
    expect(consentWording('cookies', 'necessary-only', 'ru')).toMatch(/«Только необходимые»$/)
  })

  it('records the documents linked from each consent', () => {
    expect(docsFor('personal-data')).toEqual(['personal-data', 'privacy'])
    expect(docsFor('publication')).toEqual(['publication-consent', 'privacy'])
    expect(docsFor('cookies')).toEqual(['privacy'])
  })

  it('takes the visitor address from the reverse proxy', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7')
    expect(clientIp(new Headers({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2')
    expect(clientIp(new Headers())).toBe('unknown')
  })

  it('keeps the consent log tamper-proof and staff-only', () => {
    const access = Consents.access!
    const staff = { req: { user: { id: 1 } } } as never
    const visitor = { req: { user: null } } as never
    expect(access.update!(staff)).toBe(false)
    expect(access.read!(visitor)).toBe(false)
    expect(access.create!(staff)).toBe(false)
    expect(access.delete!(visitor)).toBe(false)
    // Staff can delete only records older than a year
    const where = access.delete!(staff) as { createdAt: { less_than: string } }
    expect(Date.now() - new Date(where.createdAt.less_than).getTime()).toBeGreaterThan(365 * 86_400_000)
  })

  it('asks reviewers for a separate consent to publication', () => {
    expect(Reviews.fields.some((f) => 'name' in f && f.name === 'publicationConsent')).toBe(true)
  })

  it('links the personal data policy from the footer on every page', () => {
    expect(footerColumns.flatMap((c) => c.links.map((l) => l.href))).toContain(LEGAL_LINKS.policy)
  })
})

describe('152-ФЗ: cookie choice', () => {
  it('is unknown until the visitor chooses, then kept in a cookie', () => {
    expect(readCookieChoice()).toBeNull()
    const seen = vi.fn()
    window.addEventListener('idp:cookies', seen)
    saveCookieChoice('necessary')
    expect(readCookieChoice()).toBe('necessary')
    expect(seen).toHaveBeenCalledOnce()
  })

  it('is written to the consent log', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true })
    await logCookieChoice('all', 'ru', fetchImpl as unknown as typeof fetch)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('/api/v1/consents')
    expect(JSON.parse(init.body)).toMatchObject({ purpose: 'cookies', decision: 'agree', locale: 'ru' })
  })
})
