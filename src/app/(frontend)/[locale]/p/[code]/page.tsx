import { notFound, permanentRedirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { localePath } from '@/i18n/locales'
import { getLocale } from '@/i18n/server'
import { projectPath } from '@/lib/routes'
import { asVisitor } from '@/lib/published'

/** 5.7.4 short links: /p/<code> → the project's permanent address, in the link's language (/en/p/<code> → English). */
export default async function ShortLink({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    ...asVisitor,
    collection: 'projects',
    where: { shortCode: { equals: code } },
    limit: 1,
    depth: 0,
    select: { slug: true, kind: true },
  })
  const locale = await getLocale()
  if (docs[0]) permanentRedirect(localePath(locale, projectPath(docs[0].kind, docs[0].slug)))
  const entries = await payload.find({ collection: 'lifestyle', where: { shortCode: { equals: code } }, limit: 1, depth: 0, select: { slug: true } })
  if (!entries.docs[0]) notFound()
  permanentRedirect(`${localePath(locale, '/journal')}#${entries.docs[0].slug}`)
}
