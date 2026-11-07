'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { CloseIcon, PlayIcon, SoundIcon } from '@/components/shell/Icons'
import { useI18n } from '@/i18n/client'
import { Link } from '@/i18n/Link'
import { INTRO_COOKIE } from '@/lib/site'
import type { VideoSource } from '@/lib/studio'
import styles from './PromoVideo.module.css'

/** Once the intro has shown, coming back to Home in the same tab (back button) does not show it again. */
let introShown = false

/**
 * Page 2 · Promo: 2.1 Close, 2.2 play/pause, 2.3 "Our team". Clicking the video toggles playback;
 * a double click or double tap closes it (Ewan, 2026-10-26), as do Close and Escape.
 * `autoplay` and `sound` come from the admin (Studio → Promo video, both on by default). With autoplay off it waits on
 * its first frame with the play button. With sound on it starts with sound; browsers allow that only once the visitor
 * has clicked or tapped on the site, so on a first visit it starts muted with a hint, and the first click, tap or key
 * press anywhere turns the sound on. With sound off it plays muted and the sound button turns it on.
 * Safari aborts play() while the video is still loading, so an aborted start is tried again once the video can play.
 * If the browser refuses even a muted start (Safari in Low Power Mode or set to Never Auto-Play), the play button shows
 * and one click on it starts the video with sound.
 * `intro`: the same video over Home on a visitor's first visit; closing it, Escape or the end of the video shows Home.
 */
export function PromoVideo({
  sources,
  placeholder,
  intro,
  autoplay = true,
  sound = true,
}: {
  sources: VideoSource[]
  placeholder?: boolean
  intro?: boolean
  autoplay?: boolean
  sound?: boolean
}) {
  const { t, href } = useI18n()
  const router = useRouter()
  const video = useRef<HTMLVideoElement>(null)
  const [open, setOpen] = useState(() => !(intro && introShown))
  const [closing, setClosing] = useState(false)
  const [playing, setPlaying] = useState(autoplay)
  const [muted, setMuted] = useState(!sound)
  const [progress, setProgress] = useState(0)
  // Muted by the browser, not by the visitor: the next click, tap or key turns the sound on
  const [blocked, setBlocked] = useState(false)
  const unlockedAt = useRef(0)
  const lastTap = useRef(0)

  const close = () => {
    setClosing(true)
    setPlaying(false)
    setTimeout(() => setOpen(false), 600)
  }

  // Promo page: Close goes Home, so does a double click
  const leave = () => (intro ? close() : router.push(href('/')))

  // A click or tap on the video or the play button; a second one within 0.4 s closes the video
  function tap(action: () => void) {
    const now = Date.now()
    if (now - lastTap.current < 400) {
      lastTap.current = 0
      return leave()
    }
    lastTap.current = now
    // The click that turned the sound on keeps a playing video playing; a stopped one it starts, as the visitor expects
    if (playing && now - unlockedAt.current < 600) return
    action()
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
    if (!intro || !open) return
    introShown = true
    document.cookie = `${INTRO_COOKIE}=1; Path=/; SameSite=Lax`
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [intro, open])

  // Visitors whose system asks for less motion get the first frame and the play button instead
  useEffect(() => {
    if (intro && window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false)
  }, [intro])

  // Sound switched off in the admin: muted from the start (and a muted video may always start by itself)
  useEffect(() => {
    if (!sound && video.current) video.current.muted = true
  }, [sound])

  useEffect(() => {
    const v = video.current
    if (!v) return
    if (!playing) return v.pause()
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
        aria-label={playing ? t.promo.pause : t.promo.play}
        onClick={() => tap(() => setPlaying((p) => !p))}
        data-close-on-double
      >
        <video
          ref={video}
          className={styles.video}
          data-autoplay={autoplay}
          data-sound={sound}
          playsInline
          preload="auto"
          onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          onEnded={() => (intro ? close() : setPlaying(false))}
        >
          {sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
      </button>

      {placeholder && <span className={styles.placeholder}>{t.promo.placeholder}</span>}

      {blocked && !placeholder && !closing && (
        <span className={styles.hint} data-sound-hint>
          {t.promo.tapForSound}
        </span>
      )}

      {!playing && !closing && (
        <button
          type="button"
          className={styles.play}
          aria-label={t.promo.play}
          onClick={() => tap(() => setPlaying(true))}
          data-spec="2.2"
        >
          <PlayIcon />
        </button>
      )}

      {intro ? (
        <button type="button" className={styles.close} aria-label={t.promo.close} onClick={close} data-spec="2.1">
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
