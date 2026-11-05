import type { Metadata } from 'next'

import { EntriesPage } from '@/components/pages/EntriesPage'
import styles from '@/components/pages/Pages.module.css'
import { getT } from '@/i18n/server'
import { getCompany } from '@/lib/pages'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).pages[14] }
}

/**
 * Page 14 · Legal: the company details first (/legal#details, from Студия → Реквизиты 14), then the documents
 * from «Юридические документы»: user agreement, personal data consent (/legal#personal-data, linked from the
 * enquiry consent 0.1.10), privacy policy, copyright (/legal#copyright, footer).
 */
export default async function LegalPage() {
  const [c, t] = await Promise.all([getCompany(), getT()])
  const rows = [
    [t.legal.name, c.company],
    [t.legal.inn, c.inn],
    [t.legal.kpp, c.kpp],
    [t.legal.ogrn, c.ogrn],
    [t.legal.address, c.legalAddress],
    [t.legal.bank, c.bank],
  ].filter(([, v]) => v.trim() !== '')
  const body = rows.length ? (
    <dl className={styles.details}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  ) : (
    <p className={styles.note}>{t.legal.detailsEmpty}</p>
  )
  return <EntriesPage collection="legal" page={14} first={{ head: { slug: 'details', when: '', title: t.legal.details, images: [] }, body }} />
}
