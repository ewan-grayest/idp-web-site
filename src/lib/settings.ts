import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { resolveLimits } from './limits'

export const getSettings = cache(async () => {
  const payload = await getPayload({ config })
  const s = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  return { ...s, limits: resolveLimits(s.limits), mapProvider: 'yandex' as const } // 152-ФЗ: Google Maps is no longer offered (see SiteSettings)
})
