'use client'
/* Side menu: «Резервные копии» under its own group, after the collections and globals */
import { Link, NavGroup, useConfig } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import React from 'react'

import { useBackupTexts } from './texts'

export function BackupsNavLink() {
  const t = useBackupTexts()
  const { config } = useConfig()
  const href = `${config.routes.admin}/backups`
  const active = usePathname() === href
  const label = (
    <>
      {active && <div className="nav__link-indicator" />}
      <span className="nav__link-label">{t.nav}</span>
    </>
  )
  return (
    <NavGroup label={t.group}>
      {active ? (
        <div className="nav__link" id="nav-backups">
          {label}
        </div>
      ) : (
        <Link className="nav__link" href={href} id="nav-backups" prefetch={false}>
          {label}
        </Link>
      )}
    </NavGroup>
  )
}
