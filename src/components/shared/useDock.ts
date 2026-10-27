'use client'

import { useEffect, useRef } from 'react'

const MAX = 1.4 // the item under the pointer grows by 40%
const QUERY = '(hover: hover) and (pointer: fine) and (min-width: 768px) and (prefers-reduced-motion: no-preference)'

/**
 * macOS Dock-like magnification for a row of items: the item under the pointer grows, its neighbours a little less.
 * Each child gets --dock (1 to MAX); the CSS scales it. Mouse only, wide screens only, off with reduced motion.
 */
export function useDock<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const row = ref.current
    if (!row || !window.matchMedia(QUERY).matches) return
    let frame = 0
    let x = 0

    const items = () => Array.from(row.children) as HTMLElement[]
    const centre = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      return r.left + r.width / 2
    }

    function paint() {
      frame = 0
      const all = items()
      // The reach follows the spacing, so a sparse line still lifts the next item a little
      const step = all.length > 1 ? Math.abs(centre(all[1]) - centre(all[0])) : 80
      const reach = Math.min(Math.max(step * 1.8, 110), 520)
      for (const el of all) {
        const d = Math.min(Math.abs(centre(el) - x) / reach, 1)
        el.style.setProperty('--dock', (1 + ((MAX - 1) * (Math.cos(Math.PI * d) + 1)) / 2).toFixed(3))
      }
    }
    function move(e: PointerEvent) {
      if (e.pointerType !== 'mouse') return
      x = e.clientX
      if (!frame) frame = requestAnimationFrame(paint)
    }
    function leave() {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      for (const el of items()) el.style.removeProperty('--dock')
    }

    row.addEventListener('pointermove', move)
    row.addEventListener('pointerleave', leave)
    return () => {
      leave()
      row.removeEventListener('pointermove', move)
      row.removeEventListener('pointerleave', leave)
    }
  }, [])

  return ref
}
