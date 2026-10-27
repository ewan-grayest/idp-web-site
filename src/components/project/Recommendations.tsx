import Image from 'next/image'

import { Link } from '@/i18n/Link'
import { getT } from '@/i18n/server'
import type { Recommendation } from '@/lib/projects'
import styles from './Project.module.css'

/** 5.11 "More design and interiors": next stage 5.11.2, similar 5.11.3, other kind 5.11.4. */
export async function Recommendations({ items }: { items: Recommendation[] }) {
  const t = await getT()
  return (
    <section className={`${styles.sec} ${styles.pad}`} data-header-title={t.project.moreTitle} data-spec="5.11">
      <h2 className={styles.h2} data-spec="5.11.1">
        {t.project.moreHeading}
      </h2>
      <div className={styles.recs}>
        {items.map((r) => (
          <Link key={r.key} href={r.href} className={styles.card} data-spec={r.spec}>
            {r.image && <Image src={r.image} alt="" fill sizes="(max-width: 767px) 80vw, 30vw" className={styles.cover} />}
            <span className={styles.cardBadge}>{r.badge}</span>
            <span className={styles.cardOverlay}>{r.title}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
