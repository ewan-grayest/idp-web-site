import { notFound, permanentRedirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { localePath } from '@/i18n/locales'
import { getLocale } from '@/i18n/server'
import { projectPath } from '@/lib/routes'

/** 5.7.4 short links: /p/<code> → the project's permanent address, in the link's language (/en/p/<code> → English). */
export default async function ShortLink({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'projects',
    where: { shortCode: { equals: code } },
    limit: 1,
    depth: 0,
    select: { slug: true, kind: true },
  })
  if (!docs[0]) notFound()
  permanentRedirect(localePath(await getLocale(), projectPath(docs[0].kind, docs[0].slug)))
}
