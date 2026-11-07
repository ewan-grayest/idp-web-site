'use client'
/* «Диагностика»: settings, live checks and the latest log lines, with a report to copy or download for the developer.
   The checks run on the server (src/lib/diagnosticsChecks.ts); secrets are already hidden in what comes back. */
import { Button, useConfig, useTranslation } from '@payloadcms/ui'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import type { Check, Status } from '@/lib/diagnostics'
import type { Diagnostics } from '@/lib/diagnosticsChecks'
import type { LogEntry } from '@/lib/logBuffer'
import styles from './Diagnostics.module.css'
import type { DiagnosticsTexts } from './texts'
import { useDiagnosticsTexts } from './useDiagnosticsTexts'

const messageOf = (t: DiagnosticsTexts, c: Check) =>
  (t.messages as Record<string, ((v: NonNullable<Check['vars']>) => string) | undefined>)[c.key]?.(c.vars ?? {}) ?? `${c.key} ${JSON.stringify(c.vars ?? {})}`
const nameOf = (t: DiagnosticsTexts, c: Check) => (t.names as Record<string, string | undefined>)[c.id] ?? c.id

/** The whole page as plain text, in the admin language, for pasting into a message */
function reportText(d: Diagnostics, t: DiagnosticsTexts, when: (iso: string) => string) {
  const row = (c: Check) => `[${t.status[c.status]}] ${nameOf(t, c)}: ${messageOf(t, c)}`
  const a = d.about
  const logs = d.logs.slice(-200)
  return [
    `ID project — ${t.title}`,
    t.checkedAt(when(d.checkedAt)),
    `${t.summary[d.status]}`,
    '',
    `== ${t.about} ==`,
    `${t.aboutRows.version}: ${a.version}`,
    `${t.aboutRows.nodeEnv}: ${a.nodeEnv}`,
    `${t.aboutRows.node}: ${a.node} (${a.platform})`,
    `${t.aboutRows.startedAt}: ${when(a.startedAt)} (${t.uptime(a.uptimeSeconds)})`,
    `${t.aboutRows.memory}: ${a.memoryMb} MB`,
    `${t.aboutRows.host}: ${a.host}`,
    '',
    `== ${t.checks} ==`,
    ...d.checks.map(row),
    '',
    `== ${t.settings} ==`,
    ...d.settings.map(row),
    '',
    `== ${t.logs} (${logs.length}/${d.logs.length}) ==`,
    ...logs.map((l) => `${l.time} ${l.level.toUpperCase()} [${l.source}] ${l.text}`),
    '',
  ].join('\n')
}

/** Clipboard, with the old way for an address without https, where browsers withhold navigator.clipboard */
async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text)
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  document.execCommand('copy')
  area.remove()
}

function StatusBadge({ status, t }: { status: Status; t: DiagnosticsTexts }) {
  return (
    <span className={`${styles.badge} ${styles[status]}`} data-status={status}>
      {t.status[status]}
    </span>
  )
}

