'use client'

import { useEffect, useRef } from 'react'

/**
 * Section entrance motion (spec 3–7): each child section rises 64px and overlaps the one above as it scrolls in.
 * Uses GSAP ScrollTrigger; skipped when the visitor asks for reduced motion.
 */
export function Rise({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !root.current) return
    let ctx: { revert: () => void } | undefined
    let cancelled = false
    ;(async () => {
      const { gsap } = await import('gsap')
      const { ScrollTrigger } = await import('gsap/ScrollTrigger')
      if (cancelled || !root.current) return
      gsap.registerPlugin(ScrollTrigger)
      ctx = gsap.context(() => {
        const sections = gsap.utils.toArray<HTMLElement>(':scope > section')
        sections.slice(1).forEach((el) => {
          gsap.from(el, {
            y: 64,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top bottom-=40', once: true },
          })
        })
      }, root)
    })()
    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [])

  return (
    <div ref={root} style={{ display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  )
}
