import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { resolveLimits } from './limits'

export const getSettings = cache(async () => {
  const payload = await getPayload({ config })
  const s = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  return { ...s, limits: resolveLimits(s.limits), mapProvider: s.mapProvider === 'google' ? 'google' as const : 'yandex' as const }
})
