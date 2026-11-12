/**
 * The settings half of the admin's «Диагностика» page: which settings are missing, wrong or worth a look.
 * Pure: takes the settings and returns one row per setting. The live checks (database, folders, backups) are in
 * diagnosticsChecks.ts. Each row carries a message key that the page shows in the admin language
 * (src/components/admin/diagnostics/texts.ts), so add a key there with any new one here.
 */
import { normalizeSiteUrl } from './hosting'
import { redact, secretValues } from './logBuffer'

export type Status = 'ok' | 'info' | 'warn' | 'error'
export type Check = {
  /** The setting's name, or the live check's name */
  id: string
  status: Status
  /** Message key, see the page's texts */
  key: string
  vars?: Record<string, string | number>
}

const order: Status[] = ['ok', 'info', 'warn', 'error']
/** The worst status among the rows: what the page's summary shows */
export const worstStatus = (checks: Pick<Check, 'status'>[]): Status =>
  checks.reduce<Status>((worst, c) => (order.indexOf(c.status) > order.indexOf(worst) ? c.status : worst), 'ok')

/** The value from the settings file `.env.example`: a site left with it can have its sessions forged */
export const EXAMPLE_SECRET = 'change-me-to-a-long-random-string'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]'])

type Context = {
  /** The address the admin page was opened at, to compare with NEXT_PUBLIC_SITE_URL */
  openedAt?: string
}

/** One row per setting the site reads, those of "Required settings" in the README first */
export function checkSettings(env: NodeJS.ProcessEnv, ctx: Context = {}): Check[] {
  const get = (name: string) => env[name]?.trim() || ''
  const production = env.NODE_ENV === 'production'
  const inImage = env.BACKUP_MODE === 'prod'
  const rows: Check[] = []

  // PAYLOAD_SECRET: signs admin sessions
  const secret = get('PAYLOAD_SECRET')
  if (!secret) rows.push({ id: 'PAYLOAD_SECRET', status: 'error', key: 'missingRequired' })
  else if (secret === EXAMPLE_SECRET) rows.push({ id: 'PAYLOAD_SECRET', status: 'error', key: 'secretExample' })
  else if (secret.length < 32) rows.push({ id: 'PAYLOAD_SECRET', status: 'warn', key: 'secretShort', vars: { length: secret.length } })
  else rows.push({ id: 'PAYLOAD_SECRET', status: 'ok', key: 'secretOk', vars: { length: secret.length } })

  // DATABASE_URI (the image's start script copies DATABASE_URL into it)
  const dbName = get('DATABASE_URI') ? 'DATABASE_URI' : get('DATABASE_URL') ? 'DATABASE_URL' : 'DATABASE_URI'
  const db = get(dbName)
  if (!db) rows.push({ id: dbName, status: 'error', key: 'missingRequired' })
  else {
    let url: URL | null = null
    try {
      url = new URL(db)
    } catch {}
    const shown = redact(db, secretValues(env))
    if (!url || !/^postgres(ql)?:$/.test(url.protocol)) rows.push({ id: dbName, status: 'error', key: 'dbUriInvalid' })
    else if (!url.pathname.slice(1)) rows.push({ id: dbName, status: 'error', key: 'dbUriNoName', vars: { value: shown } })
    else rows.push({ id: dbName, status: 'ok', key: 'value', vars: { value: shown } })
  }

  // NEXT_PUBLIC_SITE_URL: absolute links, share addresses, the sitemap
  const raw = get('NEXT_PUBLIC_SITE_URL')
  const site = normalizeSiteUrl(raw)
  const siteHost = new URL(site).host
  const openedHost = (() => {
    try {
      return ctx.openedAt ? new URL(ctx.openedAt).host : ''
    } catch {
      return ''
    }
  })()
  const id = 'NEXT_PUBLIC_SITE_URL'
  if (!raw) rows.push({ id, status: production ? 'warn' : 'info', key: 'siteUrlMissing' })
  else if (site === 'http://localhost:3000' && !/localhost:3000/.test(raw)) rows.push({ id, status: 'error', key: 'siteUrlInvalid', vars: { value: raw } })
  else if (production && LOCAL_HOSTS.has(new URL(site).hostname)) rows.push({ id, status: 'warn', key: 'siteUrlLocal', vars: { value: site } })
  else if (!/^[a-z][a-z\d+.-]*:\/\//i.test(raw)) rows.push({ id, status: 'warn', key: 'siteUrlNoScheme', vars: { value: site } })
  else if (openedHost && openedHost !== siteHost && !LOCAL_HOSTS.has(openedHost.replace(/:\d+$/, '')))
    rows.push({ id, status: 'warn', key: 'siteUrlOther', vars: { value: site, opened: openedHost } })
  else if (production && site.startsWith('http:') && !LOCAL_HOSTS.has(new URL(site).hostname))
    rows.push({ id, status: 'warn', key: 'siteUrlHttp', vars: { value: site } })
  else rows.push({ id, status: 'ok', key: 'value', vars: { value: site } })

  // NODE_ENV: the image runs in production mode; development mode is for `npm run dev`
  const nodeEnv = get('NODE_ENV')
  if (production) rows.push({ id: 'NODE_ENV', status: 'ok', key: 'value', vars: { value: nodeEnv } })
  else rows.push({ id: 'NODE_ENV', status: inImage ? 'error' : 'info', key: inImage ? 'nodeEnvImage' : 'nodeEnvDev', vars: { value: nodeEnv || '—' } })

  // Folders: whether they exist and can be written to is a live check
  for (const [name, fallback] of [
    ['MEDIA_DIR', 'media'],
    ['BACKUPS_DIR', 'backups'],
  ]) {
    const value = get(name)
    rows.push(value ? { id: name, status: 'ok', key: 'value', vars: { value } } : { id: name, status: 'info', key: 'defaultUsed', vars: { value: fallback } })
  }

  rows.push({ id: 'BACKUP_MODE', status: 'info', key: env.BACKUP_MODE === 'prod' ? 'backupModeProd' : 'backupModeLocal' })

  // Backup rotation: anything but a positive whole number falls back to the default
  for (const [name, fallback] of [
    ['KEEP_LAST', 14],
    ['KEEP_MONTHLY', 6],
  ] as const) {
    const value = get(name)
    if (!value) rows.push({ id: name, status: 'info', key: 'defaultUsed', vars: { value: fallback } })
    else if (!/^\d+$/.test(value) || Number(value) < 1) rows.push({ id: name, status: 'warn', key: 'numberInvalid', vars: { value, fallback } })
    else rows.push({ id: name, status: 'ok', key: 'value', vars: { value } })
  }

  if (env.DISABLE_LOGGING === 'true') rows.push({ id: 'DISABLE_LOGGING', status: 'warn', key: 'loggingOff' })

  return rows
}
