/**
 * Full backups made and restored by the site itself, for the admin's «Резервные копии» page.
 * Same file format and folder as scripts/backup.sh and scripts/restore.sh (see BACKUP.md), so a backup made
 * either way restores either way. They also share the folder's .lock, so the two never run at once.
 *
 * A backup is one tar: manifest.txt, SHA256SUMS, db.dump (pg_dump custom format), db-counts.txt (rows per table)
 * and media.tar (everything in the upload folder). The PostgreSQL 16 tools come from the postgres:16-alpine image
 * (see Dockerfile), in /opt/pg.
 */
import { spawn } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { migrations } from '../migrations'
import { BackupError, type Message } from './backupMessages'
import { dataDirs } from './dataDirs'
import { libpqUrl } from './hosting'

export const FORMAT_VERSION = '1'
const NAME_RE = /^idp-[A-Za-z0-9_-]+\.tar$/
const REGULAR_RE = (mode: string) => new RegExp(`^idp-${mode}-(\\d{4})-(\\d{2})-\\d{2}_\\d{6}\\.tar$`)
const TABLE_COUNTS_SQL =
  "select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1"
/** Leftovers of an interrupted restore inside the upload folder start with this, and are never backed up */
const MEDIA_TEMP_PREFIX = '.idp-restore-'

// Folders chosen at run time: the ignore comments keep Next.js from bundling the whole project into the server build
export const backupDir = () => path.resolve(/*turbopackIgnore: true*/ dataDirs().backup)
const mediaDir = () => path.resolve(/*turbopackIgnore: true*/ dataDirs().media)
const siteMode = () => (process.env.BACKUP_MODE === 'prod' ? 'prod' : 'local')
const keepLast = () => Number(process.env.KEEP_LAST) || 14
const keepMonthly = () => Number(process.env.KEEP_MONTHLY) || 6

export const isBackupName = (name: string) => NAME_RE.test(name) && !name.includes('/')

// ---------- small helpers ----------

const PG_BIN = path.resolve(/*turbopackIgnore: true*/ process.env.PG_BIN_DIR || '/opt/pg/bin')
const pgEnv = () => ({ ...process.env, LD_LIBRARY_PATH: path.resolve(PG_BIN, '../lib') })
const pgTool = (name: string) => (existsSync(path.join(PG_BIN, name)) ? path.join(PG_BIN, name) : name)

/** Run a program; resolves with stdout, rejects with its stderr */
function run(cmd: string, args: string[], opts: { env?: NodeJS.ProcessEnv } = {}) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(cmd, args, { env: opts.env ?? process.env, stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.stdin.end()
    child.on('error', (e) =>
      reject(new Error((e as NodeJS.ErrnoException).code === 'ENOENT' ? `${cmd} is not installed in the site image` : e.message)),
    )
    child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(err.trim() || `${path.basename(cmd)} exited with ${code}`))))
  })
}

async function sha256(file: string) {
  const hash = createHash('sha256')
  await pipeline(createReadStream(file), hash)
  return hash.digest('hex')
}

const stamp = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}
const isoLocal = (d = new Date()) => {
  const off = -d.getTimezoneOffset()
  const p = (n: number) => String(Math.trunc(Math.abs(n))).padStart(2, '0')
  return `${stamp(d).replace('_', 'T').replace(/T(\d\d)(\d\d)(\d\d)/, 'T$1:$2:$3')}${off >= 0 ? '+' : '-'}${p(off / 60)}${p(off % 60)}`
}

