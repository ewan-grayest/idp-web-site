import { LinkJSXConverter, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import Image from 'next/image'

import { Link } from '@/i18n/Link'
import { coverOf, mediaUrl } from '@/lib/projects'
import { pages, personPath, projectPath, type ProjectKind } from '@/lib/routes'
import styles from './Prose.module.css'

type Doc = { id?: number; slug?: string; kind?: ProjectKind; title?: string | null; name?: string | null; url?: string | null; link?: string | null }

/** Where a document picked in the admin («Связь» in the text, or an internal link) opens on the site. */
function docHref(relationTo: string, d: Doc): string | undefined {
  if (relationTo === 'projects' && d.kind && d.slug) return projectPath(d.kind, d.slug)
  if (relationTo === 'people' && d.slug) return personPath(d.slug)
  if (relationTo === 'partners' && d.slug) return `${pages[6].path}#${d.slug}`
  if (relationTo === 'lifestyle' && d.slug) return `${pages[11].path}#${d.slug}`
  if (relationTo === 'careers' && d.slug) return `${pages[13].path}#${d.slug}`
  if (relationTo === 'legal' && d.slug) return `${pages[14].path}#${d.slug}`
  if (relationTo === 'press') return d.url || pages[10].path
  if (relationTo === 'issues') return d.link || `${pages[3].path}#journal`
  if (relationTo === 'media') return d.url || undefined
  return undefined
}

const isDoc = (v: unknown): v is Doc => typeof v === 'object' && v !== null

/**
 * Lexical renders only its own nodes; a «Связь» (relationship) block showed «unknown node» on the site
 * (Ewan, 2026-10-26). It now shows as a card: a project with its cover, anything else as a titled link.
 */
export const richConverters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkJSXConverter({
    internalDocToHref: ({ linkNode }) => {
      const doc = linkNode.fields.doc
      return (doc && isDoc(doc.value) && docHref(doc.relationTo, doc.value)) || '#'
    },
  }),
  relationship: ({ node }) => {
    const { relationTo, value } = node as unknown as { relationTo: string; value: unknown }
    // Not loaded (deleted, or the text was read without its links): nothing rather than a broken card
    if (!isDoc(value)) return null
    const href = docHref(relationTo, value)
    const title = value.title || value.name || ''
    const image = relationTo === 'projects' ? mediaUrl(coverOf(value as never), 'thumb') : undefined
    const body = (
      <>
        {image && (
          <span className={styles.relPhoto}>
            <Image src={image} alt="" fill sizes="160px" />
          </span>
        )}
        <span className={styles.relTitle}>{title}</span>
        {href && <span aria-hidden>→</span>}
      </>
    )
    if (!href) return <span className={styles.rel}>{body}</span>
    return /^https?:/.test(href) ? (
      <a href={href} target="_blank" rel="noopener" className={styles.rel}>
        {body}
      </a>
    ) : (
      <Link href={href} className={styles.rel}>
        {body}
      </Link>
    )
  },
})
