import { afterEach, describe, expect, it } from 'vitest'

import { libpqUrl, normalizeSiteUrl, siteUrl } from '@/lib/hosting'

describe('site address', () => {
  const saved = process.env.NEXT_PUBLIC_SITE_URL
  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = saved
  })

  it('keeps a full address and drops the trailing slash', () => {
    expect(normalizeSiteUrl('https://example.ru/')).toBe('https://example.ru')
    expect(normalizeSiteUrl('http://192.168.1.5:3000')).toBe('http://192.168.1.5:3000')
  })
  it('adds https to a bare domain', () => {
    expect(normalizeSiteUrl('example.ru')).toBe('https://example.ru')
    expect(normalizeSiteUrl(' example.ru:8443 ')).toBe('https://example.ru:8443')
  })
  it('falls back to localhost instead of throwing', () => {
    expect(normalizeSiteUrl()).toBe('http://localhost:3000')
    expect(normalizeSiteUrl('')).toBe('http://localhost:3000')
    expect(normalizeSiteUrl('not a url')).toBe('http://localhost:3000')
  })
  it('is read when called, not frozen at build time', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'one.example'
    expect(siteUrl()).toBe('https://one.example')
    process.env.NEXT_PUBLIC_SITE_URL = 'two.example'
    expect(siteUrl()).toBe('https://two.example')
  })
})

describe('database address for the PostgreSQL tools', () => {
  it('leaves a plain address alone', () => {
    expect(libpqUrl('postgres://idp:p%40ss@db:5432/idp')).toBe('postgres://idp:p%40ss@db:5432/idp')
  })
  it('swaps the database name', () => {
    expect(libpqUrl('postgres://idp:x@db:5432/idp', 'postgres')).toBe('postgres://idp:x@db:5432/postgres')
  })
  it('keeps a socket address when swapping the name', () => {
    expect(libpqUrl('postgres://idp@localhost/idp?host=/run/postgresql', 'postgres')).toBe('postgres://idp@localhost/postgres?host=%2Frun%2Fpostgresql')
  })
  it('turns the driver-only TLS settings into ones the tools accept', () => {
    expect(libpqUrl('postgres://u:x@h/idp?sslmode=no-verify')).toBe('postgres://u:x@h/idp?sslmode=require')
    expect(libpqUrl('postgres://u:x@h/idp?uselibpqcompat=true&sslmode=require')).toBe('postgres://u:x@h/idp?sslmode=require')
    expect(libpqUrl('postgres://u:x@h/idp?sslmode=verify-full')).toBe('postgres://u:x@h/idp?sslmode=verify-full')
  })
})
