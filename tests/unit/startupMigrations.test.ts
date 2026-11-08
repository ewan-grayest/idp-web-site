import { describe, expect, it } from 'vitest'

import { alreadyDone, errorCode, splitStatements, worthRetrying } from '@/lib/startupMigrations'
import * as personalDataLaw from '@/migrations/20261107_192830_personal_data_law'

const pgError = (code: string) => Object.assign(new Error(`pg ${code}`), { code })

describe('startup migrations', () => {
  it('splits SQL at semicolons but not inside quotes, dollar-quoted bodies or comments', () => {
    const text = `
      CREATE TYPE "public"."e" AS ENUM('a;b', 'it''s');
      ALTER TABLE "x;y" ADD COLUMN "c" boolean DEFAULT true; -- a comment; with a semicolon
      DO $$ BEGIN ALTER TABLE "t" ADD CONSTRAINT "k" CHECK (true); EXCEPTION WHEN duplicate_object THEN null; END $$;
      /* block; comment */ CREATE INDEX "i" ON "t" USING btree ("c");
    `
    expect(splitStatements(text)).toEqual([
      `CREATE TYPE "public"."e" AS ENUM('a;b', 'it''s')`,
      `ALTER TABLE "x;y" ADD COLUMN "c" boolean DEFAULT true`,
      `-- a comment; with a semicolon\n      DO $$ BEGIN ALTER TABLE "t" ADD CONSTRAINT "k" CHECK (true); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `/* block; comment */ CREATE INDEX "i" ON "t" USING btree ("c")`,
    ])
  })

  it('splits a real migration into its statements', async () => {
    const queries: unknown[] = []
    await personalDataLaw.up({ db: { execute: async (q: unknown) => queries.push(q) } } as never)
    const raw = (queries[0] as { queryChunks: { value: string[] }[] }).queryChunks.map((c) => c.value.join('')).join('')
    const statements = splitStatements(raw)
    expect(statements[0]).toBe(`CREATE TYPE "public"."enum_consents_purpose" AS ENUM('personal-data', 'publication', 'cookies')`)
    expect(statements).toContain('ALTER TABLE "reviews" ADD COLUMN "publication_consent" boolean DEFAULT false')
    expect(statements.every((s) => !s.includes(';'))).toBe(true)
    expect(statements.length).toBe(raw.split(';').filter((s) => s.trim()).length)
  })

  it('finds the PostgreSQL error code, also when the database layer wrapped the error', () => {
    expect(errorCode(pgError('42P07'))).toBe('42P07')
    expect(errorCode(new Error('Failed query', { cause: pgError('42701') }))).toBe('42701')
    expect(errorCode(new Error('no code'))).toBeUndefined()
  })

  it('skips only what development already did', () => {
    expect(alreadyDone(pgError('42P07'), 'CREATE TABLE "consents" ()')).toBe(true)
    expect(alreadyDone(pgError('42710'), 'CREATE TYPE "e" AS ENUM()')).toBe(true)
    expect(alreadyDone(pgError('42701'), 'ALTER TABLE "projects" ADD COLUMN "home_show_name" boolean')).toBe(true)
    // Something missing is fine when removing it, not when building on it
    expect(alreadyDone(pgError('42703'), 'ALTER TABLE "projects" DROP COLUMN "old"')).toBe(true)
    expect(alreadyDone(pgError('42P01'), 'ALTER TABLE "missing" ADD COLUMN "c" boolean')).toBe(false)
    // Real problems are never skipped
    expect(alreadyDone(pgError('23505'), 'CREATE UNIQUE INDEX "u" ON "t" ("c")')).toBe(false)
    expect(alreadyDone(new Error('connection refused'), 'CREATE TABLE "t" ()')).toBe(false)
  })

  it('retries a migration only when the database already had part of it', () => {
    expect(worthRetrying(new Error('Failed query', { cause: pgError('42710') }))).toBe(true)
    expect(worthRetrying(pgError('42601'))).toBe(false)
    expect(worthRetrying(new Error('timeout'))).toBe(false)
  })
})
