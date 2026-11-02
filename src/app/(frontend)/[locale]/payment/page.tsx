import type { Metadata } from 'next'

import { TextPage } from '@/components/pages/TextPage'
import { getT } from '@/i18n/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).pages[12] }
}

/** Page 12 · Payment options: the text from «Тексты страниц» → «Оплата 12». */
export default function PaymentPage() {
  return <TextPage page={12} text="payment" />
}
