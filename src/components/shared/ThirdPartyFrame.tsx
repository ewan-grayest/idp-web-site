'use client'

import { useEffect, useState } from 'react'

import { useI18n } from '@/i18n/client'
import { COOKIE_EVENT, readCookieChoice, type CookieChoice } from '@/lib/privacy'
import styles from './ThirdPartyFrame.module.css'

/**
 * A third-party embed (the Yandex map) that loads only when the visitor has allowed third-party services
 * in the cookie notice, or presses «Показать карту» for this one map. Until then nothing is requested
 * from the provider, so it gets neither the visitor's IP address nor a chance to set its cookies.
 */
export function ThirdPartyFrame({ src, title, spec, className }: { src: string; title: string; spec: string; className: string }) {
  const { t } = useI18n()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    setAllowed(readCookieChoice() === 'all')
    const onChoice = (e: Event) => setAllowed((e as CustomEvent<CookieChoice>).detail === 'all')
    window.addEventListener(COOKIE_EVENT, onChoice)
    return () => window.removeEventListener(COOKIE_EVENT, onChoice)
  }, [])

  if (allowed) {
    return <iframe className={className} src={src} title={title} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" data-spec={spec} />
  }
  return (
    <div className={`${className} ${styles.placeholder}`} data-spec={spec} data-third-party="blocked">
      <p>{t.privacy.map.text}</p>
      <button type="button" className={styles.show} onClick={() => setAllowed(true)}>
        {t.privacy.map.show}
      </button>
    </div>
  )
}
