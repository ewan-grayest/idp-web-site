#!/bin/sh
# The site the browser tests run against (npm run test:e2e starts it): a dev server on port 3100 with its own database,
# uploads and backups. The tests sign in, change site-wide settings, add and delete projects and make backups, so they
# must never reach the site ./start.sh runs on localhost:3000 or its data.
# Creates the database on the local PostgreSQL when it is missing (docker compose up -d db), applies the migrations and
# adds the sample content. E2E_DATABASE_URI picks another database.
set -e
cd "$(dirname "$0")/.."

export DATABASE_URI="${E2E_DATABASE_URI:-postgres://idp:idp@127.0.0.1:5432/idp_e2e}"
export MEDIA_DIR="$PWD/.e2e/media" BACKUPS_DIR="$PWD/.e2e/backups" NEXT_PUBLIC_SITE_URL=http://localhost:3100
mkdir -p "$MEDIA_DIR" "$BACKUPS_DIR"

node --input-type=module -e '
import pg from "pg"
const url = new URL(process.env.DATABASE_URI)
const name = decodeURIComponent(url.pathname.slice(1))
if (!name || name === "idp") {
  console.error(`The browser tests need a database of their own, not "${name}": that is the site ./start.sh runs.`)
  process.exit(1)
}
url.pathname = "/postgres"
const client = new pg.Client({ connectionString: url.toString() })
await client.connect()
const { rowCount } = await client.query("select 1 from pg_database where datname = $1", [name])
if (!rowCount) {
  await client.query(`create database ${client.escapeIdentifier(name)}`)
  console.log(`Created the test database ${name}`)
}
await client.end()
'
# Migrations apply as it starts; the samples are only added where missing
npx payload run scripts/seed.ts
exec npx next dev --port 3100
