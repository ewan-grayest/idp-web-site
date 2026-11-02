'use client'
/* 5.1.3 in the admin: the photo with its products as numbered dots. A click on the photo adds a product there,
   dragging a dot moves it; X and Y (% of the photo, as the site uses them) are filled in by themselves.
   The name and partner of each product are the numbered rows of «Товары на фото» below. */
import { useForm, useFormFields } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import React, { useEffect, useRef, useState } from 'react'

import styles from './HotspotPicker.module.css'
import { useAdminLabel } from './useAdminLabel'

const round = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10

export const HotspotPicker: UIFieldClientComponent = ({ path }) => {
  const label = useAdminLabel()
  const base = path.split('.').slice(0, -1).join('.')
  const list = `${base ? `${base}.` : ''}hotspots`
  const { addFieldRow, dispatchFields, setModified } = useForm()

  const imageId = useFormFields(([fields]) => fields[`${base ? `${base}.` : ''}image`]?.value) as number | string | null | undefined
  const spots = useFormFields(([fields]) => {
    const n = Number(fields[list]?.value) || 0
    return Array.from({ length: n }, (_, k) => ({
      x: fields[`${list}.${k}.x`]?.value as number | null | undefined,
      y: fields[`${list}.${k}.y`]?.value as number | null | undefined,
      name: (fields[`${list}.${k}.label`]?.value as string | undefined) ?? '',
      partner: !!fields[`${list}.${k}.partner`]?.value,
    }))
  })

  const [src, setSrc] = useState<string>()
  useEffect(() => {
    setSrc(undefined)
    const id = typeof imageId === 'object' && imageId ? (imageId as { id: number }).id : imageId
    if (!id) return
    let live = true
    fetch(`/api/v1/media/${id}?depth=0`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => live && m && setSrc(m.sizes?.wide?.url || m.url))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [imageId])

  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ k: number; moved: boolean } | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)

  const at = (e: React.PointerEvent | React.MouseEvent) => {
    const r = box.current!.getBoundingClientRect()
    return { x: round(((e.clientX - r.left) / r.width) * 100), y: round(((e.clientY - r.top) / r.height) * 100) }
  }

  const place = (k: number, p: { x: number; y: number }) => {
    dispatchFields({ type: 'UPDATE', path: `${list}.${k}.x`, value: p.x })
    dispatchFields({ type: 'UPDATE', path: `${list}.${k}.y`, value: p.y })
    setModified(true)
  }

  const add = (e: React.MouseEvent) => {
    if (drag.current) return
    const p = at(e)
    addFieldRow({
      path: list,
      schemaPath: list.replace(/\.\d+(?=\.|$)/g, ''),
      subFieldState: {
        x: { initialValue: p.x, value: p.x, valid: true },
        y: { initialValue: p.y, value: p.y, valid: true },
      },
    })
  }

  if (!src) return <p className={styles.note}>{label('hotspotsNoPhoto')}</p>

  return (
    <div className={styles.picker} data-hotspot-picker>
      <p className={styles.note}>{label('hotspotsHelp')}</p>
      <div ref={box} className={styles.photo} onClick={add} role="presentation">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} />
        {spots.map((s, k) =>
          typeof s.x === 'number' && typeof s.y === 'number' ? (
            <button
              key={k}
              type="button"
              className={styles.dot}
              data-dragging={dragging === k || undefined}
              data-no-partner={!s.partner || undefined}
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
              title={`${k + 1}${s.name ? ` · ${s.name}` : ''} · X ${s.x}% · Y ${s.y}%`}
              aria-label={`${label('hotspotsMove')} ${k + 1}`}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => {
                e.preventDefault()
                e.currentTarget.setPointerCapture(e.pointerId)
                drag.current = { k, moved: false }
                setDragging(k)
              }}
              onPointerMove={(e) => {
                if (drag.current?.k !== k) return
                drag.current.moved = true
                place(k, at(e))
              }}
              onPointerUp={() => {
                // Let the click that ends a drag pass without adding a product
                setTimeout(() => (drag.current = null), 0)
                setDragging(null)
              }}
              onKeyDown={(e) => {
                const step = e.shiftKey ? 5 : 0.5
                const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
                if (!d) return
                e.preventDefault()
                place(k, { x: round(s.x! + d[0]), y: round(s.y! + d[1]) })
              }}
            >
              {k + 1}
            </button>
          ) : null,
        )}
      </div>
      {spots.some((s) => typeof s.x !== 'number' || typeof s.y !== 'number') && (
        <p className={styles.note}>{label('hotspotsUnplaced')}</p>
      )}
      {spots.some((s) => !s.partner) && (
        <p className={styles.warn} data-hotspot-no-partner>
          {label('hotspotsNoPartner')}
        </p>
      )}
    </div>
  )
}
