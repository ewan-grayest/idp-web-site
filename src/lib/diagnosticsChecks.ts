/**
 * The live half of the admin's «Диагностика» page: can the site reach its database, are migrations applied,
 * can it write its folders, are the backup tools there, when was the last backup, and what it logged since starting.
 * Each check answers within a few seconds and never throws: a failure is a row on the page.
 */
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { Payload } from 'payload'

import { migrations } from '../migrations'
import { backupDir, listBackups } from './backups'
import { type Check, checkSettings, worstStatus } from './diagnostics'
import { logStartedAt, recentLogs, redact } from './logBuffer'
import { SITE_VERSION } from './version'

const LOW_DISK = 1e9
const OLD_BACKUP_DAYS = 7
const errorText = (e: unknown) => redact(e instanceof Error ? e.message : String(e)).slice(0, 500)

type Pool = { query: (sql: string) => Promise<{ rows: Record<string, unknown>[] }> }

/** Rejects after `ms`, so one stuck check doesn't hold the page */
const within = <T>(ms: number, work: Promise<T>) =>
  Promise.race([work, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`No answer in ${ms / 1000} s`)), ms))])

async function databaseChecks(payload: Payload): Promise<Check[]> {
  const pool = (payload.db as unknown as { pool?: Pool }).pool
  if (!pool) return [{ id: 'database', status: 'error', key: 'dbNoPool' }]
  const started = Date.now()
  let version = ''
  try {
    const { rows } = await within(5000, pool.query("select current_setting('server_version') as v"))
    version = String(rows[0]?.v ?? '')
  } catch (e) {
    return [{ id: 'database', status: 'error', key: 'dbDown', vars: { error: errorText(e) } }]
  }
  const ms = Date.now() - started
  const major = Number(version.split('.')[0])
  const rows: Check[] = [
    major === 16
      ? { id: 'database', status: 'ok', key: 'dbOk', vars: { version, ms } }
      : { id: 'database', status: 'warn', key: 'dbVersion', vars: { version, ms } },
  ]

  // Migrations: production applies them at start; development changes the schema by itself
  if (process.env.NODE_ENV !== 'production') {
    rows.push({ id: 'migrations', status: 'info', key: 'migrationsDev' })
    return rows
  }
  try {
    const { rows: done } = await within(5000, pool.query('select name from payload_migrations'))
    const applied = new Set(done.map((r) => String(r.name)))
    const pending = migrations.map((m) => m.name).filter((n) => !applied.has(n))
    const unknown = [...applied].filter((n) => n !== 'dev' && !migrations.some((m) => m.name === n))
    if (pending.length) rows.push({ id: 'migrations', status: 'error', key: 'migrationsPending', vars: { count: pending.length, names: pending.join(', ') } })
    else if (unknown.length) rows.push({ id: 'migrations', status: 'warn', key: 'migrationsUnknown', vars: { names: unknown.join(', ') } })
    else rows.push({ id: 'migrations', status: 'ok', key: 'migrationsOk', vars: { count: migrations.length, latest: migrations.at(-1)?.name ?? '—' } })
  } catch (e) {
    rows.push({ id: 'migrations', status: 'error', key: 'migrationsUnread', vars: { error: errorText(e) } })
  }
  return rows
}

async function folderCheck(id: string, dir: string): Promise<Check> {
  try {
    // The site makes both folders on first use (the image's start script, the first upload or backup), so do the same
    await fs.mkdir(dir, { recursive: true })
  } catch (e) {
    return { id, status: 'error', key: 'folderMissing', vars: { path: dir, error: errorText(e) } }
  }
  try {
    // Write a file rather than trust the mode bits: a host's disk can be mounted read-only
    const probe = path.join(dir, `.idp-write-test-${process.pid}`)
    await fs.writeFile(probe, '')
    await fs.rm(probe, { force: true })
  } catch (e) {
    return { id, status: 'error', key: 'folderReadOnly', vars: { path: dir, error: errorText(e) } }
  }
  const disk = await fs.statfs(dir).catch(() => null)
  const free = disk ? disk.bavail * disk.bsize : -1
  if (free >= 0 && free < LOW_DISK) return { id, status: 'warn', key: 'diskLow', vars: { path: dir, free } }
  return { id, status: 'ok', key: 'folderOk', vars: { path: dir, free } }
}

