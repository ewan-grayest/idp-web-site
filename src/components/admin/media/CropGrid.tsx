'use client'
/* «Кадрирование на сайте» on a file's page (Ewan, 2026-11-20): the photo with what each place on the site shows of it.
   The frame is the fixed area, the part every ticked place shows; hatching is the adaptive area, shown only by some
   places, depending on the screen; the shaded rest is seen only in the full screen viewer. The point is the focal
   point (Payload's focalX / focalY), which the site now crops around: drag it, click the photo or use the arrow keys.
   Under the photo, each place in miniature, cropped by the same CSS as the site; one click draws its frame.
   The crop arithmetic is lib/crops.ts. */
import { getTranslation } from '@payloadcms/translations'
import { useDocumentInfo, useForm, useFormFields, useTranslation, useUploadEdits } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import React, { useEffect, useId, useMemo, useRef, useState } from 'react'

import { bounds, coverRect, cropGroups, focusAt, focusOf, formatsFor, intersect, type CropFormat, type CropGroup, type Focus, type Rect } from '@/lib/crops'
import { fresh, isImage, type MediaDoc } from './file'
import { ExpandIcon } from './MediaCell'
import { MediaLightbox } from './MediaLightbox'
import styles from './Media.module.css'
import { useMediaTexts } from './texts'

const GROUPS_KEY = 'idp-admin-crop-groups'

function storedGroups(): CropGroup[] {
  try {
    const saved = JSON.parse(localStorage.getItem(GROUPS_KEY) ?? 'null')
    if (Array.isArray(saved)) return cropGroups.filter((g) => saved.includes(g))
  } catch {
    // Every group, as at first
  }
  return cropGroups
}

