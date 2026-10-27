'use client'
/* Admin header (top right): always visible, unlike the nav's Log out icon,
   which is hidden while the side menu is collapsed (windows 1440px wide or less). */
import { Button, useAuth, useConfig, useTranslation } from '@payloadcms/ui'
import React from 'react'

import styles from './AdminActions.module.css'
import { LanguageSwitch } from './LanguageSwitch'
import { useAdminLabel } from './useAdminLabel'

export function AdminActions() {
  const { logOut } = useAuth()
  const { config } = useConfig()
  const { t } = useTranslation()
  const label = useAdminLabel()

  const signOut = async () => {
    await logOut()
    // Full page load: drops every cached admin view along with the session
    window.location.assign(`${config.routes.admin}/login`)
  }

  return (
    <div className={styles.actions}>
      <LanguageSwitch />
      <Button el="anchor" url="/" newTab buttonStyle="subtle" size="small" margin={false} className={styles.site}>
        {label('viewSite')}
      </Button>
      <Button buttonStyle="secondary" size="small" margin={false} onClick={signOut} id="admin-sign-out">
        {t('authentication:logOut')}
      </Button>
    </div>
  )
}
