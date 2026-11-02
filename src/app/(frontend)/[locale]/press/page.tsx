import type { Metadata } from 'next'
import Image from 'next/image'

import base from '@/components/project/Project.module.css'
import styles from '@/components/pages/Pages.module.css'
import { getT } from '@/i18n/server'
import { getPress } from '@/lib/pages'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t.pages[10] }
}

/** Page 10 «О нас пишут»: a sideways slider of wide photos 10.2, newest on the left; a click opens the article. */
export default async function PressPage() {
  const [items, t] = await Promise.all([getPress(), getT()])
  return (
    <article className={base.page} data-spec="10">
      <section className={`${base.sec} ${base.pad}`} data-header-title={t.pages[10]}>
        <div className={styles.head}>
          <h1 data-spec="10.1">{t.pages[10]}</h1>
        </div>
        {items.length === 0 ? (
          <p className={styles.note}>{t.press.empty}</p>
        ) : (
          <ul className={styles.press} data-spec="10.2">
            {items.map((a) => {
              const face = (
                <>
                  {a.image ? <Image src={a.image} alt="" fill sizes="(max-width: 767px) 80vw, 640px" className={styles.cover} /> : <span className={styles.noPhoto} />}
                  <span className={styles.articleText}>
                    <span className={styles.articleSource} data-spec="10.4">
                      {a.source} · {a.when}
                    </span>
                    <span className={styles.articleTitle}>{a.title}</span>
                  </span>
                  {a.url && (
                    <span className={styles.articleBar} aria-hidden data-spec="10.3">
                      <span>{t.press.open}</span>
                      <span>↗</span>
                    </span>
                  )}
                </>
              )
              return (
                <li key={a.key}>
                  {a.url ? (
                    <a href={a.url} target="_blank" rel="noopener" className={styles.article} aria-label={`${a.title}, ${a.when}. ${t.press.read(a.source)}`}>
                      {face}
                    </a>
                  ) : (
                    <div className={styles.article}>{face}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </article>
  )
}