export const CropGrid: UIFieldClientComponent = ({ field }) => {
  const t = useMediaTexts()
  const { i18n } = useTranslation()
  const label = field.label ? getTranslation(field.label as Record<string, string>, i18n) : ''
  const { data } = useDocumentInfo()
  const { dispatchFields, setModified } = useForm()
  const { uploadEdits, updateUploadEdits } = useUploadEdits()
  const formX = useFormFields(([f]) => f.focalX?.value) as number | null | undefined
  const formY = useFormFields(([f]) => f.focalY?.value) as number | null | undefined

  const doc = data as MediaDoc | undefined
  // Payload's own focal point editor («Редактировать изображение») writes uploadEdits: it wins, as it does on save
  const saved = uploadEdits?.focalPoint ?? focusOf({ focalX: formX ?? doc?.focalX, focalY: formY ?? doc?.focalY })
  const [drag, setDrag] = useState<Focus | null>(null)
  const focus = drag ?? { x: saved.x, y: saved.y }

  const [groups, setGroups] = useState<CropGroup[]>(cropGroups)
  useEffect(() => setGroups(storedGroups()), [])
  const toggleGroup = (g: CropGroup) =>
    setGroups((now) => {
      const next = now.includes(g) ? now.filter((x) => x !== g) : cropGroups.filter((x) => x === g || now.includes(x))
      try {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(next))
      } catch {
        // Kept for this page only
      }
      return next
    })

  const [shown, setShown] = useState<string | null>(null)
  const [viewer, setViewer] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const id = useId().replace(/:/g, '')

  const photo = doc?.width && doc?.height ? { width: doc.width, height: doc.height } : null
  const formats = useMemo(() => (photo ? formatsFor(photo, groups) : []), [photo?.width, photo?.height, groups]) // eslint-disable-line react-hooks/exhaustive-deps
  const rects = useMemo(() => (photo ? formats.map((f) => ({ f, r: coverRect(photo, f, focus) })) : []), [formats, focus.x, focus.y]) // eslint-disable-line react-hooks/exhaustive-deps
  const fixed = intersect(rects.map((x) => x.r))
  const outline = bounds(rects.map((x) => x.r))

  const head = (
    <div className={styles.gridHead}>
      <span className={styles.gridLabel}>{label}</span>
    </div>
  )
  if (!doc?.id || !doc.url) {
    return (
      <div className={styles.grid} data-crop-grid>
        {head}
        <p className={styles.gridHelp}>{t.gridNoFile}</p>
      </div>
    )
  }
  if (!isImage(doc) || !photo) {
    return (
      <div className={styles.grid} data-crop-grid>
        {head}
        <p className={styles.gridHelp}>{t.gridNotImage}</p>
      </div>
    )
  }

  const commit = (f: Focus) => {
    dispatchFields({ type: 'UPDATE', path: 'focalX', value: f.x })
    dispatchFields({ type: 'UPDATE', path: 'focalY', value: f.y })
    // Payload's own editor keeps its point in uploadEdits and sends it on save, where it would win: keep it in step.
    // Without it the fields are enough, and saving stores the point without remaking the image sizes
    if (uploadEdits?.focalPoint) updateUploadEdits({ focalPoint: f })
    setModified(true)
  }
  const at = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect()
    return focusAt((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
  }
  const src = fresh(doc.sizes?.wide?.url || doc.url, doc)
  const thumb = fresh(doc.sizes?.thumb?.url || doc.url, doc)
  const W = photo.width
  const H = photo.height
  const px = (r: Rect) => ({ x: r.x * W, y: r.y * H, width: r.w * W, height: r.h * H })
  const shownRect = rects.find((x) => x.f.id === shown)

  return (
    <div className={styles.grid} data-crop-grid>
      <div className={styles.gridHead}>
        <span className={styles.gridLabel}>{label}</span>
        <div className={styles.gridTools}>
          <button type="button" className={styles.gridButton} onClick={() => commit({ x: 50, y: 50 })} disabled={focus.x === 50 && focus.y === 50}>
            {t.gridCentre}
          </button>
          <button type="button" className={styles.gridButton} onClick={() => setViewer(true)} data-media-fullscreen>
            <ExpandIcon />
            {t.open(doc.filename ?? '')}
          </button>
        </div>
      </div>
      <p className={styles.gridHelp}>{t.gridHelp}</p>

      <fieldset className={styles.gridGroups}>
        <legend>{t.gridGroups}</legend>
        {cropGroups.map((g) => (
          <label key={g} className={styles.gridCheck}>
            <input type="checkbox" checked={groups.includes(g)} onChange={() => toggleGroup(g)} data-crop-group={g} />
            {t.groups[g]}
          </label>
        ))}
      </fieldset>

      <div
        ref={box}
        className={styles.gridPhoto}
        role="presentation"
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          dragging.current = true
          setDrag(at(e))
        }}
        onPointerMove={(e) => dragging.current && setDrag(at(e))}
        onPointerUp={(e) => {
          if (!dragging.current) return
          dragging.current = false
          const f = at(e)
          setDrag(null)
          commit(f)
        }}
        onPointerCancel={() => {
          dragging.current = false
          setDrag(null)
        }}
        data-crop-photo
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} width={W} height={H} />
        <svg className={styles.gridOverlay} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
          <defs>
            <pattern id={`${id}-hatch`} patternUnits="userSpaceOnUse" width={W / 70} height={W / 70} patternTransform="rotate(45)">
              <rect width={W / 70} height={W / 70} fill="var(--color-base-1000)" fillOpacity={0.18} />
              <line x1="0" y1="0" x2="0" y2={W / 70} stroke="var(--color-base-0)" strokeOpacity={0.75} strokeWidth={W / 280} />
            </pattern>
            <mask id={`${id}-outside`}>
              <rect width={W} height={H} fill="white" />
              {rects.map(({ f, r }) => (
                <rect key={f.id} {...px(r)} fill="black" />
              ))}
            </mask>
            <mask id={`${id}-adaptive`}>
              {rects.map(({ f, r }) => (
                <rect key={f.id} {...px(r)} fill="white" />
              ))}
              {fixed && <rect {...px(fixed)} fill="black" />}
            </mask>
          </defs>
          {rects.length > 0 && <rect width={W} height={H} fill="var(--color-base-1000)" fillOpacity={0.62} mask={`url(#${id}-outside)`} data-crop-hidden />}
          {rects.length > 0 && <rect width={W} height={H} fill={`url(#${id}-hatch)`} mask={`url(#${id}-adaptive)`} />}
          {outline && <rect {...px(outline)} fill="none" stroke="var(--color-base-0)" strokeOpacity={0.7} strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
          {fixed && (
            <g data-crop-fixed>
              <rect {...px(fixed)} fill="none" stroke="var(--color-base-1000)" strokeOpacity={0.55} strokeWidth={7} vectorEffect="non-scaling-stroke" />
              <rect {...px(fixed)} fill="none" stroke="var(--color-base-0)" strokeWidth={3} vectorEffect="non-scaling-stroke" />
            </g>
          )}
          {shownRect && (
            <g>
              <rect {...px(shownRect.r)} fill="none" stroke="var(--color-base-1000)" strokeOpacity={0.7} strokeWidth={4} vectorEffect="non-scaling-stroke" />
              <rect {...px(shownRect.r)} fill="none" stroke="var(--color-base-0)" strokeWidth={2} strokeDasharray="8 5" vectorEffect="non-scaling-stroke" />
            </g>
          )}
        </svg>
        <button
          type="button"
          className={styles.gridDot}
          style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
          aria-label={`${t.gridFocus}. ${t.gridPoint(focus.x, focus.y)}`}
          title={t.gridPoint(focus.x, focus.y)}
          data-dragging={drag ? true : undefined}
          data-crop-focus
          onKeyDown={(e) => {
            const step = e.shiftKey ? 10 : 1
            const d = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[e.key]
            if (!d) return
            e.preventDefault()
            commit(focusAt((focus.x + d[0]) / 100, (focus.y + d[1]) / 100))
          }}
        />
      </div>

      <div className={styles.gridFacts}>
        <span data-crop-point>{t.gridPoint(focus.x, focus.y)}</span>
        <span className={styles.gridKey}>
          <span className={styles.gridSwatch} data-kind="fixed" />
          {t.gridFixed}
        </span>
        <span className={styles.gridKey}>
          <span className={styles.gridSwatch} data-kind="adaptive" />
          {t.gridAdaptive}
        </span>
        <span className={styles.gridKey}>
          <span className={styles.gridSwatch} data-kind="hidden" />
          {t.gridHidden}
        </span>
      </div>
      {rects.length > 0 && !fixed && (
        <p className={styles.gridWarn} role="status" data-crop-no-fixed>
          {t.gridNoFixed}
        </p>
      )}

      {formats.length > 0 && (
        <>
          <p className={styles.previewsTitle}>{t.gridFormats}</p>
          <ul className={styles.previews}>
            {formats.map((f) => (
              <li key={f.id}>
                <Preview format={f} src={thumb} focus={focus} name={t.formats[f.id] ?? f.id} pressed={shown === f.id} onClick={() => setShown((s) => (s === f.id ? null : f.id))} title={t.gridShow(t.formats[f.id] ?? f.id)} />
              </li>
            ))}
          </ul>
        </>
      )}

      {viewer && <MediaLightbox docs={[doc]} start={0} onClose={() => setViewer(false)} editLink={false} />}
    </div>
  )
}

/** One place on the site in miniature: the same box proportions, cover and object-position as the page. */
function Preview({ format, src, focus, name, pressed, onClick, title }: { format: CropFormat; src?: string; focus: Focus; name: string; pressed: boolean; onClick: () => void; title: string }) {
  const window = format.window ?? 1
  const shownAspect = format.aspect * window
  let h = 84
  let w = h * shownAspect
  if (w > 120) {
    w = 120
    h = w / shownAspect
  }
  return (
    <button type="button" className={styles.preview} aria-pressed={pressed} onClick={onClick} title={title} data-crop-format={format.id}>
      <span className={styles.previewBox} style={{ width: w, height: h }}>
        <span style={{ width: `${100 / window}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src && <img src={src} alt="" loading="lazy" style={{ objectPosition: `${focus.x}% ${focus.y}%` }} />}
        </span>
      </span>
      <span>{name}</span>
    </button>
  )
}
