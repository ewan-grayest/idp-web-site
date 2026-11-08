#!/bin/sh
# Diagnostics from inside the site container, for when the admin's diagnostics page can't be reached.
# The script isn't in the image: from the site folder, feed it to the running container,
#   docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env exec -T app sh < scripts/container-diag.sh
# or copy it into the container and run: sh container-diag.sh
# Requires only Node (already in the image) and BusyBox. No settings are changed.
# DIAG_FILE overrides /tmp/diag.txt. The report hides known credentials.
if ! command -v node >/dev/null 2>&1; then
  echo 'The diagnostics need Node.js.' >&2
  exit 1
fi

exec node --input-type=commonjs <<'NODE'
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const http = require('node:http')
const net = require('node:net')
const { spawnSync } = require('node:child_process')
const env = process.env
const report = env.DIAG_FILE || '/tmp/diag.txt'
const db = env.DATABASE_URI || env.DATABASE_URL || ''
const secrets = new Set()
const sensitive = /password|secret|token|api[_-]?key/i
for (const [key, value] of Object.entries(env)) {
  if (sensitive.test(key) && value) secrets.add(value)
}
for (const value of [env.DATABASE_URI, env.DATABASE_URL]) {
  if (!value) continue
  try {
    const url = new URL(value)
    if (url.password) {
      secrets.add(url.password)
      secrets.add(decodeURIComponent(url.password))
    }
    for (const [key, val] of url.searchParams) {
      if (sensitive.test(key) && val) secrets.add(val)
    }
  } catch {
    secrets.add(value)
  }
}
function redact(value) {
  let text = String(value).replace(/\b[a-z][a-z\d+.-]*:\/\/[^\s"'<>]+/gi, (raw) => {
    try {
      const url = new URL(raw)
      if (url.password) url.password = '***'
      for (const key of [...url.searchParams.keys()]) {
        if (sensitive.test(key)) url.searchParams.set(key, '***')
      }
      return url.toString()
    } catch {
      return '[invalid URL hidden]'
    }
  })
  for (const secret of [...secrets].sort((a, b) => b.length - a.length)) {
    text = text.split(secret).join('***')
  }
  return text
}
let logFile
try {
  logFile = fs.openSync(report, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_NOFOLLOW, 0o600)
  fs.fchmodSync(logFile, 0o600)
} catch (error) {
  console.error(redact(`Can't open the report file: ${error.message}`))
  process.exit(1)
}
function say(value = '') {
  const text = `${redact(value)}\n`
  process.stdout.write(text)
  fs.writeSync(logFile, text)
}
function section(number, title) { say(`\n=== ${number}. ${title} ===`) }
function run(command, args = [], commandEnv = env) {
  const result = spawnSync(command, args, {
    env: commandEnv, encoding: 'utf8', timeout: 8000, killSignal: 'SIGKILL', maxBuffer: 256 * 1024,
  })
  const output = [result.stdout, result.stderr, result.error?.code].filter(Boolean).join('\n').trim()
  return { ok: !result.error && result.status === 0, output }
}
function show(result, lines = 15) {
  // Mask before shortening, so a truncation cannot expose part of a password.
  say(redact(result.output).split('\n').slice(0, lines).join('\n') || '(no output)')
}
function executable(file) {
  try { fs.accessSync(file, fs.constants.X_OK); return true } catch { return false }
}
function request(route, port) {
  return new Promise((resolve) => {
    say(`--- ${route}:`)
    // A total deadline also bounds a response that never finishes streaming.
    const timer = setTimeout(() => req.destroy(new Error('timed out after 30 s')), 30000)
    const req = http.get({ hostname: '127.0.0.1', port, path: route }, (res) => {
      say(`HTTP/${res.httpVersion} ${res.statusCode} ${res.statusMessage}`)
      if (res.headers.location) say(`Location: ${res.headers.location}`)
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { if (route === '/api/health') body += chunk })
      res.on('end', () => {
        if (body) say(redact(body).slice(0, 4000))
        clearTimeout(timer)
        resolve()
      })
      res.on('error', (error) => req.destroy(error))
    })
    req.on('error', (error) => {
      clearTimeout(timer)
      say(`!!! ${error.code || error.message}`)
      resolve()
    })
  })
}
function connect(options) {
  return new Promise((resolve) => {
    const socket = net.createConnection(options)
    const timer = setTimeout(() => finish('timed out after 5 s'), 5000)
    function finish(error) {
      clearTimeout(timer)
      socket.destroy()
      say(error ? `!!! Database unreachable: ${error}` : 'Database port is reachable')
      resolve()
    }
    socket.once('connect', () => finish())
    socket.once('error', (error) => finish(error.code || error.message))
  })
}
async function main() {
  section(1, 'Version and system')
  say(new Date().toISOString())
  show(run('uname', ['-a']))
  show(run('id'))
  say(`Node ${process.version}`)
  try { say(`Site ${JSON.parse(fs.readFileSync('/app/package.json', 'utf8')).version}`) } catch { say('/app/package.json not found') }

  section(2, 'Settings (secrets hidden)')
  for (const [key, value] of Object.entries(env).sort()) {
    if (/^(DATABASE_URI|DATABASE_URL|PAYLOAD_SECRET|MEDIA_DIR|BACKUPS_DIR|BACKUP_MODE|PORT|HOSTNAME|NODE_ENV|PG_BIN_DIR)$|^(NEXT_PUBLIC_|KEEP_)/.test(key)) {
      say(`${key}=${sensitive.test(key) && value ? '*** (set)' : value}`)
    }
  }
  if (!env.PAYLOAD_SECRET) say('!!! PAYLOAD_SECRET is empty')
  if (!db) say('!!! DATABASE_URI and DATABASE_URL are both empty')
  let url
  if (db) {
    try {
      url = new URL(db)
      if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error()
    } catch {
      url = undefined
      say('!!! Invalid database URL: expected postgres://user:password@host:5432/db')
    }
  }

  section(3, 'Processes and port')
  const processes = run('ps', ['-o', 'pid,user,args'])
  if (processes.ok) say(processes.output.split('\n').filter((line, i) => i === 0 || /node|next|postgres|entrypoint/.test(line)).join('\n'))
  else show(processes)
  const port = Number(env.PORT || 3000)
  const validPort = Number.isInteger(port) && port > 0 && port <= 65535
  const ports = run('netstat', ['-ltn'])
  const listeners = ports.ok ? ports : run('ss', ['-ltn'])
  if (listeners.ok) say(listeners.output.split('\n').filter((line) => new RegExp(`:${port}\\s`).test(line)).join('\n') || "Nothing listens on the site's port")
  else say('netstat and ss are unavailable; the connection is checked below')

  section(4, "The site's answers from inside the container")
  if (validPort) {
    for (const route of ['/api/health', '/', '/admin']) await request(route, port)
  } else say('!!! PORT must be a number from 1 to 65535')

  section(5, 'Database')
  const bin = env.PG_BIN_DIR || '/opt/pg/bin'
  const psql = [path.join(bin, 'psql'), ...(env.PATH || '').split(path.delimiter).map((dir) => path.join(dir, 'psql'))].find(executable)
  if (!psql) say('psql not found')
  else {
    say(`psql: ${psql}`)
    const pgEnv = {
      ...env,
      LD_LIBRARY_PATH: [path.resolve(path.dirname(psql), '../lib'), env.LD_LIBRARY_PATH].filter(Boolean).join(':'),
      PGCONNECT_TIMEOUT: '5', PGOPTIONS: '-c statement_timeout=5000 -c default_transaction_read_only=on',
    }
    const version = run(psql, ['--version'], pgEnv)
    show(version)
    if (!version.ok) say("!!! psql doesn't run; SQL checks skipped")
    else if (!url) say('SQL checks skipped: the database URL is empty or invalid')
    else {
      // Match the app's libpqUrl(): these driver options are not supported by psql.
      const pgUrl = new URL(url)
      if (pgUrl.searchParams.get('sslmode') === 'no-verify') pgUrl.searchParams.set('sslmode', 'require')
      pgUrl.searchParams.delete('uselibpqcompat')
      // Pass the password through the environment, not the process arguments.
      if (pgUrl.password) pgEnv.PGPASSWORD = decodeURIComponent(pgUrl.password)
      pgUrl.password = ''
      if (pgUrl.searchParams.has('password')) {
        pgEnv.PGPASSWORD = pgUrl.searchParams.get('password')
        pgUrl.searchParams.delete('password')
      }
      // Never prompt for a password or read a user-supplied psql startup file.
      const query = (sql) => run(psql, ['-X', '-w', '-d', pgUrl.toString(), '-v', 'ON_ERROR_STOP=1', '-c', sql], pgEnv)
      const connection = query('select version();')
      show(connection)
      if (!connection.ok) say("!!! Couldn't connect to the database; the other SQL checks are skipped")
      else {
        for (const [title, sql] of [
          ['migrations (latest 25)', 'select id, name, batch, created_at from payload_migrations order by id desc limit 25;'],
          ['tables (count)', "select count(*) from information_schema.tables where table_schema='public';"],
          ['projects by kind', 'select kind, count(*) from projects group by kind;'],
          ['admin users (count)', 'select count(*) from users;'],
        ]) { say(`--- ${title}:`); show(query(sql), 30) }
      }
    }
  }

  section(6, 'Folders and disk')
  say('Write checks run as the current user (see id above)')
  for (const dir of new Set([env.MEDIA_DIR || '/data/media', env.BACKUPS_DIR || '/data/backup', '/app/media', '/app/backups', '/app/.next/cache'])) {
    try {
      const count = fs.readdirSync(dir).length
      const probe = fs.mkdtempSync(path.join(dir, '.idp-diag-'))
      fs.rmdirSync(probe)
      say(`${dir}: exists, ${count} entries, writable`)
    } catch (error) { say(`${dir}: !!! ${error.code || error.message}`) }
  }
  say('--- mounted volumes:')
  try { say(fs.readFileSync('/proc/mounts', 'utf8').split('\n').filter((line) => / \/(app|data)(\/| )/.test(line)).join('\n') || '(none found)') } catch { say('/proc/mounts unavailable') }
  say('--- disk space:')
  show(run('df', ['-h', ...new Set(['/', '/app', env.MEDIA_DIR || '/data/media', env.BACKUPS_DIR || '/data/backup'].filter((dir) => fs.existsSync(dir)))]))
  say(`--- memory: ${Math.round(os.freemem() / 1048576)} MB free of ${Math.round(os.totalmem() / 1048576)} MB`)

  section(7, 'Network to the database')
  if (!url) say('Skipped: the database URL is empty or invalid')
  else {
    const host = url.searchParams.get('host') || url.hostname.replace(/^\[|\]$/g, '') || 'localhost'
    const dbPort = Number(url.searchParams.get('port') || url.port || 5432)
    say(`Database host: ${host}, port: ${dbPort}`)
    if (host.startsWith('/')) await connect({ path: path.join(host, `.s.PGSQL.${dbPort}`) })
    else if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535 || host.includes(',')) say('TCP check skipped: unusual host or port')
    else {
      if (['localhost', '127.0.0.1', '::1'].includes(host)) say("!!! This is the site container's own address. PostgreSQL runs in a container of its own: put its name (for example, db) in DATABASE_URI.")
      // Uses the system resolver, including /etc/hosts for localhost, and supports IPv6.
      await connect({ host, port: dbPort })
    }
  }
  say(`\nSaved to ${report}`)
}
main().catch((error) => {
  say(`!!! Diagnostics stopped: ${error.message}`)
  process.exitCode = 1
}).finally(() => fs.closeSync(logFile))
NODE
