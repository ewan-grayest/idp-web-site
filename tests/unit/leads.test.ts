import { describe, expect, it, vi } from 'vitest'

import { checkLead, sendLead } from '@/lib/leads'

describe('enquiry 0.1.7–0.1.10', () => {
  it('needs a valid e-mail and consent', () => {
    expect(checkLead({ email: 'nope', consent: true })).toBe('email')
    expect(checkLead({ email: 'a@b.ru', consent: false })).toBe('consent')
    expect(checkLead({ email: ' a@b.ru ', consent: true })).toBeNull()
  })

  it('posts to the versioned API with origin and context', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true })
    const ok = await sendLead(
      { email: ' a@b.ru ', consent: true, originUrl: 'https://x/studio', context: 'Заказать звонок · Наша команда' },
      fetchImpl as unknown as typeof fetch,
    )
    expect(ok).toBe(true)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('/api/v1/leads')
    expect(JSON.parse(init.body)).toMatchObject({ email: 'a@b.ru', consent: true, originUrl: 'https://x/studio' })
  })
})
