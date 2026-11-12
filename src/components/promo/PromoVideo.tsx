'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { CloseIcon, PlayIcon, SoundIcon } from '@/components/shell/Icons'
import { useI18n } from '@/i18n/client'
import { Link } from '@/i18n/Link'
import { firstFrameSrc, type VideoSource } from '@/lib/promo'
import { INTRO_COOKIE } from '@/lib/site'
import styles from './PromoVideo.module.css'

/** Once the video has shown, coming back to Home in the same tab (back button) does not show it again. */
let introShown = false

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Page 2 · Promo: 2.1 Close, 2.2 Play, 2.3 "Our team".
 * The end of the video, Close, Escape or a click on the playing video leave it for Home: the intro fades away to the Home
 * page under it, the Promo page goes there (Ewan, 2026-11-12; until then a click paused it and a double click closed it).
 * While the video is stopped, a click anywhere on it starts it, as the play button does. The second click of a double
 * click is ignored, so a double click on the play button does not start the video and close it at once.
 * Once it has shown, on Home or at /promo, Home does not play it by itself again in this browser session.
 * `autoplay` and `sound` come from the admin (Studio → Promo video, both on by default). With autoplay off it waits with
 * the play button. With sound on it starts with sound; browsers allow that only once the visitor has clicked or tapped on
 * the site, so on a first visit it starts muted with a hint, and the first click, tap or key press anywhere turns the
 * sound on; that click leaves the video playing, as the hint promises. With sound off it plays muted and the sound button
 * turns it on.
 * Safari aborts play() while the video is still loading, so an aborted start is tried again once the video can play.
 * If the browser refuses even a muted start (Safari in Low Power Mode or set to Never Auto-Play), or pauses the video by
 * itself, the play button shows and one click on it starts the video with sound.
 * `background`: the image shown until the video starts, a GIF included; without it, the video's first frame
 * (Ewan, 2026-11-12).
 * `intro`: the same video over Home on a visitor's first visit.
 */
