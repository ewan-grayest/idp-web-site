'use client'
/* «Резервные копии»: make, list, download, upload, check, restore and delete full backups of the site.
   The work happens on the server (src/lib/backups.ts); this page starts tasks and shows their steps. */
import { Button, useConfig, useTranslation } from '@payloadcms/ui'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { messageText, type Message } from '@/lib/backupMessages'
import styles from './Backups.module.css'
import { useBackupTexts } from './texts'

type Backup = {
  name: string
  size: number
  modified: string
  kind: 'regular' | 'pre-restore' | 'uploaded' | 'other'
  created?: string
  mode?: string
  tables?: number
  mediaFiles?: number
  hasChecksum: boolean
  valid: boolean
}
type Job = {
  id: string
  kind: 'create' | 'verify' | 'restore' | 'upload'
  name?: string
  state: 'running' | 'done' | 'failed' | 'restarting'
  steps: Message[]
  error?: Message
}
type Check = { ok: boolean; deep: boolean; at: string; note?: Message }
/** An error answer from /api/v1/backups: a message key when the server knows one */
type Failure = { error?: string; key?: string; vars?: Message['vars'] }
type Data = {
  backups: Backup[]
  job: Job | null
  checks: Record<string, Check>
  settings: { folder: string; mode: string; keepLast: number; keepMonthly: number; restartsAfterRestore: boolean }
}