/** pg_dump from the image (/opt/pg/bin), or the one on PATH in development; backups need version 16 */
function backupToolsCheck(): Promise<Check> {
  const bin = path.resolve(/*turbopackIgnore: true*/ process.env.PG_BIN_DIR || '/opt/pg/bin')
  const tool = existsSync(path.join(bin, 'pg_dump')) ? path.join(bin, 'pg_dump') : 'pg_dump'
  const env = { ...process.env, LD_LIBRARY_PATH: path.resolve(bin, '../lib') }
  return new Promise((resolve) => {
    execFile(tool, ['--version'], { env, timeout: 5000 }, (error, stdout) => {
      if (error) {
        const missing = (error as NodeJS.ErrnoException).code === 'ENOENT'
        resolve({
          id: 'backupTools',
          status: process.env.NODE_ENV === 'production' ? 'error' : 'warn',
          key: missing ? 'pgDumpMissing' : 'pgDumpBroken',
          vars: { error: errorText(error) },
        })
        return
      }
      const version = stdout.match(/(\d+)(\.\d+)?/)?.[0] ?? stdout.trim()
      resolve(
        Number(version.split('.')[0]) === 16
          ? { id: 'backupTools', status: 'ok', key: 'pgDumpOk', vars: { version } }
          : { id: 'backupTools', status: 'warn', key: 'pgDumpVersion', vars: { version } },
      )
    })
  })
}

async function lastBackupCheck(): Promise<Check> {
  try {
    const made = (await listBackups()).filter((b) => b.valid && b.kind !== 'pre-restore')
    const newest = made[0]
    if (!newest) return { id: 'lastBackup', status: 'warn', key: 'backupNone' }
    const when = (newest.created && Date.parse(newest.created.replace(/([+-]\d\d)(\d\d)$/, '$1:$2'))) || Date.parse(newest.modified)
    const days = Math.floor((Date.now() - when) / 86_400_000)
    return { id: 'lastBackup', status: days > OLD_BACKUP_DAYS ? 'warn' : 'ok', key: 'backupAge', vars: { days, name: newest.name, count: made.length } }
  } catch (e) {
    return { id: 'lastBackup', status: 'warn', key: 'backupUnread', vars: { error: errorText(e) } }
  }
}

function logCheck(): Check {
  const logs = recentLogs()
  const errors = logs.filter((l) => l.level === 'error').length
  const warnings = logs.filter((l) => l.level === 'warn').length
  return { id: 'logs', status: errors ? 'warn' : 'ok', key: 'logSummary', vars: { errors, warnings } }
}

export type Diagnostics = Awaited<ReturnType<typeof runDiagnostics>>

/** Everything the page shows. `openedAt` is the address the admin was opened at */
export async function runDiagnostics(payload: Payload, openedAt?: string) {
  const media = path.resolve(/*turbopackIgnore: true*/ process.env.MEDIA_DIR || 'media')
  const checks = (
    await Promise.all([databaseChecks(payload), folderCheck('mediaDir', media), folderCheck('backupsDir', backupDir()), backupToolsCheck(), lastBackupCheck()])
  ).flat()
  checks.push(logCheck())
  const settings = checkSettings(process.env, { openedAt })
  const memory = process.memoryUsage()
  return {
    status: worstStatus([...checks, ...settings]),
    checkedAt: new Date().toISOString(),
    about: {
      version: SITE_VERSION,
      node: process.version,
      nodeEnv: process.env.NODE_ENV ?? '',
      startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      logsSince: logStartedAt(),
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb: Math.round(memory.rss / 1e6),
      host: os.hostname(),
      platform: `${process.platform} ${process.arch}`,
    },
    checks,
    settings,
    logs: recentLogs(),
  }
}
