import type { Metadata } from 'next'

import { EntriesPage } from '@/components/pages/EntriesPage'
import { getT } from '@/i18n/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).pages[11] }
}

/** Page 11 · Lifestyle with ID project: entries from the admin section «Стиль жизни». */
export default function LifestylePage() {
  return <EntriesPage collection="lifestyle" page={11} />
}
