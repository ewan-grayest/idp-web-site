import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { CollectionPage, collectionMetadata } from '@/components/collection/CollectionPage'
import { localePath } from '@/i18n/locales'
import { getLocale } from '@/i18n/server'
import { kindAtProjects, movedKinds, pages, projectKinds } from '@/lib/routes'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ kind: string }>; searchParams: Promise<{ tags?: string | string[] }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const kind = kindAtProjects((await params).kind)
  return kind ? collectionMetadata(kind) : {}
}

/** Pages 7 and 9. /projects/archive moved to ID Lab with its projects, which are product design now (Ewan, 2026-11-05). */
export default async function ProjectsCollection({ params, searchParams }: Props) {
  const segment = (await params).kind
  const moved = movedKinds[segment]
  if (moved) permanentRedirect(localePath(await getLocale(), pages[projectKinds[moved].collection].path))
  const kind = kindAtProjects(segment)
  if (!kind) notFound()
  return <CollectionPage kind={kind} tags={(await searchParams).tags} />
}
