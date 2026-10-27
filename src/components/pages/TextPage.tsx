import base from '@/components/project/Project.module.css'
import { BackButton } from '@/components/shared/BackButton'
import { Prose } from '@/components/shared/Prose'
import { getT } from '@/i18n/server'
import { getPageText } from '@/lib/pages'
import styles from './Pages.module.css'

/** Pages 12 and 15 (spec slide 6): a text x.1 and «Вернуться» x.2, back to the previous page. */
export async function TextPage({ page, text }: { page: 12 | 15; text: 'payment' | 'media' }) {
  const [data, t] = await Promise.all([getPageText(text), getT()])
  return (
    <article className={base.page} data-spec={String(page)}>
      <section className={`${base.sec} ${base.pad}`} data-header-title={t.pages[page]}>
        <div className={styles.head}>
          <h1>{t.pages[page]}</h1>
        </div>
        <div data-spec={`${page}.1`}>
          <Prose data={data} empty={t.textEmpty(t.textTabs[text])} />
        </div>
        <div>
          <BackButton spec={`${page}.2`} />
        </div>
      </section>
    </article>
  )
}
