'use client'
/* The file name column of «Фото и видео», in place of Payload's: the thumbnail in the mode chosen above the list
   (square as before, or the file's own proportions) and a button that opens the file full screen (Ewan, 2026-11-20).
   It keeps Payload's behaviour: in the list it links to the file's page, in a file picker it picks the file. */
import { Link, useConfig, useListDrawerContext, useListQuery } from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'
import { formatAdminURL } from 'payload/shared'
import React, { useState } from 'react'

import { objectPosition } from '@/lib/crops'
import { isImage, isVideo, ratioOf, thumbOf, type MediaDoc } from './file'
import { MediaLightbox } from './MediaLightbox'
import styles from './Media.module.css'
import { useMediaTexts } from './texts'
import { useThumbMode } from './thumbMode'

export function MediaCell({ cellData, rowData, link, linkURL, collectionSlug }: DefaultCellComponentProps) {
  const t = useMediaTexts()
  const mode = useThumbMode()
  const { drawerSlug, onSelect } = useListDrawerContext()
  const { data } = useListQuery()
  const { config } = useConfig()
  const [open, setOpen] = useState(false)
  const doc = rowData as MediaDoc
  const name = String(cellData ?? doc.filename ?? '')

  const content = (
    <>
      <Thumb doc={doc} square={mode === 'square'} />
      <span className={styles.filename}>{name}</span>
    </>
  )
  let main: React.ReactNode
  if (link && drawerSlug && typeof onSelect === 'function') {
    // As Payload's own cell: the row's id as it is (a number here), whatever the type says
    main = (
      <button type="button" className={styles.cellMain} onClick={() => onSelect({ collectionSlug, doc: rowData, docID: doc.id as string })}>
        {content}
      </button>
    )
  } else if (link) {
    const href = linkURL ?? formatAdminURL({ adminRoute: config.routes.admin, path: `/collections/${collectionSlug}/${encodeURIComponent(String(doc.id))}` })
    main = (
      <Link href={href} prefetch={false} className={styles.cellMain}>
        {content}
      </Link>
    )
  } else {
    main = <span className={styles.cellMain}>{content}</span>
  }

  // Arrows in the viewer walk through this page of the list
  const docs = ((data?.docs ?? []) as MediaDoc[]).filter((d) => d.url)
  const list = docs.some((d) => d.id === doc.id) ? docs : [doc]

  return (
    <div className={styles.cell} data-thumbs={mode} data-media-cell>
      {main}
      {doc.url && (
        <button type="button" className={styles.zoom} onClick={() => setOpen(true)} aria-label={t.open(name)} title={t.open(name)} data-media-fullscreen>
          <ExpandIcon />
        </button>
      )}
      {open && <MediaLightbox docs={list} start={Math.max(0, list.findIndex((d) => d.id === doc.id))} onClose={() => setOpen(false)} />}
    </div>
  )
}

/** Square: 40px, cut around the focal point as the site cuts it. Original: 80px high, as wide as the file's proportions allow. */
function Thumb({ doc, square }: { doc: MediaDoc; square: boolean }) {
  const ratio = ratioOf(doc) ?? 1
  const style = square ? undefined : ({ '--ratio': ratio } as React.CSSProperties)
  const src = thumbOf(doc)
  return (
    <span className={styles.thumb} style={style} data-square={square || undefined}>
      {isImage(doc) && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" style={square ? { objectPosition: objectPosition(doc) } : undefined} />
      ) : isVideo(doc) && doc.url ? (
        // The first frame stands for the video; nothing plays
        <video src={`${doc.url}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} aria-hidden />
      ) : (
        <FileIcon />
      )}
    </span>
  )
}

export function ExpandIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <path d="M2 6.5V2h4.5M16 6.5V2h-4.5M2 11.5V16h4.5M16 11.5V16h-4.5" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M2 1h9l5 5v15H2z M11 1v5h5" />
    </svg>
  )
}
