import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { localePath, locales } from '@/i18n/locales'
import { asVisitor } from '@/lib/published'
import { pages, personPath, projectPath } from '@/lib/routes'

export const dynamic = 'force-dynamic'

/**
 * All public page roles and entity permalinks; exclude admin, leads and short-link duplicates.
 * Read with the visitor's access, so a project with «Публиковать на сайте» off stays out (Ewan, 2026-11-05).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config })
  const [projects, people] = await Promise.all([
    payload.find({ ...asVisitor, collection: 'projects', depth: 0, pagination: false, select: { kind: true, slug: true, updatedAt: true } }),
    payload.find({ ...asVisitor, collection: 'people', depth: 0, pagination: false, select: { slug: true, updatedAt: true } }),
  ])
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const fixed = [...new Set(Object.values(pages).map((p) => p.path))].filter((path) => path !== '/team')
  return [...fixed.map((path) => ({ path, updated: undefined as string | undefined })), ...projects.docs.map((p) => ({ path: projectPath(p.kind, p.slug), updated: p.updatedAt })), ...people.docs.map((p) => ({ path: personPath(p.slug), updated: p.updatedAt }))].flatMap(({ path, updated }) =>
    locales.map((locale) => ({ url: origin + localePath(locale, path), lastModified: updated, alternates: { languages: Object.fromEntries(locales.map((l) => [l, origin + localePath(l, path)])) } })),
  )
}
