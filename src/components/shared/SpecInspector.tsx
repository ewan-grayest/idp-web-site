'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './SpecInspector.module.css'

/** Review-only inspector: ?ids=1 lists the component IDs actually rendered by this template/content. */
export function SpecInspector() {
  const pathname = usePathname()
  const [items, setItems] = useState<{ id: string; count: number }[]>([])
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!document.documentElement.hasAttribute('data-show-ids')) return
    setOpen(true)
    const refresh = () => {
      const ids = new Map<string, number>()
      document.querySelectorAll<HTMLElement>('[data-spec]').forEach((el) => {
        const id = el.dataset.spec!
        ids.set(id, (ids.get(id) ?? 0) + 1)
      })
      setItems([...ids].sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true })).map(([id, count]) => ({ id, count })))
    }
    refresh()
    const observer = new MutationObserver((records) => {
      if (records.some((r) => !(r.target instanceof Element ? r.target : r.target.parentElement)?.closest('#idp-spec-inspector'))) refresh()
    })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-spec'] })
    return () => observer.disconnect()
  }, [pathname])
  if (!open) return null
  return <aside id="idp-spec-inspector" className={styles.panel} aria-label="Specification component IDs">
    <div className={styles.top}><strong>Specification IDs</strong><button type="button" aria-label="Close specification inspector" onClick={() => { setOpen(false); document.documentElement.removeAttribute('data-show-ids') }}>×</button></div>
    <p>Page role on the outer element; shared templates use reference IDs 5 and 7.</p>
    <ul>{items.map(({ id, count }) => <li key={id}><button type="button" onClick={() => {
      const el = [...document.querySelectorAll<HTMLElement>('[data-spec]')].find((node) => node.dataset.spec === id)
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el?.animate([{ outline: '3px solid #8dc63f' }, { outline: '3px solid transparent' }], { duration: 1600 })
    }}>{id}<span>{count > 1 ? `×${count}` : ''}</span></button></li>)}</ul>
  </aside>
}