export function PromoVideo({
  sources,
  placeholder,
  intro,
  autoplay = true,
  sound = true,
  background,
}: {
  sources: VideoSource[]
  placeholder?: boolean
  intro?: boolean
  autoplay?: boolean
  sound?: boolean
  background?: string
}) {
  const { t, href } = useI18n()
  const router = useRouter()
  const video = useRef<HTMLVideoElement>(null)
  const [open, setOpen] = useState(() => !(intro && introShown))
  const [closing, setClosing] = useState(false)
  const [playing, setPlaying] = useState(autoplay)
  // The video has really begun: the background gives way to it
  const [started, setStarted] = useState(false)
  const [muted, setMuted] = useState(!sound)
  const [progress, setProgress] = useState(0)
  // Muted by the browser, not by the visitor: the next click, tap or key turns the sound on
  const [blocked, setBlocked] = useState(false)
  const unlockedAt = useRef(0)
  const lastTap = useRef(0)
  const left = useRef(false)
  // The visitor pressed play: starts even for visitors whose system asks for less motion
  const asked = useRef(false)

  // Over Home: fades away to it. The Promo page: goes Home
  const leave = () => {
    if (left.current) return
    left.current = true
    if (!intro) return router.push(href('/'))
    setClosing(true)
    setPlaying(false)
    setTimeout(() => setOpen(false), 600)
  }

  // Started inside the click, as Safari wants; the effect below deals with a refusal
  const play = () => {
    asked.current = true
    video.current?.play().catch(() => {})
    setPlaying(true)
  }

  // A click or tap on the video or the play button
  function tap() {
    const now = Date.now()
    if (now - lastTap.current < 500) return
    lastTap.current = now
    if (!playing) return play()
    // The click that turned the sound on keeps the video playing
    if (now - unlockedAt.current < 600) return
    leave()
  }

  useEffect(() => {
    if (!blocked) return
    const events = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const
    const unlock = () => {
      // Only inside a real click, tap or key press, else the browser pauses the video
      if (navigator.userActivation && !navigator.userActivation.isActive) return
      const v = video.current
      if (v) {
        v.muted = false
        if (playing && v.paused) v.play().catch(() => {})
      }
      unlockedAt.current = Date.now()
      setBlocked(false)
    }
    for (const e of events) window.addEventListener(e, unlock, true)
    return () => {
      for (const e of events) window.removeEventListener(e, unlock, true)
    }
  }, [blocked, playing])

  useEffect(() => {
    if (!open) return
    // Seen: Home does not play it by itself again in this browser session, also after /promo
    introShown = true
    document.cookie = `${INTRO_COOKIE}=1; Path=/; SameSite=Lax`
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && leave()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- leave() only reads refs and props that never change here
  }, [open])

  // Sound switched off in the admin: muted from the start (and a muted video may always start by itself)
  useEffect(() => {
    if (!sound && video.current) video.current.muted = true
  }, [sound])

  useEffect(() => {
    const v = video.current
    if (!v) return
    if (!playing) return v.pause()
    // Visitors whose system asks for less motion get the background and the play button instead, checked before any
    // start so the background stays
    if (intro && !asked.current && reducedMotion()) return setPlaying(false)
    let stopped = false
    let aborts = 0
    let unwait = () => {}
    const start = () => {
      try {
        v.play().catch(refused)
      } catch (e) {
        refused(e) // some Safari versions throw instead of rejecting
      }
    }
    // Safari rejects play() with AbortError while the video is still loading (WebKit bug 255024), even when nothing
    // paused it: try again once the video can play
    const retry = () => {
      if (v.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        const id = window.setTimeout(start, 200)
        unwait = () => window.clearTimeout(id)
      } else {
        v.addEventListener('canplay', start, { once: true })
        unwait = () => v.removeEventListener('canplay', start)
      }
    }
    const refused = (e: unknown) => {
      if (stopped) return // paused or closed meanwhile
      const name = e instanceof DOMException ? e.name : ''
      if (name === 'AbortError' && aborts++ < 3) return retry()
      // No sound before a click or tap: play muted; the next click, tap or key press turns the sound on
      if (name === 'NotAllowedError' && !v.muted) {
        v.muted = true
        setBlocked(true)
        return start()
      }
      setPlaying(false) // refused even muted, or a file this browser cannot play: the play button
    }
    start()
    return () => {
      stopped = true
      unwait()
    }
  }, [playing])

  if (!open) return null

  return (
    <div
      className={`${styles.promo} theme-dark`}
      data-spec="2"
      data-intro={intro || undefined}
      data-closing={closing || undefined}
    >
      <button
        type="button"
        className={styles.screen}
        aria-label={playing ? t.promo.close : t.promo.play}
        onClick={tap}
        data-promo-screen
      >
        <video
          ref={video}
          className={styles.video}
          data-autoplay={autoplay}
          data-sound={sound}
          playsInline
          preload="auto"
          onPlaying={() => setStarted(true)}
          // Paused by the browser once it had begun (a phone locked, the tab sent to the background): the play button.
          // Not before it begins, when Safari may abort and retry the start
          onPause={(e) => started && !e.currentTarget.ended && !left.current && setPlaying(false)}
          onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          onEnded={leave}
        >
          {sources.map((s) => (
            <source key={s.src} src={background ? s.src : firstFrameSrc(s.src)} type={s.type} />
          ))}
        </video>
        {background && <Background src={background} hidden={started} />}
      </button>

      {placeholder && <span className={styles.placeholder}>{t.promo.placeholder}</span>}

      {blocked && !placeholder && !closing && (
        <span className={styles.hint} data-sound-hint>
          {t.promo.tapForSound}
        </span>
      )}

      {!playing && !closing && (
        <button type="button" className={styles.play} aria-label={t.promo.play} onClick={tap} data-spec="2.2">
          <PlayIcon />
        </button>
      )}

      {intro ? (
        <button type="button" className={styles.close} aria-label={t.promo.close} onClick={leave} data-spec="2.1">
          <CloseIcon />
        </button>
      ) : (
        <Link href="/" className={styles.close} aria-label={t.promo.close} data-spec="2.1">
          <CloseIcon />
        </Link>
      )}

      {/* The placeholder clip is silent */}
      {!placeholder && (
        <button
          type="button"
          className={styles.sound}
          aria-label={muted ? t.promo.soundOn : t.promo.soundOff}
          onClick={() => {
            const v = video.current
            // The click that just turned the sound on should not turn it off again
            if (v && Date.now() - unlockedAt.current > 600) v.muted = !v.muted
          }}
        >
          <SoundIcon muted={muted} />
        </button>
      )}

      <div className={styles.bar} aria-hidden>
        <div className={styles.fill} style={{ width: `${progress * 100}%` }} />
      </div>

      <Link href="/studio#team" className={styles.team} data-spec="2.3">
        {t.promo.team}
      </Link>
    </div>
  )
}

/**
 * The background image until the video starts. For visitors whose system asks for less motion it is drawn once onto a
 * canvas, which keeps a GIF still: drawing an animated image takes its first frame.
 */
function Background({ src, hidden }: { src: string; hidden: boolean }) {
  const image = useRef<HTMLImageElement>(null)
  const still = useRef<HTMLCanvasElement>(null)

  const draw = () => {
    const img = image.current
    const canvas = still.current
    if (!img?.naturalWidth || !canvas || !reducedMotion()) return
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')?.drawImage(img, 0, 0)
  }

  // An image already loaded when the page came to life fires no load event for React to see
  useEffect(() => {
    if (image.current?.complete) draw()
  }, [src])

  return (
    <span className={styles.background} data-hidden={hidden || undefined} data-promo-background aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- full-screen, any format, a GIF must keep moving */}
      <img ref={image} src={src} alt="" className={styles.image} fetchPriority="high" onLoad={draw} />
      <canvas ref={still} className={styles.still} />
    </span>
  )
}
