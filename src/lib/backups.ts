/**
 * Full backups made and restored by the site itself, for the admin's «Резервные копии» page.
 * Same file format and folder as scripts/backup.sh and scripts/restore.sh (see BACKUP.md), so a backup made
 * either way restores either way. They also share the folder's .lock, so the two never run at once.
 *
 * A backup is one tar: manifest.txt, SHA256SUMS, db.dump (pg_dump custom format), db-counts.txt (rows per table)
 * and media.tar (everything in the upload folder). The PostgreSQL 16 tools come from the postgres:16-alpine image
 * (see Dockerfile), in /opt/pg.
 *
 * No step waits forever: every connection has time limits (toolUrl), a program that reports nothing for QUIET_LIMIT_MS
 * is stopped, and a running task can be stopped from the page until a restore starts switching the site.
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
import { BackupError, messageText, type Message } from './backupMessages'
import { dataDirs } from './dataDirs'
import { libpqUrl } from './hosting'

export const FORMAT_VERSION = '1'
const NAME_RE = /^idp-[A-Za-z0-9_-]+\.tar$/
const REGULAR_RE = (mode: string) => new RegExp(`^idp-${mode}-(\\d{4})-(\\d{2})-\\d{2}_\\d{6}\\.tar$`)
const TABLE_COUNTS_SQL =
  "select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1"
/** Leftovers of an interrupted restore inside the upload folder start with this, and are never backed up */
const MEDIA_TEMP_PREFIX = '.idp-restore-'

/**
 * Whether an entry at the top of the upload folder is the site's own: never a restore's leftovers, nor the lost+found
 * a host's disk can have at its root. That one can be root's only, and a host that runs the image as another user
 * then could neither read it into a backup ("tar: ./lost+found: Permission denied") nor move it aside in a restore.
 */
export const isUploadEntry = (name: string) => !name.startsWith(MEDIA_TEMP_PREFIX) && name !== 'lost+found'

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

// ---------- limits: no step waits forever ----------

/**
 * A program that writes nothing for this long is stopped, and the task fails naming it. pg_dump, pg_restore and tar run
 * verbose, so they report every table, index and file; psql reports when its one command is done. Ten minutes is far
 * beyond the largest table or video of this site on a slow disk, and short enough that a stuck task ends by itself.
 */
export const QUIET_LIMIT_MS = 10 * 60_000

/**
 * libpq settings for every connection the backup tools make. Without them a connection to a database container that
 * went away (restarted, out of memory, moved by the host) waits for an answer for hours: libpq has no connect timeout of
 * its own, and the system's TCP keepalive starts after two hours. With them a lost database is noticed within a minute
 * or two. The name shows the tools' sessions in pg_stat_activity. A setting already in DATABASE_URI wins.
 */
const TOOL_CONNECTION: Record<string, string> = {
  connect_timeout: '15',
  keepalives: '1',
  keepalives_idle: '20',
  keepalives_interval: '5',
  keepalives_count: '6',
  tcp_user_timeout: '60000',
  application_name: 'idp-backups',
}

/** The database address for the PostgreSQL tools, with TOOL_CONNECTION's limits; `db` swaps the database name */
export function toolUrl(uri: string, db?: string) {
  const url = new URL(libpqUrl(uri, db))
  for (const [key, value] of Object.entries(TOOL_CONNECTION)) if (!url.searchParams.has(key)) url.searchParams.set(key, value)
  return url.toString()
}

/** A statement of psql that waits this long for a lock fails with PostgreSQL's own message instead of waiting on */
const LOCK_LIMIT = '60s'

type RunOptions = {
  env?: NodeJS.ProcessEnv
  /** Each line the program writes, on either stream. Return true for a progress line, to keep it out of an error's text */
  onLine?: (line: string) => boolean | void
  /** Clean-up that must run after the task was stopped from the page: the «Stop» button does not end it */
  uncancellable?: boolean
}

/**
 * Run a program; resolves with stdout, rejects with its stderr. Stopped (SIGTERM, then SIGKILL) when it writes nothing
 * for QUIET_LIMIT_MS, or when the task is stopped from the page.
 */
