import { describe, expect, it } from 'vitest'

import { diagnosticsTexts } from '@/components/admin/diagnostics/texts'
import { EXAMPLE_SECRET, checkSettings, worstStatus } from '@/lib/diagnostics'

const good = {
  NODE_ENV: 'production',
  BACKUP_MODE: 'prod',
  PAYLOAD_SECRET: 'a'.repeat(64),
  DATABASE_URI: 'postgres://idp:s3cr3t-pass@db:5432/idp',
  NEXT_PUBLIC_SITE_URL: 'https://example.ru',
  MEDIA_DIR: '/app/media',
  BACKUPS_DIR: '/app/backups',
} as NodeJS.ProcessEnv

const row = (env: NodeJS.ProcessEnv, id: string, openedAt?: string) => checkSettings(env, { openedAt }).find((c) => c.id === id)

describe('settings check', () => {
  it('passes a complete production setup', () => {
    const rows = checkSettings(good, { openedAt: 'https://example.ru' })
    expect(worstStatus(rows)).not.toBe('error')
    expect(rows.filter((r) => r.status === 'warn' || r.status === 'error')).toEqual([])
  })

  it('flags missing required settings as errors', () => {
    expect(row({ ...good, PAYLOAD_SECRET: '' }, 'PAYLOAD_SECRET')).toMatchObject({ status: 'error', key: 'missingRequired' })
    expect(row({ ...good, DATABASE_URI: '' }, 'DATABASE_URI')).toMatchObject({ status: 'error', key: 'missingRequired' })
  })

  it('reads DATABASE_URL when DATABASE_URI is empty', () => {
    expect(row({ ...good, DATABASE_URI: '', DATABASE_URL: good.DATABASE_URI }, 'DATABASE_URL')).toMatchObject({ status: 'ok' })
  })

  it('rejects the example secret and warns about a short one', () => {
    expect(row({ ...good, PAYLOAD_SECRET: EXAMPLE_SECRET }, 'PAYLOAD_SECRET')?.status).toBe('error')
    expect(row({ ...good, PAYLOAD_SECRET: 'short-secret' }, 'PAYLOAD_SECRET')).toMatchObject({ status: 'warn', vars: { length: 12 } })
  })

  it('never shows the secret or the database password', () => {
    const text = JSON.stringify(checkSettings(good))
    expect(text).not.toContain('a'.repeat(64))
    expect(text).not.toContain('s3cr3t-pass')
    expect(row(good, 'DATABASE_URI')?.vars?.value).toBe('postgres://idp:***@db:5432/idp')
  })

  it('rejects an address that is not PostgreSQL', () => {
    expect(row({ ...good, DATABASE_URI: 'mysql://a:b@c/d' }, 'DATABASE_URI')?.key).toBe('dbUriInvalid')
    expect(row({ ...good, DATABASE_URI: 'postgres://a:b@c:5432' }, 'DATABASE_URI')?.key).toBe('dbUriNoName')
  })

  it('checks the site address', () => {
    expect(row({ ...good, NEXT_PUBLIC_SITE_URL: '' }, 'NEXT_PUBLIC_SITE_URL')).toMatchObject({ status: 'warn', key: 'siteUrlMissing' })
    expect(row({ ...good, NODE_ENV: 'development', BACKUP_MODE: '', NEXT_PUBLIC_SITE_URL: '' }, 'NEXT_PUBLIC_SITE_URL')?.status).toBe('info')
    expect(row({ ...good, NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' }, 'NEXT_PUBLIC_SITE_URL')?.key).toBe('siteUrlLocal')
    expect(row({ ...good, NEXT_PUBLIC_SITE_URL: 'example.ru' }, 'NEXT_PUBLIC_SITE_URL')?.key).toBe('siteUrlNoScheme')
    expect(row({ ...good, NEXT_PUBLIC_SITE_URL: 'http://example.ru' }, 'NEXT_PUBLIC_SITE_URL')?.key).toBe('siteUrlHttp')
    expect(row({ ...good, NEXT_PUBLIC_SITE_URL: 'https://exa mple' }, 'NEXT_PUBLIC_SITE_URL')?.key).toBe('siteUrlInvalid')
  })

  it('notices the admin opened at another address, but not at localhost', () => {
    expect(row(good, 'NEXT_PUBLIC_SITE_URL', 'https://new.example.ru')).toMatchObject({ key: 'siteUrlOther', vars: { opened: 'new.example.ru' } })
    expect(row(good, 'NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')?.status).toBe('ok')
  })

  it('wants production in the image', () => {
    expect(row({ ...good, NODE_ENV: 'development' }, 'NODE_ENV')?.status).toBe('error')
    expect(row({ ...good, NODE_ENV: 'development', BACKUP_MODE: '' }, 'NODE_ENV')?.status).toBe('info')
  })

  it('warns about a rotation setting that is not a positive number', () => {
    expect(row({ ...good, KEEP_LAST: 'ten' }, 'KEEP_LAST')).toMatchObject({ status: 'warn', vars: { fallback: 14 } })
    expect(row({ ...good, KEEP_MONTHLY: '0' }, 'KEEP_MONTHLY')?.status).toBe('warn')
    expect(row({ ...good, KEEP_LAST: '30' }, 'KEEP_LAST')?.status).toBe('ok')
  })

  it('picks the worst status', () => {
    expect(worstStatus([])).toBe('ok')
    expect(worstStatus([{ status: 'info' }, { status: 'ok' }])).toBe('info')
    expect(worstStatus([{ status: 'warn' }, { status: 'error' }, { status: 'ok' }])).toBe('error')
  })
})

describe('diagnostics texts', () => {
  it('have a message for every key the settings check uses, in every language', () => {
    const envs: NodeJS.ProcessEnv[] = [
      good,
      {} as NodeJS.ProcessEnv,
      { ...good, PAYLOAD_SECRET: EXAMPLE_SECRET, NEXT_PUBLIC_SITE_URL: 'example.ru', KEEP_LAST: 'x', DISABLE_LOGGING: 'true', NEXT_PUBLIC_PROMO_VIDEO_URL: 'nope' },
    ]
    const keys = new Set(envs.flatMap((env) => checkSettings(env).map((c) => c.key)))
    for (const [lang, t] of Object.entries(diagnosticsTexts)) {
      for (const key of keys) expect(t.messages, `${lang}: ${key}`).toHaveProperty(key)
    }
  })
})
