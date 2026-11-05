import type { Metadata } from 'next'

import { TextPage } from '@/components/pages/TextPage'
import { getT } from '@/i18n/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).pages[15] }
}

/** Page 15 · Media and PR: the text from «Тексты страниц» → «СМИ и PR». */
export default function MediaPage() {
  return <TextPage page={15} text="media" />
}
