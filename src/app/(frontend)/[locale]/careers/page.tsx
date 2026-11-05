import type { Metadata } from 'next'

import { EntriesPage } from '@/components/pages/EntriesPage'
import { getT } from '@/i18n/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).pages[13] }
}

/** Page 13 · Work with us: vacancies from the admin section «Работайте с нами». */
export default function CareersPage() {
  return <EntriesPage collection="careers" page={13} />
}
