'use client'
/* The account button at the top right of the admin header opens a menu: who is signed in,
   "Account" and "Log out". Payload's own button only links to the account page.

   Payload renders this avatar inside its account <Link>, which navigates on every click
   (it ignores preventDefault). So the link is turned into a plain wrapper: a native listener
   on it swallows the click before React sees it and toggles the menu instead, and the link
   leaves the tab order so the menu button is the one keyboard stop. */
import { Popup, PopupList, useAuth, useConfig, useTranslation } from '@payloadcms/ui'
import { usePathname, useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import styles from './AdminActions.module.css'
import { useSignOut } from './useSignOut'

export function AccountMenu() {
  const ref = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const { config } = useConfig()
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const signOut = useSignOut()

  const accountURL = `${config.routes.admin}${config.admin.routes.account}`

  useEffect(() => {
    const link = ref.current?.closest('a')
    if (!link) return
    link.tabIndex = -1
    link.setAttribute('role', 'none')
    link.removeAttribute('aria-label')
    const toggle = (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setOpen((wasOpen) => !wasOpen)
    }
    link.addEventListener('click', toggle)
    return () => link.removeEventListener('click', toggle)
  }, [])

  useEffect(() => {
    const trigger = ref.current?.closest('[role=button]')
    trigger?.setAttribute('aria-haspopup', 'menu')
    trigger?.setAttribute('aria-expanded', String(open))
  }, [open])

  return (
    // The menu is portalled to <body>, but React still bubbles its clicks to the account link
    <div className={styles.account} onClick={(event) => event.stopPropagation()}>
      <Popup
        button={
          <span ref={ref} className={styles.avatar} title={t('authentication:account')}>
            <AccountIcon active={pathname === accountURL} />
            <span className={styles.hidden}>{t('authentication:account')}</span>
          </span>
        }
        buttonType="custom"
        caret={false}
        forceOpen={open}
        horizontalAlign="right"
        noBackground
        onToggleClose={() => setOpen(false)}
        onToggleOpen={() => setOpen(true)}
        size="fit-content"
      >
        {user?.email && <PopupList.GroupLabel label={user.email} />}
        <PopupList.ButtonGroup>
          <PopupList.Button id="account-menu-account" onClick={() => router.push(accountURL)}>
            {t('authentication:account')}
          </PopupList.Button>
          <PopupList.Button id="account-menu-sign-out" onClick={() => void signOut()}>
            {t('authentication:logOut')}
          </PopupList.Button>
        </PopupList.ButtonGroup>
      </Popup>
    </div>
  )
}

/** Payload's default account icon (not exported by @payloadcms/ui); its styles come with the admin CSS */
function AccountIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden
      className={['graphic-account', active && 'graphic-account--active'].filter(Boolean).join(' ')}
      height="25"
      viewBox="0 0 25 25"
      width="25"
    >
      <circle className="graphic-account__bg" cx="12.5" cy="12.5" r="11.5" />
      <circle className="graphic-account__head" cx="12.5" cy="10.73" r="3.98" />
      <path
        className="graphic-account__body"
        d="M12.5,24a11.44,11.44,0,0,0,7.66-2.94c-.5-2.71-3.73-4.8-7.66-4.8s-7.16,2.09-7.66,4.8A11.44,11.44,0,0,0,12.5,24Z"
      />
    </svg>
  )
}
