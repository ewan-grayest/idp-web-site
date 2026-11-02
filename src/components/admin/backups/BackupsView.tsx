/* Admin page /admin/backups: the admin's frame (side menu, header) around the backups panel */
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { BackupsPanel } from './BackupsPanel'

export function BackupsView({ initPageResult, params, searchParams, viewActions }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  if (!req.user) redirect(`${req.payload.config.routes.admin}/login`)
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user}
      // The admin header's own buttons (language, «Открыть сайт», «Выйти»), as on every other admin page
      viewActions={viewActions ?? req.payload.config.admin.components?.actions}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <BackupsPanel />
      </Gutter>
    </DefaultTemplate>
  )
}