/** Database connection settings from DATABASE_URI; `db` swaps the database name (for the maintenance db and temp copies) */
const dbUrl = (db?: string) => libpqUrl(process.env.DATABASE_URI || '', db)
const dbName = () => decodeURIComponent(new URL(process.env.DATABASE_URI || '').pathname.slice(1))
const ident = (s: string) => `"${s.replace(/"/g, '""')}"`
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`

const psql = (sql: string, db?: string) =>
  run(pgTool('psql'), ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-d', dbUrl(db), '-c', sql], { env: pgEnv() })

const tableCounts = (db?: string) => psql(TABLE_COUNTS_SQL, db)

function parseManifest(text: string) {
  const m: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const i = line.indexOf('=')
    if (i > 0) m[line.slice(0, i)] = line.slice(i + 1)
  }
  return m
}

/** manifest.txt is the first file in every backup: read it from the tar header without unpacking the archive */
async function readManifest(file: string) {
  const fh = await fs.open(file, 'r')
  try {
    const header = Buffer.alloc(512)
    await fh.read(header, 0, 512, 0)
    const name = header.toString('utf8', 0, 100).replace(/\0.*$/s, '')
    const size = parseInt(header.toString('utf8', 124, 136).replace(/\0.*$/s, '').trim(), 8)
    if (name.replace(/^\.\//, '') !== 'manifest.txt' || !(size > 0 && size < 65536)) return null
    const body = Buffer.alloc(size)
    await fh.read(body, 0, size, 512)
    return parseManifest(body.toString('utf8'))
  } finally {
    await fh.close()
  }
}

/** Number of files (not folders) in a tar */
async function tarFileCount(file: string) {
  const list = await run('tar', ['-tf', file])
  return list.split('\n').filter((l) => l && !l.endsWith('/')).length
}

/** Records a task step for the admin page (see backupMessages.ts) */
export type Step = (key: string, vars?: Message['vars']) => void

// ---------- jobs: one at a time, shared with the shell scripts through BACKUP_DIR/.lock ----------

export type JobKind = 'create' | 'verify' | 'restore' | 'upload'
export type Job = {
  id: string
  kind: JobKind
  name?: string
  state: 'running' | 'done' | 'failed' | 'restarting'
  steps: Message[]
  error?: Message
  result?: string
  startedAt: string
  finishedAt?: string
  by?: string
}

type Store = { job: Job | null; checks: Record<string, { ok: boolean; deep: boolean; at: string; note?: Message }> }
const store: Store = ((globalThis as { __idpBackups?: Store }).__idpBackups ??= { job: null, checks: {} })

export const currentJob = () => store.job
export const lastChecks = () => store.checks

const lockDir = () => path.join(backupDir(), '.lock')

async function takeLock() {
  await fs.mkdir(backupDir(), { recursive: true })
  try {
    await fs.mkdir(lockDir())
  } catch {
    // Left by this site's own job that died with the app (no job runs here now): safe to take over
    const owner = await fs.readFile(path.join(lockDir(), 'owner'), 'utf8').catch(() => '')
    if (owner.startsWith('admin ') && store.job?.state !== 'running') {
      await fs.rm(lockDir(), { recursive: true, force: true })
      await fs.mkdir(lockDir())
    } else {
      throw new BackupError('locked')
    }
  }
  await fs.writeFile(path.join(lockDir(), 'owner'), `admin ${process.pid} ${new Date().toISOString()}\n`)
}
const releaseLock = () => fs.rm(lockDir(), { recursive: true, force: true })

const asMessage = (e: unknown): Message =>
  e instanceof BackupError ? { key: e.key, vars: e.vars } : { key: 'tool', vars: { detail: e instanceof Error ? e.message : String(e) } }

/** Start a job in the background; the admin page polls its steps */
export function startJob(kind: JobKind, by: string | undefined, name: string | undefined, work: (step: Step, job: Job) => Promise<string>) {
  if (store.job?.state === 'running' || store.job?.state === 'restarting') throw new BackupError('busy')
  const job: Job = { id: randomBytes(6).toString('hex'), kind, name, state: 'running', steps: [], startedAt: new Date().toISOString(), by }
  store.job = job
  const step: Step = (key, vars) => void job.steps.push({ key, vars })
  ;(async () => {
    try {
      await takeLock()
    } catch (e) {
      job.state = 'failed'
      job.error = asMessage(e)
      job.finishedAt = new Date().toISOString()
      return
    }
    try {
      await cleanLeftovers()
      job.result = await work(step, job)
      if (job.state === 'running') job.state = 'done'
    } catch (e) {
      job.state = 'failed'
      job.error = asMessage(e)
    } finally {
      job.finishedAt = new Date().toISOString()
      await releaseLock().catch(() => {})
    }
  })()
  return job
}

// ---------- list ----------

export type BackupInfo = {
  name: string
  size: number
  modified: string
  kind: 'regular' | 'pre-restore' | 'uploaded' | 'other'
  created?: string
  mode?: string
  tables?: number
  mediaFiles?: number
  settingsIncluded?: boolean
  hasChecksum: boolean
  valid: boolean
}

export async function listBackups(): Promise<BackupInfo[]> {
  await fs.mkdir(backupDir(), { recursive: true })
  const names = (await fs.readdir(backupDir())).filter(isBackupName)
  const out: BackupInfo[] = []
  for (const name of names) {
    const file = path.join(backupDir(), name)
    const st = await fs.stat(file).catch(() => null)
    if (!st?.isFile()) continue
    const m = await readManifest(file).catch(() => null)
    out.push({
      name,
      size: st.size,
      modified: st.mtime.toISOString(),
      kind: /-pre-restore-/.test(name) ? 'pre-restore' : /-uploaded-/.test(name) ? 'uploaded' : /^idp-[a-z]+-\d{4}-/.test(name) ? 'regular' : 'other',
      created: m?.created,
      mode: m?.mode,
      tables: m?.tables ? Number(m.tables) : undefined,
      mediaFiles: m?.media_files ? Number(m.media_files) : undefined,
      settingsIncluded: m?.settings_included === 'yes',
      hasChecksum: existsSync(`${file}.sha256`),
      valid: !!m,
    })
  }
  // Newest first, by when each backup was made (an uploaded one by its original date), else the file's date
  const time = (b: BackupInfo) => (b.created && Date.parse(b.created.replace(/([+-]\d\d)(\d\d)$/, '$1:$2'))) || Date.parse(b.modified)
  return out.sort((a, b) => time(b) - time(a))
}

export const backupPath = (name: string) => {
  if (!isBackupName(name)) throw new BackupError('badName')
  return path.join(backupDir(), name)
}

export async function deleteBackup(name: string) {
  if (store.job?.state === 'running' && store.job.name === name) throw new BackupError('inUse')
  await fs.rm(backupPath(name))
  await fs.rm(`${backupPath(name)}.sha256`, { force: true })
  delete store.checks[name]
}

// ---------- create ----------

export async function createBackup(step: Step, opts: { label?: string; by?: string } = {}) {
  const dir = backupDir()
  const mode = siteMode()
  const name = `idp-${mode}${opts.label ? `-${opts.label}` : ''}-${stamp()}.tar`
  const work = await fs.mkdtemp(path.join(dir, '.work-'))
  try {
    step(opts.label === 'pre-restore' ? 'savingCurrent' : 'savingDb')
    await run(pgTool('pg_dump'), ['-d', dbUrl(), '-Fc', '-Z', '6', '-f', path.join(work, 'db.dump')], { env: pgEnv() })
    const counts = await tableCounts()
    await fs.writeFile(path.join(work, 'db-counts.txt'), counts)
    const pgVersion = (await psql('show server_version')).trim()
    const lastMigration = (
      await psql("select coalesce((select name from payload_migrations where batch > 0 order by id desc limit 1), '')").catch(() => '')
    ).trim()
    const tables = counts.split('\n').filter(Boolean).length

    step('savingMedia')
    await fs.mkdir(mediaDir(), { recursive: true })
    const entries = (await fs.readdir(mediaDir())).filter((e) => !e.startsWith(MEDIA_TEMP_PREFIX))
    const mediaTar = path.join(work, 'media.tar')
    if (entries.length) await run('tar', ['-C', mediaDir(), '-cf', mediaTar, ...entries.map((e) => `./${e}`)])
    else await run('tar', ['-C', mediaDir(), '-cf', mediaTar, '-T', '/dev/null'])
    const mediaFiles = await tarFileCount(mediaTar)

    const manifest = [
      `format=${FORMAT_VERSION}`,
      `created=${isoLocal()}`,
      `mode=${mode}`,
      `host=${os.hostname()}`,
      `postgres=${pgVersion}`,
      `last_migration=${lastMigration}`,
      `tables=${tables}`,
      `media_files=${mediaFiles}`,
      `media_path=${mediaDir()}`,
      `settings_included=no`,
      `made_by=admin${opts.by ? ` ${opts.by}` : ''}`,
      '',
    ].join('\n')
    await fs.writeFile(path.join(work, 'manifest.txt'), manifest)

    step('checksums')
    const files = ['db-counts.txt', 'db.dump', 'manifest.txt', 'media.tar']
    const sums = await Promise.all(files.map(async (f) => `${await sha256(path.join(/*turbopackIgnore: true*/ work, f))}  ${f}`))
    await fs.writeFile(path.join(work, 'SHA256SUMS'), `${sums.join('\n')}\n`)

    const part = path.join(dir, `${name}.part`)
    await run('tar', ['-C', work, '-cf', part, 'manifest.txt', 'SHA256SUMS', 'db.dump', 'db-counts.txt', 'media.tar'])
    await fs.rename(part, path.join(dir, name))
    await fs.chmod(path.join(dir, name), 0o600).catch(() => {})
    await fs.writeFile(path.join(dir, `${name}.sha256`), `${await sha256(path.join(dir, name))}  ${name}\n`, { mode: 0o600 })
    step('saved', { name, tables, files: mediaFiles })

    if (!opts.label) await rotate(step)
    return name
  } finally {
    await fs.rm(work, { recursive: true, force: true })
  }
}

/** Keep the KEEP_LAST newest regular backups plus the newest of each of the last KEEP_MONTHLY months (as backup.sh does) */
async function rotate(step: Step) {
  const re = REGULAR_RE(siteMode())
  const names = (await fs.readdir(backupDir())).filter((n) => re.test(n)).sort().reverse()
  const months = new Set<string>()
  let kept = 0
  for (const n of names) {
    const [, y, mo] = n.match(re)!
    const month = `${y}-${mo}`
    let keep = kept < keepLast()
    if (!months.has(month) && months.size < keepMonthly()) {
      months.add(month)
      keep = true
    }
    if (keep) kept++
    else {
      await fs.rm(path.join(backupDir(), n), { force: true })
      await fs.rm(path.join(backupDir(), `${n}.sha256`), { force: true })
      step('removedOld', { name: n })
    }
  }
}

// ---------- check ----------

type Unpacked = { work: string; manifest: Record<string, string> }

/** Check the outer checksum, unpack and check every file inside; the caller removes `work` */
async function unpackAndCheck(name: string, step: Step): Promise<Unpacked> {
  const file = backupPath(name)
  if (existsSync(`${file}.sha256`)) {
    const want = (await fs.readFile(`${file}.sha256`, 'utf8')).split(/\s+/)[0]
    if (want !== (await sha256(file))) throw new BackupError('damaged')
    step('archiveOk')
  } else step('noSidecar')
  const work = await fs.mkdtemp(path.join(backupDir(), '.work-'))
  try {
    await run('tar', ['-xf', file, '-C', work]).catch(() => {
      throw new BackupError('cannotUnpack')
    })
    const sumsText = await fs.readFile(path.join(work, 'SHA256SUMS'), 'utf8').catch(() => '')
    const manifestText = await fs.readFile(path.join(work, 'manifest.txt'), 'utf8').catch(() => '')
    if (!sumsText || !manifestText) throw new BackupError('notBackup')
    for (const line of sumsText.split('\n').filter(Boolean)) {
      const [sum, f] = line.split(/\s+/)
      if (!f || f.includes('/') || !existsSync(path.join(work, f))) throw new BackupError('missingFile', { file: f ?? '?' })
      if ((await sha256(path.join(work, f))) !== sum) throw new BackupError('damagedFile', { file: f })
    }
    step('insideOk')
    const manifest = parseManifest(manifestText)
    const listed = await tarFileCount(path.join(work, 'media.tar'))
    if (String(listed) !== manifest.media_files) throw new BackupError('mediaCount', { got: listed, want: manifest.media_files })
    step('mediaReadable', { files: listed })
    return { work, manifest }
  } catch (e) {
    await fs.rm(work, { recursive: true, force: true })
    throw e
  }
}

/** Restore the dump into a new database `db` and compare every table's rows with the backup */
async function loadIntoNewDatabase(u: Unpacked, db: string, step: Step) {
  await psql(`create database ${ident(db)}`, 'postgres')
  await run(pgTool('pg_restore'), ['-d', dbUrl(db), '--no-owner', '--no-privileges', '--exit-on-error', path.join(u.work, 'db.dump')], {
    env: pgEnv(),
  }).catch((e) => {
    throw new BackupError('dumpBad', { detail: (e as Error).message.split('\n').slice(-3).join(' ') })
  })
  const want = await fs.readFile(path.join(u.work, 'db-counts.txt'), 'utf8')
  const got = await tableCounts(db)
  if (want.trim() !== got.trim()) throw new BackupError('countsDiffer')
  step('dbLoads', { tables: want.split('\n').filter(Boolean).length })
}

const dropDatabase = (db: string) => psql(`drop database if exists ${ident(db)} with (force)`, 'postgres')

export async function verifyBackup(name: string, deep: boolean, step: Step) {
  let u: Unpacked | null = null
  const temp = `${dbName()}_check_${randomBytes(3).toString('hex')}`
  try {
    u = await unpackAndCheck(name, step)
    if (deep) {
      step('testLoad')
      try {
        await loadIntoNewDatabase(u, temp, step)
      } finally {
        await dropDatabase(temp).catch(() => {})
      }
    }
    store.checks[name] = { ok: true, deep, at: new Date().toISOString() }
    return 'Backup OK'
  } catch (e) {
    store.checks[name] = { ok: false, deep, at: new Date().toISOString(), note: asMessage(e) }
    throw e
  } finally {
    if (u) await fs.rm(u.work, { recursive: true, force: true })
  }
}

// ---------- restore ----------

/** The site's own connection pool (payload.db.pool) */
export type DbPool = { on: (event: 'error', fn: (e: Error) => void) => unknown }

async function moveInto(from: string, to: string, skip: (n: string) => boolean = () => false) {
  for (const entry of await fs.readdir(from)) {
    if (skip(entry)) continue
    await fs.rename(path.join(from, entry), path.join(to, entry))
  }
}

/**
 * Replace the database and the upload folder with a backup. Everything is prepared beside the live site first
 * (a new database, a hidden folder of files) and checked; only then are they swapped in, within seconds.
 * The app then restarts itself (Docker starts it again), so nothing keeps old data in memory and newer migrations apply.
 */
export async function restoreBackup(
  name: string,
  step: Step,
  job: Job,
  opts: { by?: string; pool?: DbPool } = {},
) {
  const { by } = opts
  const live = dbName()
  const id = stamp().replace('_', '').replace(/-/g, '')
  const fresh = `${live}_restore_${id}`
  const old = `${live}_before_${id}`
  const media = mediaDir()
  const staging = path.join(media, `${MEDIA_TEMP_PREFIX}new-${id}`)
  const parked = path.join(media, `${MEDIA_TEMP_PREFIX}old-${id}`)
  let u: Unpacked | null = null
  let swapped = false
  try {
    step('checking', { name })
    u = await unpackAndCheck(name, step)
    const lastMigration = u.manifest.last_migration
    if (lastMigration && lastMigration !== 'dev' && !migrations.some((m) => m.name === lastMigration)) {
      throw new BackupError('newerCode', { migration: lastMigration })
    }

    const hasTables = (await psql("select count(*) from information_schema.tables where table_schema = 'public'")).trim() !== '0'
    if (hasTables) {
      const safety = await createBackup(step, { label: 'pre-restore', by })
      step('currentSaved', { name: safety })
    }

    step('loadingNew')
    await dropDatabase(fresh).catch(() => {})
    await loadIntoNewDatabase(u, fresh, step)

    step('unpackingMedia')
    await fs.mkdir(staging, { recursive: true })
    await run('tar', ['-xf', path.join(u.work, 'media.tar'), '-C', staging])
    const unpacked = (await run('find', [staging, '-type', 'f'])).split('\n').filter(Boolean).length
    if (String(unpacked) !== u.manifest.media_files) throw new BackupError('mediaCount', { got: unpacked, want: u.manifest.media_files })

    step('switching')
    // The site's own idle database connections are cut next; without a listener their error would crash the app
    opts.pool?.on('error', () => {})
    await psql(`alter database ${ident(live)} with allow_connections false`, 'postgres')
    let renamed = false
    for (let i = 0; i < 20 && !renamed; i++) {
      await psql(`select pg_terminate_backend(pid) from pg_stat_activity where datname = ${lit(live)} and pid <> pg_backend_pid()`, 'postgres')
      renamed = await psql(`alter database ${ident(live)} rename to ${ident(old)}`, 'postgres').then(
        () => true,
        () => false,
      )
      if (!renamed) await new Promise((r) => setTimeout(r, 250))
    }
    if (!renamed) {
      await psql(`alter database ${ident(live)} with allow_connections true`, 'postgres').catch(() => {})
      throw new BackupError('dbBusy')
    }
    try {
      await psql(`alter database ${ident(fresh)} rename to ${ident(live)}`, 'postgres')
    } catch (e) {
      // Put the old database back so the site keeps working
      await psql(`alter database ${ident(old)} rename to ${ident(live)}`, 'postgres').catch(() => {})
      await psql(`alter database ${ident(live)} with allow_connections true`, 'postgres').catch(() => {})
      throw e
    }
    swapped = true

    await fs.mkdir(parked, { recursive: true })
    await moveInto(media, parked, (n) => n.startsWith(MEDIA_TEMP_PREFIX))
    await moveInto(staging, media)
    step('restored', { tables: u.manifest.tables, files: unpacked })

    await fs.rm(staging, { recursive: true, force: true })
    await fs.rm(parked, { recursive: true, force: true })
    await dropDatabase(old).catch(() => {})

    if (process.env.NODE_ENV === 'production') {
      step('restarting')
      job.state = 'restarting'
      // Give the admin page a moment to read this, then exit; Docker (restart: unless-stopped) starts the site again
      setTimeout(() => process.exit(0), 3000)
    } else step('restartDev')
    return 'Restore finished'
  } catch (e) {
    if (!swapped) {
      await dropDatabase(fresh).catch(() => {})
      await fs.rm(staging, { recursive: true, force: true }).catch(() => {})
    }
    throw e
  } finally {
    if (u) await fs.rm(u.work, { recursive: true, force: true })
  }
}

// ---------- upload ----------

/** Save a backup file sent from the admin page; it is checked as it would be for a restore */
export async function saveUpload(body: ReadableStream<Uint8Array>, originalName: string) {
  const dir = backupDir()
  await fs.mkdir(dir, { recursive: true })
  const temp = path.join(dir, `.upload-${randomBytes(4).toString('hex')}`)
  try {
    await pipeline(Readable.fromWeb(body as import('node:stream/web').ReadableStream), createWriteStream(temp, { mode: 0o600 }))
    const m = await readManifest(temp)
    if (!m) throw new BackupError('notBackupUpload')
    const base = path.basename(originalName)
    let name = `idp-${m.mode === 'prod' ? 'prod' : 'local'}-uploaded-${stamp()}.tar`
    if (isBackupName(base) && /\d{4}-\d{2}-\d{2}_\d{6}\.tar$/.test(base) && !existsSync(path.join(dir, base))) name = base
    // Never replace a file already there (two uploads in the same second)
    for (let n = 2; existsSync(path.join(dir, name)); n++) name = name.replace(/(-\d+)?\.tar$/, `-${n}.tar`)
    await fs.rename(temp, path.join(dir, name))
    await fs.writeFile(path.join(dir, `${name}.sha256`), `${await sha256(path.join(dir, name))}  ${name}\n`, { mode: 0o600 })
    return name
  } finally {
    await fs.rm(temp, { force: true })
  }
}

export const backupSettings = () => ({
  folder: process.env.BACKUPS_HOST_LABEL || (siteMode() === 'prod' ? 'deploy/backups' : 'backups'),
  mode: siteMode(),
  keepLast: keepLast(),
  keepMonthly: keepMonthly(),
  restartsAfterRestore: process.env.NODE_ENV === 'production',
})

/**
 * Unpacked files of a restore the app did not live to finish. A folder of parked old files (…old-…) is left alone:
 * it holds real uploads and is never backed up, so nothing is lost.
 */
async function cleanLeftovers() {
  const media = mediaDir()
  const entries = await fs.readdir(media).catch(() => [] as string[])
  for (const e of entries.filter((n) => n.startsWith(`${MEDIA_TEMP_PREFIX}new-`))) {
    await fs.rm(path.join(media, e), { recursive: true, force: true }).catch(() => {})
  }
  for (const e of (await fs.readdir(backupDir()).catch(() => [] as string[])).filter((n) => n.startsWith('.work-'))) {
    await fs.rm(path.join(backupDir(), e), { recursive: true, force: true }).catch(() => {})
  }
}
