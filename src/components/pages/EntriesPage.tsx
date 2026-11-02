import base from '@/components/project/Project.module.css'
import { Share } from '@/components/project/Share'
import { Prose } from '@/components/shared/Prose'
import { localePath } from '@/i18n/locales'
import { getLocale, getT } from '@/i18n/server'
import { getEntries } from '@/lib/pages'
import { pages } from '@/lib/routes'
import { Entries, type EntryHead } from './Entries'
import styles from './Pages.module.css'

type Props = {
  collection: 'lifestyle' | 'careers' | 'legal'
  page: 11 | 13 | 14
  /** Shown above the admin's entries, e.g. the company details on page 14 */
  first?: { head: EntryHead; body: React.ReactNode }
}

/** Pages 11, 13 and 14: one layout, different entries (spec slide 3); only page 11 has «Поделись с друзьями» 11.2. */
export async function EntriesPage({ collection, page, first }: Props) {
  const [entries, t, locale] = await Promise.all([getEntries(collection), getT(), getLocale()])
  const heads: EntryHead[] = [...(first ? [first.head] : []), ...entries]
  const bodies = [...(first ? [first.body] : []), ...entries.map((e) => <Prose key={e.slug} data={e.text} empty={t.entries.noText} />)]
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  return (
    <article className={base.page} data-spec={String(page)}>
      <section className={`${base.sec} ${base.pad}`} data-header-title={t.pages[page]}>
        <div className={styles.head}>
          <h1 data-spec={`${page}.1`}>{t.pages[page]}</h1>
        </div>
        {heads.length === 0 ? (
          <p className={styles.note}>{t.entries.empty(t.entries.sections[collection])}</p>
        ) : (
          <Entries items={heads} bodies={bodies} spec={`${page}.1`} />
        )}
      </section>
      {page === 11 && (
        <section className={`${base.sec} ${base.pad}`} data-spec="11.2">
          <Share title={t.pages[11]} spec="11.2" url={site + localePath(locale, pages[11].path)} entries={entries.map((e) => ({ slug: e.slug, title: e.title, shortUrl: e.shortCode ? site + localePath(locale, `/p/${e.shortCode}`) : undefined }))} />
        </section>
      )}
    </article>
  )
}
