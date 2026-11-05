# Shared helpers for backup.sh, restore.sh, verify-backup.sh and schedule-backup.sh. Not run on its own.
# Works with bash 3.2 (macOS) and Linux. Reaches the data through Docker, so the database and media
# can be named volumes or host folders.

set -eu

SITE_DIR=$(cd "$(dirname "$0")/.." && pwd)
MODE=local
FORMAT_VERSION=1

say() { printf '%s\n' "$*"; }
log() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { printf 'Error: %s\n' "$*" >&2; exit 1; }

# Pick the compose setup: the local dev site (docker-compose.yml) or production (deploy/docker-compose.prod.yml)
use_mode() {
  MODE=$1
  if [ "$MODE" = prod ]; then
    [ -f "$SITE_DIR/deploy/.env" ] || die "deploy/.env not found: production settings are missing"
    COMPOSE_HINT="docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env"
    DEFAULT_BACKUP_DIR="$SITE_DIR/deploy/backups"
  else
    COMPOSE_HINT="docker compose"
    DEFAULT_BACKUP_DIR="$SITE_DIR/backups"
  fi
  # Optional settings for backups (BACKUP_DIR, KEEP_LAST, KEEP_MONTHLY, BACKUP_UPLOAD_CMD), one NAME=value per line
  settings="$SITE_DIR/backup.env"; [ "$MODE" = prod ] && settings="$SITE_DIR/deploy/backup.env"
  if [ -f "$settings" ]; then set -a; . "$settings"; set +a; fi
  BACKUP_DIR=${BACKUP_DIR:-$DEFAULT_BACKUP_DIR}
  # Where the app keeps uploads inside its container
  APP_MEDIA_PATH=${APP_MEDIA_PATH:-/app/media}
}

# docker compose for the chosen setup (paths quoted: the site folder may contain spaces)
dc() {
  if [ "$MODE" = prod ]; then
    docker compose --progress quiet -f "$SITE_DIR/deploy/docker-compose.prod.yml" --env-file "$SITE_DIR/deploy/.env" "$@"
  else
    docker compose --progress quiet -f "$SITE_DIR/docker-compose.yml" "$@"
  fi
}

need_docker() {
  command -v docker >/dev/null 2>&1 || die "docker is not installed"
  docker info >/dev/null 2>&1 || die "Docker isn't running. Start Docker (Docker Desktop in the local environment) and try again."
}

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'
  else shasum -a 256 "$1" | awk '{print $1}'; fi
}

is_running() { [ -n "$(dc ps --status running -q "$1" 2>/dev/null)" ]; }

# Start the database if needed and wait until it accepts connections. Asking over TCP skips the
# socket-only server the postgres image runs while it sets up a new, empty database.
db_up() {
  if ! is_running db; then
    log "Starting the database"
    dc up -d db >/dev/null
  fi
  i=0
  until dc exec -T db sh -c 'pg_isready -q -h 127.0.0.1 -U "$POSTGRES_USER"' 2>/dev/null; do
    i=$((i + 1)); [ $i -lt 60 ] || die "the database did not start; see: $COMPOSE_HINT logs db"
    sleep 2
  done
}

# psql inside the db container, as the site's database user
db_sql() { dc exec -T db sh -c 'psql -X -q -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"' sh "$@"; }

# Exact row count of every table, one "table|count" per line
TABLE_COUNTS_SQL="select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1"

# Run a shell command in the app container: inside the running one, or a temporary one on the same volumes
app_sh() {
  user=$1; shift
  if is_running app && [ "$user" = app ]; then
    dc exec -T app sh -c "$*"
  else
    dc run --rm --no-deps -T --user "$user" app sh -c "$*"
  fi
}

# Only one backup or restore at a time
take_lock() {
  mkdir -p "$BACKUP_DIR"
  LOCK="$BACKUP_DIR/.lock"
  if ! mkdir "$LOCK" 2>/dev/null; then
    die "another backup or restore is running (if not, remove $LOCK)"
  fi
  trap 'rm -rf "$LOCK" ${WORK:+"$WORK"}' EXIT INT TERM
}

# Check an archive's outer checksum, unpack it into $1 and check the checksum of every file inside
unpack_and_check() {
  archive=$1; dest=$2
  [ -f "$archive" ] || die "no such file: $archive"
  if [ -f "$archive.sha256" ]; then
    want=$(awk '{print $1}' "$archive.sha256")
    got=$(sha256_of "$archive")
    [ "$want" = "$got" ] || die "checksum mismatch for $(basename "$archive"): the file is damaged or incomplete"
    say "  archive checksum   OK"
  else
    say "  archive checksum   skipped (no $(basename "$archive").sha256 beside it)"
  fi
  tar -xf "$archive" -C "$dest" || die "cannot unpack $(basename "$archive")"
  [ -f "$dest/manifest.txt" ] && [ -f "$dest/SHA256SUMS" ] || die "not an IDP site backup (manifest or checksums missing)"
  while read -r sum name; do
    [ -f "$dest/$name" ] || die "$name is missing from the backup"
    [ "$(sha256_of "$dest/$name")" = "$sum" ] || die "$name inside the backup is damaged"
  done < "$dest/SHA256SUMS"
  say "  file checksums     OK"
}

manifest_get() { sed -n "s/^$2=//p" "$1/manifest.txt" | head -n 1; }
