/**
 * The latest server log lines, kept in memory for the admin's «Диагностика» page.
 * Everything the site writes through `console` (Next.js request errors among it) and Payload's own logger lands here
 * as well as in the host's log. Lines are kept since the last start only: the host's log panel has the older ones.
 * Secrets (PAYLOAD_SECRET, the database password) are blanked out before a line is kept.
 */
import { format } from 'node:util'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogEntry = { time: string; level: LogLevel; source: 'console' | 'payload'; text: string }

const MAX_ENTRIES = 500
const MAX_TEXT = 4000
// One buffer per process: Next.js can load this module more than once (instrumentation, routes, the Payload config)
const KEY = Symbol.for('idp.logBuffer')
type Store = { entries: LogEntry[]; consoleInstalled: boolean; startedAt: string }
const store = (): Store => {
  const g = globalThis as unknown as Record<symbol, Store | undefined>
  return (g[KEY] ??= { entries: [], consoleInstalled: false, startedAt: new Date().toISOString() })
}

/** When this process started keeping lines: the site's last start */
export const logStartedAt = () => store().startedAt

/** The values to blank out of log lines and the settings list: secrets and the database password */
export function secretValues(env: NodeJS.ProcessEnv = process.env) {
  const values = [env.PAYLOAD_SECRET, env.POSTGRES_PASSWORD]
  for (const uri of [env.DATABASE_URI, env.DATABASE_URL]) {
    try {
      const password = uri ? new URL(uri).password : ''
      if (password) values.push(password, decodeURIComponent(password))
    } catch {
      // Not an address: nothing to hide in it
    }
  }
  // Short values would blank out ordinary words
  return [...new Set(values.filter((v): v is string => !!v && v.length >= 6))]
}

/** Hides secrets in a line: known values, and any password written into a database address */
export function redact(text: string, secrets = secretValues()) {
  let out = text
  for (const s of secrets) out = out.split(s).join('***')
  return out.replace(/(\b[a-z][a-z\d+.-]*:\/\/[^:/@\s]+:)[^@\s]+@/gi, '$1***@')
}

/** Adds a line. Never throws: logging must not take a request down */
export function addLog(level: LogLevel, source: LogEntry['source'], text: string) {
  try {
    const clean = redact(text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text).trimEnd()
    if (!clean) return
    const entries = store().entries
    entries.push({ time: new Date().toISOString(), level, source, text: clean })
    if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES)
  } catch {
    // Keep going without the line
  }
}

/** The kept lines, oldest first */
export const recentLogs = (): LogEntry[] => [...store().entries]

/** Copies everything written through `console` into the buffer. Safe to call more than once */
export function captureConsole() {
  const s = store()
  if (s.consoleInstalled) return
  s.consoleInstalled = true
  const levels: [keyof Console, LogLevel][] = [
    ['debug', 'debug'],
    ['log', 'info'],
    ['info', 'info'],
    ['warn', 'warn'],
    ['error', 'error'],
  ]
  for (const [method, level] of levels) {
    const original = console[method] as (...args: unknown[]) => void
    ;(console as unknown as Record<string, unknown>)[method] = (...args: unknown[]) => {
      addLog(level, 'console', format(...args))
      original.apply(console, args)
    }
  }
}

/** Pino's numeric levels as ours */
export const pinoLevel = (n: number): LogLevel => (n >= 50 ? 'error' : n >= 40 ? 'warn' : n >= 30 ? 'info' : 'debug')

/** One Pino call (`logger.error(err, 'msg')`, `logger.info({ msg })`, `logger.warn('a %s', b)`) as one line */
export function pinoText(args: unknown[]) {
  const [first, ...rest] = args
  if (first instanceof Error) return [format(...rest), first.stack || first.message].filter(Boolean).join('\n')
  if (first && typeof first === 'object') {
    const { msg, message, err, error, ...more } = first as Record<string, unknown>
    const problem = err ?? error
    const parts = [rest.length ? format(...rest) : '', typeof msg === 'string' ? msg : typeof message === 'string' ? message : '']
    if (problem instanceof Error) parts.push(problem.stack || problem.message)
    else if (problem) parts.push(String(problem))
    if (Object.keys(more).length) parts.push(safeJson(more))
    return parts.filter(Boolean).join('\n')
  }
  return format(...args)
}

const safeJson = (value: unknown) => {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * Pino options for Payload's logger: the same readable output as Payload's default, with every line also kept here.
 * `logMethod` sees each call before Pino writes it, whatever stream it goes to.
 */
export const payloadLogHooks = {
  logMethod(this: unknown, args: unknown[], method: (...a: unknown[]) => void, level: number) {
    addLog(pinoLevel(level), 'payload', pinoText(args))
    method.apply(this, args)
  },
}