const sizeText = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`

export function BackupsPanel() {
  const t = useBackupTexts()
  const { config } = useConfig()
  const api = `${config.serverURL}${config.routes.api}`
  const loginURL = `${config.routes.admin}/login`
  const { i18n } = useTranslation()
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [restoring, setRestoring] = useState<string | null>(null)
  const [understood, setUnderstood] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [upload, setUpload] = useState<number | null>(null)
  const [restart, setRestart] = useState<'waiting' | 'back' | null>(null)
  // The site stopped answering while a task ran
  const [quiet, setQuiet] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const base = `${api}/backups`
  const failure = (out: Failure, fallback: string) => (out.key ? messageText({ key: out.key, vars: out.vars }, i18n.language) : out.error || fallback)
  const load = useCallback(async () => {
    const res = await fetch(base, { credentials: 'include', cache: 'no-store' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(failure(body, res.statusText))
    setData(body as Data)
    return body as Data
  }, [base])

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [load])

  // Follow a running task at GET /backups/job/:id, which needs no sign-in: a restore swaps the database the sign-in is
  // checked against, so from that step on this page's session is gone. The restarted site no longer knows the task (404):
  // after a restore that is the end, and the reader signs in again with an account from the backup
  const job = data?.job
  const following = job && (job.state === 'running' || job.state === 'restarting') ? job : null
  // The newest steps seen, for when the restarted site answers before this page saw «restarting»
  const latest = useRef(job)
  latest.current = job
  useEffect(() => {
    if (!following) return
    if (following.state === 'restarting') setRestart('waiting')
    let failures = 0
    const timer = setInterval(async () => {
      let res: Response
      let body: { job?: Job | null }
      try {
        res = await fetch(`${base}/job/${following.id}`, { credentials: 'include', cache: 'no-store' })
        body = await res.json()
      } catch {
        // No answer, or not the site's (a host's error page while the site restarts)
        if (++failures >= 5) setQuiet(true)
        return
      }
      failures = 0
      setQuiet(false)
      if (res.ok && body.job) {
        const next = body.job
        setData((d) => d && { ...d, job: next })
        if (next.state === 'done' || next.state === 'failed') load().catch((e) => setError(e.message))
      } else if (res.status === 404 && body.job === null) {
        clearInterval(timer)
        const seen = latest.current
        if (seen?.state === 'restarting' || (seen?.kind === 'restore' && seen.steps.some((m) => m.key === 'restored'))) {
          setRestart('back')
          setTimeout(() => window.location.assign(loginURL), 2000)
        } else {
          setData((d) => d && { ...d, job: null })
          setError(t.interrupted)
          load().catch(() => {})
        }
      }
    }, 1000)
    return () => clearInterval(timer)
    // Set up again only when the task or its state changes, not on every new step
  }, [following?.id, following?.state, base, loginURL, load])

  const busy = job?.state === 'running' || job?.state === 'restarting' || upload !== null

  const post = async (url: string, body?: unknown) => {
    setError('')
    setNotice('')
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    const out = await res.json().catch(() => ({}))
    if (!res.ok) setError(failure(out, res.statusText))
    await load().catch(() => {})
  }

  const remove = async (name: string) => {
    setError('')
    const res = await fetch(`${base}/${encodeURIComponent(name)}`, { method: 'DELETE', credentials: 'include' })
    const out = await res.json().catch(() => ({}))
    if (res.ok) setNotice(t.removed(name))
    else setError(failure(out, res.statusText))
    setDeleting(null)
    await load().catch(() => {})
  }

  const sendFile = (file: File) => {
    setError('')
    setNotice('')
    setUpload(0)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${base}/upload`)
    xhr.withCredentials = true
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name))
    xhr.upload.onprogress = (e) => e.lengthComputable && setUpload(Math.round((e.loaded / e.total) * 100))
    xhr.onloadend = () => {
      setUpload(null)
      let out: Failure & { name?: string } = {}
      try {
        out = JSON.parse(xhr.responseText)
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) setNotice(t.uploaded(out.name ?? file.name))
      else setError(failure(out, xhr.statusText || 'Upload failed'))
      if (fileInput.current) fileInput.current.value = ''
      load().catch(() => {})
    }
    xhr.send(file)
  }

  const when = (b: Backup) => {
    const d = b.created ? new Date(b.created.replace(/([+-]\d\d)(\d\d)$/, '$1:$2')) : new Date(b.modified)
    return Number.isNaN(d.getTime()) ? b.name : d.toLocaleString(i18n.language, { dateStyle: 'long', timeStyle: 'short' })
  }
  const kindText = { regular: t.kindRegular, 'pre-restore': t.kindPre, uploaded: t.kindUploaded, other: t.kindOther }
  const jobTitle = job && { create: t.jobCreate, verify: t.jobVerify, restore: t.jobRestore, upload: t.upload }[job.kind]
  const jobState = job && { running: t.jobRunning, done: t.jobDone, failed: t.jobFailed, restarting: t.jobRestarting }[job.state]

  if (restart) {
    return (
      <div className={styles.page}>
        <h1>{t.title}</h1>
        <p className={styles.restart} role="status">
          {restart === 'waiting' ? t.waitingRestart : t.backOnline}
        </p>
      </div>
    )
  }

  return (
    <div className={styles.page} data-backups>
      <h1>{t.title}</h1>
      <div className={styles.intro}>
        <p>{t.intro}</p>
        {data && <p>{t.where(data.settings.folder)}</p>}
        <p>{t.secrets}</p>
        {data && <p>{t.keep(data.settings.keepLast, data.settings.keepMonthly)}</p>}
        {data && !data.settings.restartsAfterRestore && <p>{t.devNote}</p>}
      </div>

      <div className={styles.toolbar}>
        <Button buttonStyle="primary" margin={false} disabled={busy} onClick={() => post(base)} id="backup-create">
          {t.create}
        </Button>
        <Button buttonStyle="secondary" margin={false} disabled={busy} onClick={() => fileInput.current?.click()} id="backup-upload">
          {upload !== null ? `${t.uploading} ${upload}%` : t.upload}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".tar,application/x-tar"
          hidden
          id="backup-upload-file"
          onChange={(e) => e.target.files?.[0] && sendFile(e.target.files[0])}
        />
        <Button buttonStyle="subtle" margin={false} onClick={() => load().catch((e) => setError(e.message))}>
          {t.refresh}
        </Button>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}

      {job && (
        <section className={`${styles.job} ${styles[job.state]}`} aria-live="polite" data-job-state={job.state}>
          <h2>
            {jobTitle}
            {job.name ? `: ${job.name}` : ''} — {jobState}
          </h2>
          <ol>
            {job.steps.map((s, i) => (
              <li key={i}>{messageText(s, i18n.language)}</li>
            ))}
          </ol>
          {job.error && <p className={styles.error}>{messageText(job.error, i18n.language)}</p>}
          {quiet && job.state === 'running' && <p role="status">{t.notAnswering}</p>}
        </section>
      )}

      {data && data.backups.length === 0 && <p className={styles.empty}>{t.empty}</p>}
      {data && data.backups.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t.colDate}</th>
                <th>{t.colKind}</th>
                <th>{t.colContents}</th>
                <th>{t.colSize}</th>
                <th>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {data.backups.map((b) => {
                const check = data.checks[b.name]
                return (
                  <React.Fragment key={b.name}>
                    <tr data-backup={b.name}>
                      <td>
                        <div>{when(b)}</div>
                        <div className={styles.file}>{b.name}</div>
                      </td>
                      <td>
                        <div>{kindText[b.kind]}</div>
                        {b.mode && <div className={styles.muted}>{b.mode === 'prod' ? t.fromProd : t.fromLocal}</div>}
                      </td>
                      <td>
                        {b.valid ? t.contents(b.tables, b.mediaFiles) : <span className={styles.bad}>{t.notBackup}</span>}
                        {check && (
                          <div className={check.ok ? styles.good : styles.bad}>
                            {check.ok ? t.checkedOk : `${t.checkedBad}: ${check.note ? messageText(check.note, i18n.language) : ''}`}
                          </div>
                        )}
                      </td>
                      <td className={styles.num}>{sizeText(b.size)}</td>
                      <td>
                        <div className={styles.actions}>
                          <Button el="anchor" url={`${base}/${encodeURIComponent(b.name)}/download`} buttonStyle="subtle" size="small" margin={false}>
                            {t.download}
                          </Button>
                          <Button buttonStyle="subtle" size="small" margin={false} disabled={busy} onClick={() => post(`${base}/${encodeURIComponent(b.name)}/verify`)}>
                            {t.verify}
                          </Button>
                          <Button
                            buttonStyle="secondary"
                            size="small"
                            margin={false}
                            disabled={busy || !b.valid}
                            onClick={() => {
                              setRestoring(restoring === b.name ? null : b.name)
                              setUnderstood(false)
                            }}
                          >
                            {t.restore}
                          </Button>
                          {deleting === b.name ? (
                            <Button buttonStyle="error" size="small" margin={false} onClick={() => remove(b.name)}>
                              {t.removeConfirm}
                            </Button>
                          ) : (
                            <Button buttonStyle="subtle" size="small" margin={false} disabled={busy} onClick={() => setDeleting(b.name)}>
                              {t.remove}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {restoring === b.name && (
                      <tr className={styles.confirmRow}>
                        <td colSpan={5}>
                          <div className={styles.confirm} role="dialog" aria-label={t.restoreTitle}>
                            <h3>{t.restoreTitle}</h3>
                            <p>
                              <strong>{when(b)}</strong> · {b.name}
                            </p>
                            <p>{t.restoreWarn}</p>
                            <p>{t.restoreSafety}</p>
                            <p>{t.restoreAfter}</p>
                            <label className={styles.check}>
                              <input type="checkbox" id="backup-restore-understood" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
                              {t.restoreCheck}
                            </label>
                            <div className={styles.actions}>
                              <Button
                                buttonStyle="error"
                                margin={false}
                                disabled={!understood || busy}
                                id="backup-restore-go"
                                onClick={() => {
                                  setRestoring(null)
                                  post(`${base}/${encodeURIComponent(b.name)}/restore`, { confirm: b.name })
                                }}
                              >
                                {t.restoreGo}
                              </Button>
                              <Button buttonStyle="secondary" margin={false} onClick={() => setRestoring(null)}>
                                {t.cancel}
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
