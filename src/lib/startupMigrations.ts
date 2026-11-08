/**
 * Applies the committed migrations (src/migrations) every time the site starts, in production and in `npm run dev`.
 * Called from `onInit` in src/payload.config.ts, in place of Payload's own `prodMigrations`.
 *
 * Payload's way broke the local site whenever development had touched its database. `npm run dev` and
 * `npx payload run` pushed the schema straight in and left a mark (`payload_migrations`, batch -1). The next production
 * start then stopped to ask in the terminal whether to go on, and a container has no terminal, so every page hung for
 * good. Answered, the migrations stopped at the first table or column development had already made («already exists»)
 * and the site kept restarting. Here instead:
 * - the mark is removed, with a line in the log;
 * - a migration that stops on something already in the database runs again one statement at a time, skipping what is
 *   already there, and the log lists what was skipped. Any other error still stops the start, as before.
 * Development no longer pushes the schema (`push: false`), so only older code leaves new marks.
 */
import { sql, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload, type PayloadRequest } from 'payload'

export type StartupMigration = { name: string; up: (args: MigrateUpArgs) => Promise<void> }

type Rows = { rows: Record<string, unknown>[] }
type Db = { execute: (query: ReturnType<typeof sql.raw>) => Promise<Rows> }
type Adapter = {
  drizzle: Db & { dialect: { sqlToQuery: (query: unknown) => { sql: string; params: unknown[] } } }
  sessions?: Record<string, { db: Db } | undefined>
}

// PostgreSQL error codes meaning "it is already there": a table or index, a type or constraint, a column, a schema
const EXISTS = new Set(['42P07', '42710', '42701', '42P06'])
// And "it is not there": a table, a type or constraint, a column. Skipped only when removing or renaming it
const GONE = new Set(['42P01', '42704', '42703'])

/** The PostgreSQL error code of an error, also when the database layer wrapped it */
export function errorCode(err: unknown): string | undefined {
  let e = err as { code?: unknown; cause?: unknown } | undefined
  for (let depth = 0; e && depth < 5; depth++, e = e.cause as typeof e) {
    if (typeof e.code === 'string') return e.code
  }
  return undefined
}

/** Whether a whole migration failed in a way that running it one statement at a time could get past */
export const worthRetrying = (err: unknown) => {
  const code = errorCode(err) ?? ''
  return EXISTS.has(code) || GONE.has(code)
}

/** Whether one statement failed only because the database already looks the way it would leave it */
export function alreadyDone(err: unknown, statement: string) {
  const code = errorCode(err) ?? ''
  return EXISTS.has(code) || (GONE.has(code) && /\b(DROP|RENAME)\b/i.test(statement))
}

/** Splits SQL into statements at `;`, leaving quoted text and names, dollar-quoted bodies and comments whole */
export function splitStatements(text: string): string[] {
  const out: string[] = []
  let start = 0
  let i = 0
  const skipTo = (end: number, length: number) => (i = end < 0 ? text.length : end + length)
  while (i < text.length) {
    const c = text[i]
    if (c === "'" || c === '"') {
      // A doubled quote inside closes and reopens, which comes to the same
      skipTo(text.indexOf(c, i + 1), 1)
      continue
    }
    if (c === '-' && text[i + 1] === '-') {
      skipTo(text.indexOf('\n', i), 1)
      continue
    }
    if (c === '/' && text[i + 1] === '*') {
      skipTo(text.indexOf('*/', i + 2), 2)
      continue
    }
    const tag = c === '$' ? /^\$(?:[A-Za-z_]\w*)?\$/.exec(text.slice(i))?.[0] : undefined
    if (tag) {
      skipTo(text.indexOf(tag, i + tag.length), tag.length)
      continue
    }
    if (c === ';') {
      out.push(text.slice(start, i))
      start = i + 1
    }
    i++
  }
  out.push(text.slice(start))
  return out.map((s) => s.trim()).filter(Boolean)
}

const firstLine = (statement: string) => statement.split('\n')[0].trim()

