/**
 * /api/v1/backups: the admin's «Резервные копии» page. Signed-in admin users only, except a running task's steps.
 * Long tasks (make, check, restore) run in the background; the page follows their steps at GET /backups/job/:id,
 * and stops one at POST /backups/job/:id/cancel. Answers carry the server's time, for the page's elapsed time.
 */
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import { Readable } from 'node:stream'
import type { Endpoint, PayloadRequest } from 'payload'

import { BackupError } from '../lib/backupMessages'
import {
  backupPath,
  backupSettings,
  cancelJob,
  createBackup,
  type DbPool,
  currentJob,
  deleteBackup,
  isBackupName,
  lastChecks,
  listBackups,
  restoreBackup,
  saveUpload,
  startJob,
  verifyBackup,
} from '../lib/backups'

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
const fail = (e: unknown, status = 400) =>
  json({ error: e instanceof Error ? e.message : String(e), ...(e instanceof BackupError ? { key: e.key, vars: e.vars } : {}) }, status)

/** Wraps a handler: signed-in users only, a valid file name where the path has one, errors as JSON */
const guarded =
  (handler: (req: PayloadRequest, name: string) => Promise<Response>) =>
  async (req: PayloadRequest) => {
    if (!req.user) return fail('Sign in to the admin first', 401)
    const name = String(req.routeParams?.name ?? '')
    if (req.routeParams?.name !== undefined && !isBackupName(name)) return fail(new BackupError('badName'), 400)
    try {
      return await handler(req, name)
    } catch (e) {
      return fail(e)
    }
  }

const who = (req: PayloadRequest) => (req.user && 'email' in req.user ? String(req.user.email) : undefined)

export const backupEndpoints: Endpoint[] = [
  {
    path: '/backups',
    method: 'get',
    handler: guarded(async () =>
      json({ backups: await listBackups(), job: currentJob(), checks: lastChecks(), settings: backupSettings(), now: new Date().toISOString() }),
    ),
  },
  {
    path: '/backups',
    method: 'post',
    handler: guarded(async (req) => json({ job: startJob('create', who(req), undefined, (step) => createBackup(step, { by: who(req) })) }, 202)),
  },
  {
    // The running task's steps, for the page that started it. Without sign-in, on purpose: a restore swaps the database
    // the sign-in is checked against, so from that step on the page's session no longer exists, and the restarted site
    // has no task. The task's random id stands in for the sign-in. 404 means this site process does not know the task
    path: '/backups/job/:id',
    method: 'get',
    handler: async (req: PayloadRequest) => {
      const job = currentJob()
      if (!job || job.id !== String(req.routeParams?.id ?? '')) return json({ job: null }, 404)
      const { by: _by, ...shown } = job
      return json({ job: shown, now: new Date().toISOString() })
    },
  },
  {
    // «Stop»: signed in, since it is only offered before a restore switches the database the sign-in is checked against
    path: '/backups/job/:id/cancel',
    method: 'post',
    handler: guarded(async (req) => {
      try {
        const { by: _by, ...shown } = cancelJob(String(req.routeParams?.id ?? ''))
        return json({ job: shown }, 202)
      } catch (e) {
        return fail(e, 409)
      }
    }),
  },
  {
    path: '/backups/upload',
    method: 'post',
    handler: guarded(async (req) => {
      if (!req.body) return fail('No file was sent')
      const original = decodeURIComponent(req.headers.get('x-file-name') || 'backup.tar')
      return json({ name: await saveUpload(req.body, original) }, 201)
    }),
  },
  {
    path: '/backups/:name/verify',
    method: 'post',
    handler: guarded(async (req, name) => {
      await fs.access(backupPath(name))
      return json({ job: startJob('verify', who(req), name, (step) => verifyBackup(name, true, step)) }, 202)
    }),
  },
  {
    path: '/backups/:name/restore',
    method: 'post',
    handler: guarded(async (req, name) => {
      const body = (await req.json?.().catch(() => ({}))) as { confirm?: string; safety?: boolean } | undefined
      if (body?.confirm !== name) return fail('Confirm the restore first')
      await fs.access(backupPath(name))
      const pool = (req.payload.db as { pool?: DbPool }).pool
      // The current state is saved first unless the page says not to
      const safety = body.safety !== false
      return json({ job: startJob('restore', who(req), name, (step, job) => restoreBackup(name, step, job, { by: who(req), pool, safety })) }, 202)
    }),
  },
  {
    path: '/backups/:name/download',
    method: 'get',
    handler: guarded(async (_req, name) => {
      const file = backupPath(name)
      const st = await fs.stat(file)
      return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
        headers: {
          'Content-Type': 'application/x-tar',
          'Content-Length': String(st.size),
          'Content-Disposition': `attachment; filename="${name}"`,
          'Cache-Control': 'no-store',
        },
      })
    }),
  },
  {
    path: '/backups/:name',
    method: 'delete',
    handler: guarded(async (_req, name) => {
      await deleteBackup(name)
      return json({ deleted: name })
    }),
  },
]
