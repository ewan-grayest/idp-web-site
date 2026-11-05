import type { Metadata } from 'next'

import { ProjectPage, projectMetadata } from '@/components/project/ProjectPage'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return projectMetadata('product', (await params).slug)
}

/** Page 16 · a product design project under ID Lab (Ewan, 2026-11-05), in the template of page 5. */
export default async function IdLabProject({ params }: Params) {
  return <ProjectPage kind="product" slug={(await params).slug} />
}
