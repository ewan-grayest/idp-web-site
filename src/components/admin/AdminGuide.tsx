'use client'
/* Dashboard: a short note on the two language switches, in the admin's language. */
import React from 'react'

import styles from './AdminActions.module.css'
import { useAdminLabel } from './useAdminLabel'

export function AdminGuide() {
  const label = useAdminLabel()
  return (
    <section className={styles.guide} data-admin-guide>
      <h2>{label('guideTitle')}</h2>
      <p>{label('guideInterface')}</p>
      <p>{label('guideContent')}</p>
    </section>
  )
}
