import Image from 'next/image'
import { getSocialPosts, type FeedScope } from '@/lib/social'
import { getLocale, getT } from '@/i18n/server'
import styles from './Social.module.css'

/** Spec 3.8 / 4.5 / 5.12 / 6.7; limits and hashtag selection are enforced on the server. */
export async function SocialFeed({ scope, entity, hashtag, spec }: { scope: FeedScope; entity?: number; hashtag?: string | null; spec: string }) {
  const [items, locale, t] = await Promise.all([getSocialPosts(scope, entity, hashtag), getLocale(), getT()])
  if (!items.length) return null
  // Instagram belongs to Meta, banned in Russia as extremist: an asterisk and the note under the feed
  const title = { ru: 'В Instagram*', en: 'On Instagram*', zh: 'Instagram* 动态' }[locale]
  return <section className={styles.section} data-spec={spec} data-header-title={title}>
    <div className={styles.heading}><h2>{title}</h2><span>{scope === 'partners' ? 'Get-Together' : 'ID project'}</span></div>
    <ul className={styles.feed}>{items.map((item) => <li key={item.id}>
      <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.post}>
        <span className={styles.photo}>{item.image && <Image src={item.image} alt={item.caption} fill sizes="(max-width: 767px) 80vw, 33vw" style={{ objectFit: 'cover' }} />}</span>
        <span className={styles.caption}>{item.caption} ↗</span>
      </a>
    </li>)}</ul>
    <p className={styles.note}>{t.privacy.meta}</p>
  </section>
}
