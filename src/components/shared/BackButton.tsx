'use client'

import { useRouter } from 'next/navigation'

import { useI18n } from '@/i18n/client'
import { cameFromSite } from '@/lib/visits'
import styles from './TextAction.module.css'

/** «Вернуться» 12.2 / 15.2: back to the previous page; straight from a link elsewhere, to Home. */
export function BackButton({ spec }: { spec: string }) {
  const { t, href } = useI18n()
  const router = useRouter()
  return (
    <button
      type="button"
      className={styles.action}
      data-spec={spec}
      onClick={() => {
        if (cameFromSite()) router.back()
        else router.push(href('/'))
      }}
    >
      ← {t.common.back}
    </button>
  )
}