/** Applies the migrations not yet recorded in the database, oldest first */
export async function migrateOnStart(payload: Payload, migrations: StartupMigration[]) {
  const db = (payload.db as unknown as Adapter).drizzle
  const { rows: table } = await db.execute(sql`select to_regclass('payload_migrations') as t`)
  const recorded = table[0]?.t ? (await db.execute(sql`select name, batch from payload_migrations`)).rows : []

  if (recorded.some((m) => Number(m.batch) === -1)) {
    await db.execute(sql`delete from payload_migrations where batch = -1`)
    payload.logger.warn(
      'Removed the mark development leaves in the database (payload_migrations, batch -1): ' +
        'with it, the site would wait for an answer in the terminal and never open',
    )
  }

  const done = new Set(recorded.map((m) => String(m.name)))
  const pending = migrations.filter((m) => !done.has(m.name))
  if (!pending.length) return
  const batch = Math.max(0, ...recorded.map((m) => Number(m.batch) || 0)) + 1
  for (const migration of pending) await runMigration(payload, migration, batch)
}

/** Runs one migration in a transaction and records it, as Payload does */
async function inTransaction(payload: Payload, name: string, batch: number, work: (db: Db, req: PayloadRequest) => Promise<void>) {
  const req = await createLocalReq({}, payload)
  await initTransaction(req)
  try {
    const adapter = payload.db as unknown as Adapter
    const id = req.transactionID ? String(await req.transactionID) : ''
    await work(adapter.sessions?.[id]?.db ?? adapter.drizzle, req)
    await payload.create({ collection: 'payload-migrations', data: { name, batch }, req })
    await commitTransaction(req)
  } catch (err) {
    await killTransaction(req)
    throw err
  }
}

/** The statements a migration would run, without running them. Only for migrations that run nothing but SQL */
async function statementsOf(payload: Payload, migration: StartupMigration) {
  const queries: unknown[] = []
  const recorder = { execute: async (query: unknown) => (queries.push(query), { rows: [] }) }
  // No payload or req: a migration that also changes documents through Payload fails here and is not retried
  await migration.up({ db: recorder, payload: undefined, req: undefined } as unknown as MigrateUpArgs)
  const { dialect } = (payload.db as unknown as Adapter).drizzle
  return queries.flatMap((query) => {
    const { sql: text, params } = dialect.sqlToQuery(query)
    if (params.length) throw new Error('A migration with parameters cannot be split into statements')
    return splitStatements(text)
  })
}

/** Stops the start the way Payload does: production exits so the host restarts it, development shows the error */
function fail(payload: Payload, name: string, err: unknown): never {
  payload.logger.error({ err, msg: `Error running migration ${name}` })
  if (process.env.NODE_ENV === 'production') process.exit(1)
  throw err
}

async function runMigration(payload: Payload, migration: StartupMigration, batch: number) {
  const started = Date.now()
  payload.logger.info(`Migrating: ${migration.name}`)
  let firstError: unknown
  try {
    await inTransaction(payload, migration.name, batch, (db, req) => migration.up({ db, payload, req } as unknown as MigrateUpArgs))
    payload.logger.info(`Migrated:  ${migration.name} (${Date.now() - started}ms)`)
    return
  } catch (err) {
    if (!worthRetrying(err)) fail(payload, migration.name, err)
    firstError = err
  }

  // Development already made part of it: run it again one statement at a time and skip what is already there
  let statements: string[]
  try {
    statements = await statementsOf(payload, migration)
  } catch {
    fail(payload, migration.name, firstError)
  }
  const skipped: string[] = []
  try {
    await inTransaction(payload, migration.name, batch, async (db) => {
      for (const statement of statements) {
        await db.execute(sql.raw('SAVEPOINT idp_statement'))
        try {
          await db.execute(sql.raw(statement))
          await db.execute(sql.raw('RELEASE SAVEPOINT idp_statement'))
        } catch (err) {
          if (!alreadyDone(err, statement)) throw err
          await db.execute(sql.raw('ROLLBACK TO SAVEPOINT idp_statement'))
          skipped.push(statement)
        }
      }
    })
  } catch (err) {
    fail(payload, migration.name, err)
  }
  payload.logger.warn(
    `Migrated:  ${migration.name} (${Date.now() - started}ms). ${skipped.length} of ${statements.length} statements ` +
      `were already in the database, made by development, and were skipped:\n${skipped.map((s) => `  ${firstLine(s)}`).join('\n')}`,
  )
}