function CheckTable({ rows, t, mono }: { rows: Check[]; t: DiagnosticsTexts; mono?: boolean }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t.colName}</th>
            <th>{t.colStatus}</th>
            <th>{t.colDetails}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} data-check={c.id} data-status={c.status}>
              <td className={mono ? styles.code : undefined}>{nameOf(t, c)}</td>
              <td>
                <StatusBadge status={c.status} t={t} />
              </td>
              <td className={styles.details}>{messageOf(t, c)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DiagnosticsPanel() {
  const t = useDiagnosticsTexts()
  const { config } = useConfig()
  const { i18n } = useTranslation()
  const url = `${config.serverURL}${config.routes.api}/diagnostics`
  const [data, setData] = useState<Diagnostics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [problemsOnly, setProblemsOnly] = useState(false)

  const when = useCallback(
    (iso: string) => {
      const d = new Date(iso)
      return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'medium' })
    },
    [i18n.language],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || res.statusText)
      setData(body as Diagnostics)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    load()
  }, [load])

  const logs = useMemo(() => {
    const all: LogEntry[] = data ? [...data.logs].reverse() : []
    return problemsOnly ? all.filter((l) => l.level === 'error' || l.level === 'warn') : all
  }, [data, problemsOnly])

  const copy = async () => {
    if (!data) return
    try {
      await copyText(reportText(data, t, when))
      setNotice(t.copied)
      setTimeout(() => setNotice(''), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const download = () => {
    if (!data) return
    const blob = new Blob([reportText(data, t, when)], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `idp-diagnostics-${data.checkedAt.slice(0, 16).replace(/[T:]/g, '-')}.txt`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }

  const a = data?.about

  return (
    <div className={styles.page} data-diagnostics>
      <h1>{t.title}</h1>
      <p className={styles.intro}>{t.intro}</p>

      <div className={styles.toolbar}>
        <Button buttonStyle="primary" margin={false} disabled={loading} onClick={load} id="diagnostics-refresh">
          {loading ? t.checking : t.refresh}
        </Button>
        <Button buttonStyle="secondary" margin={false} disabled={!data} onClick={copy} id="diagnostics-copy">
          {t.copy}
        </Button>
        <Button buttonStyle="subtle" margin={false} disabled={!data} onClick={download} id="diagnostics-download">
          {t.download}
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

      {data && a && (
        <>
          <section className={`${styles.summary} ${styles[data.status]}`} data-overall={data.status} aria-live="polite">
            <strong>{t.summary[data.status]}</strong>
            <span className={styles.muted}>{t.checkedAt(when(data.checkedAt))}</span>
          </section>

          <section className={styles.section}>
            <h2>{t.about}</h2>
            <dl className={styles.about}>
              <dt>{t.aboutRows.version}</dt>
              <dd>{a.version}</dd>
              <dt>{t.aboutRows.nodeEnv}</dt>
              <dd>{a.nodeEnv || '—'}</dd>
              <dt>{t.aboutRows.startedAt}</dt>
              <dd>
                {when(a.startedAt)} ({t.uptime(a.uptimeSeconds)})
              </dd>
              <dt>{t.aboutRows.memory}</dt>
              <dd>{a.memoryMb} MB</dd>
              <dt>{t.aboutRows.node}</dt>
              <dd>
                {a.node} · {a.platform}
              </dd>
              <dt>{t.aboutRows.host}</dt>
              <dd className={styles.code}>{a.host}</dd>
            </dl>
          </section>

          <section className={styles.section}>
            <h2>{t.checks}</h2>
            <CheckTable rows={data.checks} t={t} />
          </section>

          <section className={styles.section}>
            <h2>{t.settings}</h2>
            <p className={styles.muted}>{t.settingsNote}</p>
            <CheckTable rows={data.settings} t={t} mono />
          </section>

          <section className={styles.section}>
            <h2>{t.logs}</h2>
            <p className={styles.muted}>{t.logsNote(when(a.logsSince))}</p>
            <div className={styles.filter} role="radiogroup" aria-label={t.logs}>
              <label>
                <input type="radio" name="log-filter" checked={!problemsOnly} onChange={() => setProblemsOnly(false)} /> {t.logsAll}
              </label>
              <label>
                <input type="radio" name="log-filter" id="diagnostics-problems" checked={problemsOnly} onChange={() => setProblemsOnly(true)} /> {t.logsProblems}
              </label>
            </div>
            {logs.length === 0 ? (
              <p className={styles.muted}>{t.logsEmpty}</p>
            ) : (
              <ol className={styles.logs} data-logs>
                {logs.map((l, i) => (
                  <li key={`${l.time}-${i}`} className={styles[`log-${l.level}`]} data-level={l.level}>
                    <span className={styles.logMeta}>
                      {when(l.time)} · {l.level.toUpperCase()} · {l.source}
                    </span>
                    <pre>{l.text}</pre>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  )
}
