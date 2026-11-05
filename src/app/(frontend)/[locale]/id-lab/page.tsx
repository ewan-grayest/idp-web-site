import type { Metadata } from 'next'

import { CollectionPage, collectionMetadata } from '@/components/collection/CollectionPage'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ tags?: string | string[] }> }

export const generateMetadata = (): Promise<Metadata> => collectionMetadata('product')

/** Page 17 · ID Lab: the studio's product design projects (Ewan, 2026-11-05), in the collection template of page 7. */
export default async function IdLab({ searchParams }: Props) {
  return <CollectionPage kind="product" tags={(await searchParams).tags} />
}
