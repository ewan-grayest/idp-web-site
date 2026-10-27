import { RichText } from '@payloadcms/richtext-lexical/react'

import { hasText, type Rich } from '@/lib/rich'
import styles from './Prose.module.css'
import { richConverters } from './richConverters'

/** Formatted text written in the admin (headings, lists, links, linked documents); `empty` shows while nothing is written yet. */
export function Prose({ data, empty, className }: { data: Rich; empty?: string; className?: string }) {
  if (!hasText(data)) return empty ? <p className={styles.empty}>{empty}</p> : null
  return <RichText data={data} converters={richConverters} className={`${styles.prose} ${className ?? ''}`} />
}
