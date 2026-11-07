/**
 * /api/v1/diagnostics: the admin's «Диагностика» page. Signed-in admin users only.
 * Settings with secrets blanked out, live checks and the latest log lines, in one answer the page shows and copies.
 */
import type { Endpoint } from 'payload'

import { runDiagnostics } from '../lib/diagnosticsChecks'

/** The address the admin was opened at, as the proxy passed it on */
const openedAt = (headers: Headers) => {
  const host = headers.get('x-forwarded-host')?.split(',')[0]?.trim() || headers.get('host')
  const proto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'http'
  return host ? `${proto}://${host}` : undefined
}

export const diagnosticsEndpoints: Endpoint[] = [
  {
    path: '/diagnostics',
    method: 'get',
    handler: async (req) => {
      const headers = { 'Cache-Control': 'no-store' }
      if (!req.user) return Response.json({ error: 'Sign in to the admin first' }, { status: 401, headers })
      return Response.json(await runDiagnostics(req.payload, openedAt(req.headers)), { headers })
    },
  },
]