function run(cmd: string, args: string[], opts: RunOptions = {}) {
  const tool = path.basename(cmd)
  const signal = opts.uncancellable ? undefined : store.controller?.signal
  return new Promise<string>((resolve, reject) => {
    if (signal?.aborted) return reject(new BackupError('cancelled'))
    const child = spawn(cmd, args, { env: opts.env ?? process.env, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    let stopped: BackupError | null = null
    const stop = (reason: BackupError) => {
      if (stopped) return
      stopped = reason
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 5000).unref()
    }
    let quiet: NodeJS.Timeout | undefined
    const awake = () => {
      clearTimeout(quiet)
      quiet = setTimeout(() => stop(new BackupError('stalled', { tool, minutes: QUIET_LIMIT_MS / 60_000 })), QUIET_LIMIT_MS)
    }
    awake()
    const onAbort = () => stop(new BackupError('cancelled'))
    signal?.addEventListener('abort', onAbort, { once: true })
    // Whole lines to onLine. All of stdout is the result; stderr's other lines, the last 16 KB of them, are the error
    const rest = { out: '', err: '' }
    const read = (stream: 'out' | 'err') => (chunk: Buffer) => {
      awake()
      if (stream === 'out') out += chunk
      const parts = (rest[stream] + chunk).split('\n')
      rest[stream] = parts.pop() ?? ''
      for (const line of parts) {
        if (!opts.onLine?.(line) && stream === 'err') err = (err + line + '\n').slice(-16384)
      }
    }
    child.stdout.on('data', read('out'))
    child.stderr.on('data', read('err'))
    const done = () => {
      clearTimeout(quiet)
      signal?.removeEventListener('abort', onAbort)
      err += rest.err
    }
    child.on('error', (e) => {
      done()
      reject(new Error((e as NodeJS.ErrnoException).code === 'ENOENT' ? `${cmd} is not installed in the site image` : e.message))
    })
    child.on('close', (code, sig) => {
      done()
      if (stopped) reject(stopped)
      else if (code === 0) resolve(out)
      else reject(new Error(err.trim() || `${tool} exited with ${code ?? sig}`))
    })
  })
}

async function sha256(file: string) {
  const hash = createHash('sha256')
  await pipeline(createReadStream(file), hash, { signal: store.controller?.signal })
  return hash.digest('hex')
}

/** Bytes as a short size, for messages */
const sizeText = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(n / 1e6))} MB`)

/**
 * Stops before a step that would fill a disk, instead of failing with it full after minutes of work.
 * Some room is kept on top, for the site's own writes meanwhile.
 */
async function ensureSpace(dir: string, bytes: number) {
  const disk = await fs.statfs(dir).catch(() => null)
  if (!disk) return
  const free = disk.bavail * disk.bsize
  const need = bytes + 100e6
  if (free < need) throw new BackupError('noSpace', { folder: dir, need: sizeText(need), free: sizeText(free) })
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
const dbUrl = (db?: string) => toolUrl(process.env.DATABASE_URI || '', db)
const dbName = () => decodeURIComponent(new URL(process.env.DATABASE_URI || '').pathname.slice(1))
const ident = (s: string) => `"${s.replace(/"/g, '""')}"`
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`

/** One SQL command. Each -c is its own transaction, as CREATE and DROP DATABASE need */
const psql = (sql: string, db?: string, opts: RunOptions = {}) =>
  run(pgTool('psql'), ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-d', dbUrl(db), '-c', `set lock_timeout = '${LOCK_LIMIT}'`, '-c', sql], {
    env: pgEnv(),
    ...opts,
  })

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

/** A line `tar -v` writes for a file (not a folder, nor one of its own messages) */
export const isTarFileLine = (line: string) => !!line && !line.endsWith('/') && !line.startsWith('tar: ')

/** A verbose report of pg_dump or pg_restore, as opposed to its errors and warnings, which an error message keeps */
export const isToolChatter = (tool: string, line: string) =>
  line.startsWith(`${tool}: `) && !/^[^:]+: (error|warning|detail|hint|fatal):/.test(line)

/** How many objects pg_restore will create or fill, from its list (`pg_restore -l`); privileges are left out (--no-privileges) */
export function restoreItems(list: string) {
  return list.split('\n').filter((l) => /^\d+;/.test(l) && !/^\d+; \d+ \d+ (DEFAULT )?ACL /.test(l)).length
}

export type RestoreItem = { phase: 'schema' | 'data' | 'indexes'; name: string }

/**
 * The object a line of `pg_restore -v` starts on, or null for its other lines. Tables and types come first, then each
 * table's rows, then the indexes and the links between tables (constraints), which can take as long as the rows.
 */
export function restoreLine(line: string): RestoreItem | null {
  const unqualified = (name: string) => name.replace(/^[^ ."]+\./, '').split(' ').pop() || name
  const data = line.match(/^pg_restore: processing data for table "(.+)"$/)
  if (data) return { phase: 'data', name: unqualified(data[1]) }
  const executing = line.match(/^pg_restore: executing (.+) (\S+)$/)
  if (executing) return { phase: 'data', name: unqualified(executing[2]) }
  const creating = line.match(/^pg_restore: creating (.+?) "(.+)"$/)
  if (!creating) return null
  const late = /^(INDEX|CONSTRAINT|FK CONSTRAINT|CHECK CONSTRAINT|TRIGGER|RULE|POLICY|INDEX ATTACH|MATERIALIZED VIEW DATA)$/
  return { phase: late.test(creating[1]) ? 'indexes' : 'schema', name: unqualified(creating[2]) }
}

/** Records a task step for the admin page (see backupMessages.ts) */
export type Step = (key: string, vars?: Message['vars']) => void

// ---------- jobs: one at a time, shared with the shell scripts through BACKUP_DIR/.lock ----------

export type JobKind = 'create' | 'verify' | 'restore' | 'upload'
export type Job = {
  id: string
  kind: JobKind
  name?: string
  state: 'running' | 'done' | 'failed' | 'cancelled' | 'restarting'
  steps: Message[]
  /** How the current step is getting on (a percentage, the table or file count), shown under the steps */
  detail?: Message
  error?: Message
  result?: string
  startedAt: string
  finishedAt?: string
  /** «Stop» works now: until a restore starts switching the site */
  cancellable: boolean
  /** «Stop» was pressed; the running program is being ended */
  stopping?: boolean
  by?: string
}

type Store = {
  job: Job | null
  checks: Record<string, { ok: boolean; deep: boolean; at: string; note?: Message }>
  /** Ends the running task's programs when «Stop» is pressed */
  controller?: AbortController
}
const store: Store = ((globalThis as { __idpBackups?: Store }).__idpBackups ??= { job: null, checks: {} })

export const currentJob = () => store.job
export const lastChecks = () => store.checks

/** How the current step is getting on; replaced by the next one and cleared by the next step */
const progress: Step = (key, vars) => {
  if (store.job?.state === 'running') store.job.detail = { key, vars }
}

const stopWanted = () => !!store.controller?.signal.aborted

/** From here on the task can't be stopped: a restore is switching the site, and ends with either data in place */
function noWayBack(job: Job) {
  job.cancellable = false
  if (stopWanted()) throw new BackupError('cancelled')
}

/** «Stop» on the page: ends the task's running program; the task then cleans up and ends as stopped */
export function cancelJob(id: string) {
  const job = store.job
  if (!job || job.id !== id || job.state !== 'running') throw new BackupError('notRunning')
  if (!job.cancellable) throw new BackupError('tooLate')
  job.stopping = true
  store.controller?.abort()
  return job
}

const lockDir = () => path.join(backupDir(), '.lock')

async function takeLock() {
  await fs.mkdir(backupDir(), { recursive: true })
  try {
    await fs.mkdir(lockDir())
  } catch {
    // Left by an admin task that died with its site process: safe to take over. startJob runs one task at a time and
    // the site runs as one copy, so an admin lock is never another task's that is still running. (This used to also
    // require that no task ran here, but the task taking the lock is one, so a leftover lock blocked every task.)
    // A script's lock has no owner file and stays: the script may still be running
    const owner = await fs.readFile(path.join(lockDir(), 'owner'), 'utf8').catch(() => '')
    if (owner.startsWith('admin ')) {
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

/**
 * Start a job in the background; the admin page polls its steps. Each step also goes to the log, so the «Диагностика»
 * page and the host's log show how far a task got.
 */
export function startJob(kind: JobKind, by: string | undefined, name: string | undefined, work: (step: Step, job: Job) => Promise<string>) {
  if (store.job?.state === 'running' || store.job?.state === 'restarting') throw new BackupError('busy')
  const job: Job = {
    id: randomBytes(6).toString('hex'),
    kind,
    name,
    state: 'running',
    steps: [],
    startedAt: new Date().toISOString(),
    cancellable: true,
    by,
  }
  const controller = new AbortController()
  store.job = job
  store.controller = controller
  const label = `Backups (${kind}${name ? ` ${name}` : ''})`
  const step: Step = (key, vars) => {
    job.steps.push({ key, vars })
    job.detail = undefined
    console.info(`${label}: ${messageText({ key, vars })}`)
  }
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
      // Stopped from the page: whichever error the ended program left, the task simply stopped
      job.state = controller.signal.aborted ? 'cancelled' : 'failed'
      job.error = controller.signal.aborted ? { key: 'cancelled' } : asMessage(e)
      console[controller.signal.aborted ? 'warn' : 'error'](`${label}: ${messageText(job.error)}`)
    } finally {
      job.detail = undefined
      job.cancellable = false
      job.finishedAt = new Date().toISOString()
      // A stopped task's signal would otherwise also stop what runs outside tasks, such as an upload's checksum
      if (store.controller === controller) store.controller = undefined
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
  const part = path.join(dir, `${name}.part`)
  try {
    step(opts.label === 'pre-restore' ? 'savingCurrent' : 'savingDb')
    // Verbose, so it reports each table: the page shows which one, and a pg_dump gone quiet is noticed (run)
    await run(pgTool('pg_dump'), ['-v', '-d', dbUrl(), '-Fc', '-Z', '6', '-f', path.join(work, 'db.dump')], {
      env: pgEnv(),
      onLine: (line) => {
        const table = line.match(/^pg_dump: dumping contents of table "(?:[^".]+\.)?(.+)"$/)
        if (table) progress('dumpProgress', { name: table[1] })
        return isToolChatter('pg_dump', line)
      },
    })
    const counts = await tableCounts()
    await fs.writeFile(path.join(work, 'db-counts.txt'), counts)
    const pgVersion = (await psql('show server_version')).trim()
    const lastMigration = (
      await psql("select coalesce((select name from payload_migrations where batch > 0 order by id desc limit 1), '')").catch(() => '')
    ).trim()
    const tables = counts.split('\n').filter(Boolean).length

    step('savingMedia')
    await fs.mkdir(mediaDir(), { recursive: true })
    const entries = (await fs.readdir(mediaDir())).filter(isUploadEntry)
    const mediaTar = path.join(work, 'media.tar')
    let saved = 0
    if (entries.length) {
      await run('tar', ['-C', mediaDir(), '-cvf', mediaTar, ...entries.map((e) => `./${e}`)], {
        onLine: (line) => {
          if (isTarFileLine(line)) progress('filesProgress', { done: ++saved })
          return !line.startsWith('tar: ')
        },
      })
    }
    // No uploads yet, as on a new host before the first restore, whose safety backup lands here. The image's BusyBox
    // tar refuses to write an archive with nothing in it ("tar: empty archive"), so write the empty archive itself:
    // the end-of-archive zero blocks, padded to one 10 KiB record, which every tar lists and unpacks as empty
    else await fs.writeFile(mediaTar, Buffer.alloc(10240))
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

    await run('tar', ['-C', work, '-cf', part, 'manifest.txt', 'SHA256SUMS', 'db.dump', 'db-counts.txt', 'media.tar'])
    const sum = await sha256(part)
    if (stopWanted()) throw new BackupError('cancelled')
    await fs.rename(part, path.join(dir, name))
    await fs.chmod(path.join(dir, name), 0o600).catch(() => {})
    await fs.writeFile(path.join(dir, `${name}.sha256`), `${sum}  ${name}\n`, { mode: 0o600 })
    step('saved', { name, tables, files: mediaFiles })

    if (!opts.label) await rotate(step)
    return name
  } finally {
    await fs.rm(work, { recursive: true, force: true })
    // A backup stopped or failed while being written: its unfinished file would only take space
    await fs.rm(part, { force: true })
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
  // Unpacked beside the backups, as big as the backup itself
  await ensureSpace(backupDir(), (await fs.stat(file)).size)
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

/**
 * A restore and a full check each make a database of their own. Says so at once when the database account can't,
 * rather than after minutes of work: the account needs CREATEDB, and the maintenance database `postgres`.
 */
async function checkCanCreateDatabases() {
  const can = (await psql('select rolsuper or rolcreatedb from pg_roles where rolname = current_user')).trim()
  if (can !== 't') throw new BackupError('noCreateDb')
  await psql('select 1', 'postgres').catch((e) => {
    if (e instanceof BackupError) throw e
    throw new BackupError('noMaintenanceDb', { detail: (e as Error).message.split('\n')[0] })
  })
}

/**
 * While pg_restore has reported nothing for a minute or more, logs what its database session is doing each minute:
 * waiting for a lock or the disk, or no session at all (the connection is gone). The «Диагностика» page and the host's
 * log then tell a slow restore from a stuck one.
 */
function watchSession(db: string, lastLine: () => number) {
  let asking = false
  const timer = setInterval(async () => {
    const quiet = Math.round((Date.now() - lastLine()) / 1000)
    if (quiet < 60 || asking) return
    asking = true
    const sql = `select coalesce(string_agg(format('%s, waiting for %s %s, for %ss: %s', state, coalesce(wait_event_type, 'nothing'), wait_event, extract(epoch from now() - query_start)::int, left(query, 100)), '; '), 'none') from pg_stat_activity where datname = ${lit(db)}`
    const what = await psql(sql, 'postgres', { uncancellable: true }).catch((e) => `unknown (${(e as Error).message.split('\n')[0]})`)
    asking = false
    console.warn(`Backups: pg_restore has reported nothing for ${quiet} s. Its database session: ${what.trim()}`)
  }, 60_000)
  return () => clearInterval(timer)
}

/** Restore the dump into a new database `db` and compare every table's rows with the backup */
async function loadIntoNewDatabase(u: Unpacked, db: string, step: Step) {
  await psql(`create database ${ident(db)}`, 'postgres')
  const dump = path.join(u.work, 'db.dump')
  const total = restoreItems(await run(pgTool('pg_restore'), ['-l', dump], { env: pgEnv() }))
  let done = 0
  let lastLine = Date.now()
  const unwatch = watchSession(db, () => lastLine)
  try {
    await run(pgTool('pg_restore'), ['-v', '-d', dbUrl(db), '--no-owner', '--no-privileges', '--exit-on-error', dump], {
      // pg_restore commits each object on its own, and on a slow disk waiting for every commit to reach the disk was
      // most of the time. Safe for this copy: a crash before the switch only loses the copy, which the next task drops
      // (cleanLeftovers), and the switch's own commit writes everything before it to the disk
      env: { ...pgEnv(), PGOPTIONS: `${process.env.PGOPTIONS ?? ''} -c synchronous_commit=off`.trim() },
      onLine: (line) => {
        lastLine = Date.now()
        const item = restoreLine(line)
        if (item) {
          done++
          progress('loadProgress', { percent: Math.min(99, Math.floor((done / Math.max(total, 1)) * 100)), phase: item.phase, name: item.name })
        }
        return isToolChatter('pg_restore', line)
      },
    })
  } catch (e) {
    if (e instanceof BackupError) throw e
    throw new BackupError('dumpBad', { detail: (e as Error).message.split('\n').slice(-3).join(' ') })
  } finally {
    unwatch()
  }
  progress('countingRows')
  const want = await fs.readFile(path.join(u.work, 'db-counts.txt'), 'utf8')
  const got = await tableCounts(db)
  if (want.trim() !== got.trim()) throw new BackupError('countsDiffer')
  step('dbLoads', { tables: want.split('\n').filter(Boolean).length })
}

/** Also ends whatever still uses it, such as a pg_restore stopped from the page whose last command still runs */
const dropDatabase = (db: string) => psql(`drop database if exists ${ident(db)} with (force)`, 'postgres', { uncancellable: true })

export async function verifyBackup(name: string, deep: boolean, step: Step) {
  let u: Unpacked | null = null
  const temp = `${dbName()}_check_${randomBytes(3).toString('hex')}`
  try {
    if (deep) await checkCanCreateDatabases()
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

/** Moves the site's own entries (isUploadEntry) from one folder into another; the rest stay where they are */
async function moveUploads(from: string, to: string) {
  for (const entry of (await fs.readdir(from)).filter(isUploadEntry)) {
    await fs.rename(path.join(from, entry), path.join(to, entry))
  }
}

/**
 * Replace the database and the upload folder with a backup. Everything is prepared beside the live site first
 * (a new database, a hidden folder of files) and checked; only then are they swapped in, within seconds.
 * The app then restarts itself (Docker starts it again), so nothing keeps old data in memory and newer migrations apply.
 * Until the switch, the task can be stopped and any failure leaves the site as it was.
 *
 * `safety: false` skips saving the current state first (a «До восстановления» backup), which the page offers as a
 * choice, checked by default (Ewan, 2026-11-12). A site with no tables yet has nothing to save either way.
 */
export async function restoreBackup(
  name: string,
  step: Step,
  job: Job,
  opts: { by?: string; pool?: DbPool; safety?: boolean } = {},
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
    // What would otherwise stop the restore only after the long steps
    await checkCanCreateDatabases()
    u = await unpackAndCheck(name, step)
    const lastMigration = u.manifest.last_migration
    if (lastMigration && lastMigration !== 'dev' && !migrations.some((m) => m.name === lastMigration)) {
      throw new BackupError('newerCode', { migration: lastMigration })
    }
    const mediaTar = path.join(u.work, 'media.tar')
    const mediaBytes = (await fs.stat(mediaTar)).size
    await fs.mkdir(media, { recursive: true })
    await ensureSpace(media, mediaBytes)

    const hasTables = (await psql("select count(*) from information_schema.tables where table_schema = 'public'")).trim() !== '0'
    if (hasTables && opts.safety === false) step('safetySkipped')
    else if (hasTables) {
      const safety = await createBackup(step, { label: 'pre-restore', by })
      step('currentSaved', { name: safety })
    }

    step('loadingNew')
    await dropDatabase(fresh).catch(() => {})
    await loadIntoNewDatabase(u, fresh, step)

    step('unpackingMedia')
    // Again, since the backup saved just before may have taken room on the same disk
    await ensureSpace(media, mediaBytes)
    await fs.mkdir(staging, { recursive: true })
    let extracted = 0
    await run('tar', ['-xvf', mediaTar, '-C', staging], {
      onLine: (line) => {
        if (isTarFileLine(line)) progress('filesProgress', { done: ++extracted, total: u!.manifest.media_files })
        return !line.startsWith('tar: ')
      },
    })
    const unpacked = (await run('find', [staging, '-type', 'f'])).split('\n').filter(Boolean).length
    if (String(unpacked) !== u.manifest.media_files) throw new BackupError('mediaCount', { got: unpacked, want: u.manifest.media_files })

    // Past this point «Stop» is refused: the switch ends with either the old or the restored data in place
    noWayBack(job)
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
    // The host's lost+found stays in place, and one in the backup (an older backup could hold it) is left out
    await moveUploads(media, parked)
    await moveUploads(staging, media)
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
      // Said plainly, as the reader's first worry; a stop says it already
      if (!stopWanted()) step('unchanged')
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
 * What a check or restore the app did not live to finish left behind: unpacked files, and its copy of a backup's
 * database (…_check_…, …_restore_…), which would keep its disk space on the database server for good. Runs under the
 * lock, so no other task is using them. A folder of parked old files (…old-…) is left alone: it holds real uploads and
 * is never backed up, so nothing is lost; so is a …_before_… database, the site's data from before a restore.
 */
async function cleanLeftovers() {
  const like = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`)
  const copies = await (async () => {
    const live = like(dbName())
    return psql(
      `select datname from pg_database where datname like ${lit(`${live}\\_check\\_%`)} or datname like ${lit(`${live}\\_restore\\_%`)}`,
      'postgres',
    )
  })().catch(() => '')
  for (const db of copies.split('\n').filter(Boolean)) await dropDatabase(db).catch(() => {})

  const media = mediaDir()
  const entries = await fs.readdir(media).catch(() => [] as string[])
  for (const e of entries.filter((n) => n.startsWith(`${MEDIA_TEMP_PREFIX}new-`))) {
    await fs.rm(path.join(media, e), { recursive: true, force: true }).catch(() => {})
  }
  for (const e of (await fs.readdir(backupDir()).catch(() => [] as string[])).filter((n) => n.startsWith('.work-'))) {
    await fs.rm(path.join(backupDir(), e), { recursive: true, force: true }).catch(() => {})
  }
}
