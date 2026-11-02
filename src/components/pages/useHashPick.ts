'use client'

import { useEffect } from 'react'

/**
 * Picks the item named in the address (#slug) on load and whenever the hash changes. A link to the same page
 * (footer «Авторское право» on /legal) goes through the Next.js router, which changes the hash without a
 * `hashchange` event, so the clicked link's own hash is read too.
 */
export function useHashPick(slugs: string[], pick: (k: number) => void) {
  const key = slugs.join(' ')
  useEffect(() => {
    const list = key.split(' ')
    const byHash = (hash: string) => {
      const k = list.indexOf(decodeURIComponent(hash.slice(1)))
      if (k >= 0) pick(k)
    }
    const fromHash = () => byHash(location.hash)
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a')
      if (a?.hash && new URL(a.href).pathname === location.pathname) byHash(a.hash)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('hashchange', fromHash)
      document.removeEventListener('click', onClick)
    }
  }, [key, pick])
}
