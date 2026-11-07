'use client'
/* Side menu: the «Обслуживание» group after the collections and globals, with «Резервные копии» and «Диагностика» */
import { Link, NavGroup, useConfig } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import React from 'react'

import { useBackupTexts } from './backups/texts'
import { useDiagnosticsTexts } from './diagnostics/useDiagnosticsTexts'

function NavLink({ href, id, label }: { href: string; id: string; label: string }) {
  const active = usePathname() === href
  const inner = (
    <>
      {active && <div className="nav__link-indicator" />}
      <span className="nav__link-label">{label}</span>
    </>
  )
  return active ? (
    <div className="nav__link" id={id}>
      {inner}
    </div>
  ) : (
    <Link className="nav__link" href={href} id={id} prefetch={false}>
      {inner}
    </Link>
  )
}

export function MaintenanceNav() {
  const backups = useBackupTexts()
  const diagnostics = useDiagnosticsTexts()
  const { config } = useConfig()
  const admin = config.routes.admin
  return (
    <NavGroup label={backups.group}>
      <NavLink href={`${admin}/backups`} id="nav-backups" label={backups.nav} />
      <NavLink href={`${admin}/diagnostics`} id="nav-diagnostics" label={diagnostics.nav} />
    </NavGroup>
  )
}
