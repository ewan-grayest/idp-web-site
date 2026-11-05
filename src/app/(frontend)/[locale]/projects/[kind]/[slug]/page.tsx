import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { ProjectPage, projectMetadata } from '@/components/project/ProjectPage'
import { localePath } from '@/i18n/locales'
import { getLocale } from '@/i18n/server'
import { kindAtProjects, movedKinds, projectPath } from '@/lib/routes'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ kind: string; slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { kind, slug } = await params
  const known = kindAtProjects(kind)
  return known ? projectMetadata(known, slug) : {}
}

/** Pages 5 and 8. An archive project's old address opens it under ID Lab (Ewan, 2026-11-05). */
export default async function ProjectsDetail({ params }: Params) {
  const { kind: segment, slug } = await params
  const moved = movedKinds[segment]
  if (moved) permanentRedirect(localePath(await getLocale(), projectPath(moved, slug)))
  const kind = kindAtProjects(segment)
  if (!kind) notFound()
  return <ProjectPage kind={kind} slug={slug} />
}
