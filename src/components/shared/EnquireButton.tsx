'use client'

import { openEnquiry, type EnquireDetail } from '@/lib/enquire'
import styles from './TextAction.module.css'

/** Text action (design system) that opens the header enquiry with this page's context. */
export function EnquireButton({ label, spec, ...detail }: EnquireDetail & { label: string; spec: string }) {
  return (
    <button type="button" className={styles.action} onClick={() => openEnquiry(detail)} data-spec={spec}>
      {label}
    </button>
  )
}
