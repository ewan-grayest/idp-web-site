'use client'
/* The thumbnails mode of «Фото и видео», shared by the switch above the list and every row. Each person's choice is
   kept in their browser; a private window or blocked storage still switches, for that page only. */
import { useSyncExternalStore } from 'react'

export type ThumbMode = 'square' | 'original'

const KEY = 'idp-admin-media-thumbs'
const EVENT = 'idp:media-thumbs'
let current: ThumbMode | null = null

function read(): ThumbMode {
  if (current) return current
  try {
    return localStorage.getItem(KEY) === 'original' ? 'original' : 'square'
  } catch {
    return 'square'
  }
}

export function setThumbMode(mode: ThumbMode) {
  current = mode
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    // Kept for this page only
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(onChange: () => void) {
  // Another tab changed it: forget this page's copy and read the browser's
  const fromStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return
    current = null
    onChange()
  }
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', fromStorage)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', fromStorage)
  }
}

/** Square until the browser says otherwise: the server draws the first frame without it. */
export const useThumbMode = () => useSyncExternalStore(subscribe, read, (): ThumbMode => 'square')
