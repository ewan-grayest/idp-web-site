'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type AnimationEvent, type CSSProperties, type PointerEvent } from 'react'

import { ArrowIcon, ChevronIcon, PauseIcon } from '@/components/shell/Icons'
import { LanguageLinks } from '@/components/shell/LanguageLinks'
import { useI18n } from '@/i18n/client'
import { Link } from '@/i18n/Link'
import type { Slide } from '@/lib/homeSlides'
import styles from './HomeSliders.module.css'

type Side = 'left' | 'right'
/** Where the incoming slide enters from: -1 the left, 1 the right, 0 nowhere (first paint) */
type From = -1 | 0 | 1

const SLIDE_SECONDS = 6
/** Room left around the logo and the language list inside the centre strip, px */
const STRIP_MARGIN = 40
/** Same as the CSS: halves stack and never expand */
const STACKED = '(max-width: 767px), (hover: none)'
/** A sideways finger move longer than this changes the slide, px */
const SWIPE = 40

/**
 * Page 1 · Home.
 * 1.2 / 1.3: two 50/50 sliders. Each slide is a project ticked «Показывать в слайдере на главной» in the admin
 * (public on the left, residential on the right): its panorama, name and «Смотреть проект»; a click opens it.
 * Slides move by themselves toward the logo (the left ones enter from the left, the right ones from the right).
 * 1.2.1 / 1.3.1 time indicator: one segment per project, the current one filling up, with ‹ › and the counter.
 * Pointing at one half expands it to full screen, pauses both sliders (shown as «Пауза») and fades the logo 1.1.
 * The open half follows the cursor's position, not the element under it: an expanded half covers the
 * whole screen, so the cursor could never leave it. A centre strip around the logo and the language list
 * brings back the 50/50 view with both clickable; crossing it opens the other half, whose name waits at the
 * far edge; leaving the page closes. Captions and controls keep to each half's outer side, inside its zone.
 * Phones stack the halves: a swipe or ‹ › changes the slide.
 * Names, «Смотреть проект», the arrows and the segments were added on 2026-10-25, when Ewan found Home vague.
 * 1.1: floating logo, grows 20% on hover, opens the Team page 3. (The spec opened the promo video; Ewan changed it
 *   on 2026-10-25: the video now plays by itself on the first visit, see PromoVideo `intro`.)
 */
export function HomeSliders({ left, right }: { left: Slide[]; right: Slide[] }) {
  const { t } = useI18n()
  const [open, setOpen] = useState<Side | null>(null)
  const [hidden, setHidden] = useState(false)
  const [still, setStill] = useState(false)
  const logo = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === 'hidden')
    // Reduced motion: no autoplay; the arrows and segments still change slides
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotion = () => setStill(motion.matches)
    onMotion()
    document.addEventListener('visibilitychange', onVis)
    motion.addEventListener('change', onMotion)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      motion.removeEventListener('change', onMotion)
    }
  }, [])

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || window.matchMedia(STACKED).matches) return
    const box = e.currentTarget.getBoundingClientRect()
    const dx = e.clientX - (box.left + box.width / 2)
    // Widest of the logo at its 20% hover size and the language list, plus a margin
    const langs = e.currentTarget.querySelector<HTMLElement>('[data-language-links]')
    const strip = Math.max((logo.current?.offsetWidth ?? 0) * 0.6, (langs?.offsetWidth ?? 0) / 2) + STRIP_MARGIN
    setOpen(Math.abs(dx) <= strip ? null : dx < 0 ? 'left' : 'right')
  }

  const paused = open !== null || hidden

  return (
    <div
      className={`${styles.home} theme-dark`}
      data-hover={open ?? undefined}
      data-spec="1"
      onPointerMove={onPointerMove}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(null)}
    >
      <Half
        side="left"
        spec="1.2"
        label={t.home.public}
        slides={left}
        paused={paused}
        still={still}
        expanded={open === 'left'}
        onOpen={setOpen}
      />
      <Half
        side="right"
        spec="1.3"
        label={t.home.residential}
        slides={right}
        paused={paused}
        still={still}
        expanded={open === 'right'}
        onOpen={setOpen}
      />
      <span className={styles.seam} aria-hidden />
      <span className={styles.peek} data-side="left" aria-hidden>
        <ChevronIcon dir="left" />
        {t.home.public}
      </span>
      <span className={styles.peek} data-side="right" aria-hidden>
        <ChevronIcon dir="right" />
        {t.home.residential}
      </span>
      <Link ref={logo} href="/studio" className={styles.logo} aria-label={t.home.logo} data-spec="1.1">
        ID
      </Link>
      <LanguageLinks className={styles.langs} itemClassName={styles.lang} short />
    </div>
  )
}

