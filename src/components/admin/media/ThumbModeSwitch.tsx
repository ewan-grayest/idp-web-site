'use client'
/* Above the «Фото и видео» list (and the list in the file picker): square thumbnails as Payload draws them, or each
   file in its own proportions, larger (Ewan, 2026-11-20). */
import React from 'react'

import styles from './Media.module.css'
import { useMediaTexts } from './texts'
import { setThumbMode, useThumbMode, type ThumbMode } from './thumbMode'

export function ThumbModeSwitch() {
  const t = useMediaTexts()
  const mode = useThumbMode()
  const options: [ThumbMode, string][] = [
    ['square', t.thumbsSquare],
    ['original', t.thumbsOriginal],
  ]
  return (
    <div className={styles.switch} role="group" aria-label={t.thumbs} data-media-thumbs-switch>
      <span className={styles.switchLabel}>{t.thumbs}</span>
      {options.map(([value, label]) => (
        <button key={value} type="button" className={styles.switchButton} aria-pressed={mode === value} onClick={() => setThumbMode(value)}>
          <ModeIcon mode={value} />
          {label}
        </button>
      ))}
    </div>
  )
}

function ModeIcon({ mode }: { mode: ThumbMode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      {mode === 'square' ? (
        <>
          <rect x="2" y="2" width="6" height="6" />
          <rect x="10" y="2" width="6" height="6" />
          <rect x="2" y="10" width="6" height="6" />
          <rect x="10" y="10" width="6" height="6" />
        </>
      ) : (
        <>
          <rect x="1.5" y="3" width="9" height="5" />
          <rect x="12" y="2" width="4.5" height="7" />
          <rect x="1.5" y="10.5" width="5" height="5.5" />
          <rect x="8" y="11.5" width="8.5" height="4" />
        </>
      )}
    </svg>
  )
}
