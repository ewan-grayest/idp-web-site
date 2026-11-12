import { describe, expect, it } from 'vitest'
import { duration } from '../../src/lib/backupMessages'
import { isTarFileLine, isToolChatter, isUploadEntry, restoreItems, restoreLine, toolUrl } from '../../src/lib/backups'

describe('what a backup takes from the upload folder', () => {
  it('takes uploaded files and folders', () => {
    for (const name of ['photo.jpg', 'photo-1600x1200.webp', '.hidden-upload.png', 'lost+found.jpg']) expect(isUploadEntry(name)).toBe(true)
  })
  it('leaves out the lost+found of a host disk', () => {
    expect(isUploadEntry('lost+found')).toBe(false)
  })
  it('leaves out what an interrupted restore left behind', () => {
    expect(isUploadEntry('.idp-restore-new-20261108155929')).toBe(false)
    expect(isUploadEntry('.idp-restore-old-20261108155929')).toBe(false)
  })
})

describe('how the backup tools connect', () => {
  it('limits the wait for a database that does not answer, and keeps the address and database swap', () => {
    const url = new URL(toolUrl('postgres://idp:secret@db:5432/idp', 'postgres'))
    expect(url.pathname).toBe('/postgres')
    expect(url.password).toBe('secret')
    expect(url.searchParams.get('connect_timeout')).toBe('15')
    expect(url.searchParams.get('keepalives_idle')).toBe('20')
    expect(url.searchParams.get('tcp_user_timeout')).toBe('60000')
    expect(url.searchParams.get('application_name')).toBe('idp-backups')
  })
  it('keeps what the address already sets, and the managed-database TLS setting the tools accept', () => {
    const url = new URL(toolUrl('postgres://idp:x@db/idp?connect_timeout=5&sslmode=no-verify&uselibpqcompat=true'))
    expect(url.searchParams.get('connect_timeout')).toBe('5')
    expect(url.searchParams.get('sslmode')).toBe('require')
    expect(url.searchParams.has('uselibpqcompat')).toBe(false)
  })
})

describe('progress of pg_restore', () => {
  // pg_restore -l of a small database, as PostgreSQL 16 writes it
  const list = [
    ';',
    '; Archive created at 2026-11-12 20:58:38 UTC',
    ';     TOC Entries: 21',
    ';',
    '216; 1259 16386 TABLE public a idp',
    '3413; 0 0 COMMENT public TABLE a idp',
    '3404; 0 16386 TABLE DATA public a idp',
    '3416; 0 0 SEQUENCE SET public a_id_seq idp',
    '3255; 2606 16393 CONSTRAINT public a a_pkey idp',
    '3259; 2606 16403 FK CONSTRAINT public b b_a_id_fkey idp',
    '3420; 0 0 ACL - SCHEMA public pg_database_owner',
    '3421; 826 16500 DEFAULT ACL - DEFAULT PRIVILEGES FOR TABLES idp',
    '',
  ].join('\n')

  it('counts the objects it will create or fill, without privileges', () => {
    expect(restoreItems(list)).toBe(6)
  })
  it('reads which object it starts on, and in which stage', () => {
    expect(restoreLine('pg_restore: creating TABLE "public.a"')).toEqual({ phase: 'schema', name: 'a' })
    expect(restoreLine('pg_restore: creating COMMENT "public.TABLE a"')).toEqual({ phase: 'schema', name: 'a' })
    expect(restoreLine('pg_restore: processing data for table "public.projects_locales"')).toEqual({ phase: 'data', name: 'projects_locales' })
    expect(restoreLine('pg_restore: executing SEQUENCE SET a_id_seq')).toEqual({ phase: 'data', name: 'a_id_seq' })
    expect(restoreLine('pg_restore: creating CONSTRAINT "public.a a_pkey"')).toEqual({ phase: 'indexes', name: 'a_pkey' })
    expect(restoreLine('pg_restore: creating INDEX "public.b_a_id_idx"')).toEqual({ phase: 'indexes', name: 'b_a_id_idx' })
    expect(restoreLine('pg_restore: creating FK CONSTRAINT "public.b b_a_id_fkey"')).toEqual({ phase: 'indexes', name: 'b_a_id_fkey' })
  })
  it('ignores its other lines', () => {
    expect(restoreLine('pg_restore: connecting to database for restore')).toBeNull()
    expect(restoreLine('pg_restore: error: could not execute query: ERROR:  relation "a" already exists')).toBeNull()
    expect(restoreLine('Command was: CREATE TABLE public.a (')).toBeNull()
  })
  it('keeps errors and warnings for the error message, and only those', () => {
    expect(isToolChatter('pg_restore', 'pg_restore: creating TABLE "public.a"')).toBe(true)
    expect(isToolChatter('pg_dump', 'pg_dump: dumping contents of table "public.a"')).toBe(true)
    expect(isToolChatter('pg_restore', 'pg_restore: error: could not execute query')).toBe(false)
    expect(isToolChatter('pg_restore', 'pg_restore: warning: errors ignored on restore: 1')).toBe(false)
    expect(isToolChatter('pg_restore', 'Command was: CREATE TABLE public.a (')).toBe(false)
  })
})

describe('files tar reports', () => {
  it('counts files, not folders or its own messages', () => {
    expect(isTarFileLine('./photo.jpg')).toBe(true)
    expect(isTarFileLine('./2026/')).toBe(false)
    expect(isTarFileLine('tar: ./lost+found: Cannot open: Permission denied')).toBe(false)
    expect(isTarFileLine('')).toBe(false)
  })
})

describe('elapsed time of a task', () => {
  it('reads as minutes and seconds, with hours from an hour on', () => {
    expect(duration(0)).toBe('0:00')
    expect(duration(59_999)).toBe('0:59')
    expect(duration(61_000)).toBe('1:01')
    expect(duration(3_725_000)).toBe('1:02:05')
    expect(duration(-5)).toBe('0:00')
  })
})