function Half({
  side,
  spec,
  label,
  slides,
  paused,
  still,
  expanded,
  onOpen,
}: {
  side: Side
  spec: string
  label: string
  slides: Slide[]
  paused: boolean
  still: boolean
  expanded: boolean
  onOpen: (s: Side | null) => void
}) {
  const { t } = useI18n()
  const [{ i, from, prev }, setView] = useState<{ i: number; from: From; prev: number | null }>({ i: 0, from: 0, prev: null })
  const touch = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  const count = slides.length
  const current = slides[i] ?? slides[0]
  const many = count > 1
  const autoplay = many && !still
  const wrap = (k: number) => (k + count) % count

  const go = (k: number, dir: From) => setView((v) => (k === v.i ? v : { i: k, from: dir, prev: v.i }))
  // ‹ › and swipes read like any carousel: the next project comes in from the right
  const step = (by: 1 | -1) => go(wrap(i + by), by)
  // Playing by itself, slides move toward the logo: the left half's come in from the left
  const onFillEnd = (e: AnimationEvent) => {
    // Reduced motion shortens every animation to nothing; such an end is not a finished slide
    if (e.elapsedTime >= SLIDE_SECONDS - 0.5) go(wrap(i + 1), side === 'left' ? -1 : 1)
  }
  // Only the slides on screen and next to it load their photos
  const near = (k: number) => k === i || k === prev || k === wrap(i + 1) || k === wrap(i - 1)
  const pad = (n: number) => String(n).padStart(2, '0')

  const body = (
    <>
      <div className={styles.slides} style={{ '--from': from } as CSSProperties}>
        {slides.map((s, k) => (
          <div
            key={s.key}
            className={styles.slide}
            data-state={k === i ? 'in' : k === prev ? 'out' : undefined}
            aria-hidden={k !== i || undefined}
          >
            {s.image ? (
              near(k) && (
                <Image src={s.image.url} alt={s.image.alt} fill sizes="100vw" priority={k === 0} className={styles.img} />
              )
            ) : (
              <Placeholder variant={k} />
            )}
          </div>
        ))}
      </div>
      <div className={styles.caption}>
        <span className={styles.kind}>{label}</span>
        <span key={current.key} className={styles.name}>
          {current.title}
        </span>
        {current.href ? (
          <span className={styles.open}>
            {t.home.open} <ArrowIcon />
          </span>
        ) : (
          <span className={styles.hint}>{t.home.empty}</span>
        )}
        <span className="spec-id">{spec}</span>
      </div>
    </>
  )

  return (
    <div
      className={styles.half}
      data-side={side}
      data-expanded={expanded || undefined}
      data-spec={spec}
      // Keyboard only: a mouse click also focuses, and the cursor decides then
      onFocus={(e) => e.target.matches(':focus-visible') && onOpen(side)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && onOpen(null)}
      onPointerDown={(e) => {
        if (e.pointerType === 'touch') touch.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerUp={(e) => {
        const start = touch.current
        touch.current = null
        if (!start || !many) return
        const dx = e.clientX - start.x
        if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(e.clientY - start.y)) return
        // A swipe is not a tap: keep it from opening the project
        swiped.current = true
        setTimeout(() => (swiped.current = false), 400)
        step(dx < 0 ? 1 : -1)
      }}
      onPointerCancel={() => (touch.current = null)}
      onClickCapture={(e) => swiped.current && e.preventDefault()}
    >
      {current.href ? (
        <Link href={current.href} className={styles.link} aria-label={`${label}: ${current.title}`}>
          {body}
        </Link>
      ) : (
        <div className={styles.link}>{body}</div>
      )}

      {many && (
        <div className={styles.controls} data-spec={`${spec}.1`}>
          <span className={styles.nav}>
            <button type="button" className={styles.step} onClick={() => step(-1)} aria-label={t.home.prev}>
              <ChevronIcon dir="left" />
            </button>
            <span className={styles.count}>
              {pad(i + 1)} / {pad(count)}
            </span>
            <button type="button" className={styles.step} onClick={() => step(1)} aria-label={t.home.next}>
              <ChevronIcon dir="right" />
            </button>
          </span>
          {/* Mouse shortcuts to each project; keyboards use ‹ › */}
          <span className={styles.bar}>
            {slides.map((s, k) => (
              <button
                key={s.key}
                type="button"
                tabIndex={-1}
                aria-hidden
                className={styles.seg}
                data-state={k < i ? 'done' : k === i ? 'now' : undefined}
                onClick={() => go(k, k > i ? 1 : -1)}
              >
                {k === i && (
                  <span
                    key={i}
                    className={styles.fill}
                    data-still={!autoplay || undefined}
                    style={{ animationDuration: `${SLIDE_SECONDS}s`, animationPlayState: paused ? 'paused' : 'running' }}
                    onAnimationEnd={autoplay ? onFillEnd : undefined}
                  />
                )}
              </button>
            ))}
          </span>
          {expanded && autoplay && (
            <span className={styles.pause}>
              <PauseIcon /> {t.home.paused}
            </span>
          )}
          <span className="spec-id">{spec}.1</span>
        </div>
      )}
    </div>
  )
}

/** Line drawing of a numbered room, shown until projects are ticked for Home. */
function Placeholder({ variant }: { variant: number }) {
  const tones = ['#262626', '#2c2a27', '#24272a', '#29272b']
  const wx = [320, 1000, 260, 1060]
  return (
    <svg
      className={styles.img}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      style={{ background: tones[variant % 4] }}
      fill="none"
      stroke="#4a4a4a"
      strokeWidth="1.5"
      aria-hidden
    >
      <rect x="500" y="250" width="440" height="330" />
      <path d="M0 0 500 250M1440 0 940 250M0 900 500 580M1440 900 940 580" />
      <rect x={wx[variant % 4]} y="300" width="120" height="180" />
      <path d="M720 0v190M690 190h60" />
      <text x="720" y="485" textAnchor="middle" fill="#4a4743" stroke="none" style={{ font: '200 180px var(--font-sans)' }}>
        {String(variant + 1).padStart(2, '0')}
      </text>
    </svg>
  )
}
