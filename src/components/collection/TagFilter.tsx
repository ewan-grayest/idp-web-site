'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import action from '@/components/shared/TextAction.module.css'
import { useI18n } from '@/i18n/client'
import styles from './Collection.module.css'

type Tag = { slug: string; title: string }

/**
 * 7.1.2 tag buttons and 7.1.3 «Выбрать». A click picks a tag (green), a double click (or a second click,
 * for keyboards) puts it back; at most `max`. «Выбрать» reloads the grid 7.2 with ?tags=a,b,
 * so a filtered list can be bookmarked and shared, and tag links from project pages (5.3.1) land here.
 */
export function TagFilter({ tags, initial, path, max, labelledBy }: { tags: Tag[]; initial: string[]; path: string; max: number; labelledBy: string }) {
  const { t, href } = useI18n()
  const router = useRouter()
  const [picked, setPicked] = useState(initial)
  const [pending, startTransition] = useTransition()
  const full = picked.length >= max

  const toggle = (slug: string) =>
    setPicked((now) => (now.includes(slug) ? now.filter((s) => s !== slug) : now.length < max ? [...now, slug] : now))
  const unpick = (slug: string) => setPicked((now) => now.filter((s) => s !== slug))

  const show = (next: string[]) =>
    startTransition(() => {
      router.push(href(next.length ? `${path}?tags=${next.map(encodeURIComponent).join(',')}` : path), { scroll: false })
    })

  function reset() {
    setPicked([])
    if (initial.length) show([])
  }

  return (
    <>
      <div className={styles.chips} role="group" aria-labelledby={labelledBy}>
        {tags.map(({ slug, title }) => {
          const on = picked.includes(slug)
          return (
            <button
              key={slug}
              type="button"
              className={styles.chip}
              aria-pressed={on}
              aria-disabled={!on && full ? true : undefined}
              onClick={() => toggle(slug)}
              onDoubleClick={() => unpick(slug)}
              data-spec="7.1.2"
            >
              {title}
            </button>
          )
        })}
      </div>
      <p className={styles.hint}>{t.projects.tagHint(max)}</p>
      <div className={styles.actions}>
        <button type="button" className={action.action} onClick={() => show(picked)} aria-busy={pending || undefined} data-spec="7.1.3">
          {t.projects.apply}
        </button>
        {(picked.length > 0 || initial.length > 0) && (
          <button type="button" className={action.action} onClick={reset}>
            {t.projects.reset}
          </button>
        )}
        <span className={styles.count} aria-live="polite">
          {t.projects.picked(picked.length, max)}
        </span>
      </div>
    </>
  )
}
