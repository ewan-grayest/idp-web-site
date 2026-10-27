#!/usr/bin/env bash
# Restore the site from a backup made by backup.sh: replaces the whole database and all uploaded files.
#
#   scripts/restore.sh backups/idp-local-2026-10-25_030000.tar           the local dev site
#   scripts/restore.sh --prod deploy/backups/idp-prod-....tar            production
#
# Options:
#   --yes               don't ask for confirmation (for scripts)
#   --no-safety-backup  skip the automatic backup of the current state taken before restoring
#   --with-env          also put back the settings file saved with --with-env (the current one is kept as .env.before-restore)
#
# Works on an existing install or an empty one (a fresh copy of the site folder with its .env): the database
# and the app image are created as needed. The site is stopped during the restore and started again afterwards.

. "$(dirname "$0")/backup-common.sh"

mode=local; yes=no; safety=yes; with_env=no; archive=""
while [ $# -gt 0 ]; do
  case $1 in
    --prod) mode=prod ;;
    --yes) yes=yes ;;
    --no-safety-backup) safety=no ;;
    --with-env) with_env=yes ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    -*) die "unknown option: $1 (see --help)" ;;
    *) archive=$1 ;;
  esac
  shift
done
[ -n "$archive" ] || die "which backup? Example: scripts/restore.sh backups/idp-local-2026-10-25_030000.tar"
archive=$(cd "$(dirname "$archive")" && pwd)/$(basename "$archive")

use_mode "$mode"
need_docker

# 1. Check the archive before touching anything
log "Checking $(basename "$archive")"
WORK=$(mktemp -d "${TMPDIR:-/tmp}/idp-restore.XXXXXX")
trap 'rm -rf "$WORK"' EXIT INT TERM
unpack_and_check "$archive" "$WORK"
from_mode=$(manifest_get "$WORK" mode)
created=$(manifest_get "$WORK" created)
media_files=$(manifest_get "$WORK" media_files)
last_migration=$(manifest_get "$WORK" last_migration)
say "  made               $created on $(manifest_get "$WORK" host) ($from_mode site)"
say "  contents           database ($(manifest_get "$WORK" tables) tables), $media_files media files"

# The code must know every migration the backup's database has, or the app would refuse an unknown schema
if [ -n "$last_migration" ] && [ "$last_migration" != dev ] && ! grep -q "$last_migration" "$SITE_DIR/src/migrations/index.ts"; then
  die "the backup comes from newer site code (migration $last_migration is not in src/migrations). Update the code first."
fi
if [ "$with_env" = yes ] && [ ! -d "$WORK/env" ]; then die "this backup has no settings file (it was made without --with-env)"; fi

# 2. Confirm
if [ "$yes" != yes ]; then
  say ""
  say "This REPLACES the $MODE site's database and uploaded files with the backup from $created."
  [ "$safety" = yes ] && say "A backup of the current state is taken first (in $BACKUP_DIR, name contains 'pre-restore')."
  if [ ! -t 0 ]; then die "no terminal to confirm on; run again with --yes"; fi
  printf 'Type "restore" to continue: '
  read -r answer
  [ "$answer" = restore ] || die "cancelled, nothing was changed"
fi

# 3. Safety copy of what is there now (skipped when the database is empty, e.g. a fresh install)
db_up
if [ "$safety" = yes ] && [ "$(db_sql -c "select count(*) from information_schema.tables where table_schema = 'public'" | tr -d '\r')" != 0 ]; then
  log "Backing up the current state first"
  bash "$SITE_DIR/scripts/backup.sh" $( [ "$MODE" = prod ] && echo --prod ) --label pre-restore
fi

mkdir -p "$BACKUP_DIR"
LOCK="$BACKUP_DIR/.lock"
mkdir "$LOCK" 2>/dev/null || die "a backup or restore is running (if not, remove $LOCK)"
trap 'rm -rf "$WORK" "$LOCK"' EXIT INT TERM

# 4. Stop the site so nothing writes while we restore
log "Stopping the site"
dc stop app >/dev/null 2>&1 || true

# 5. Database: recreate it empty, then load the dump
log "Restoring the database"
dc exec -T db sh -c 'dropdb --force --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" -O "$POSTGRES_USER" "$POSTGRES_DB"'
dc exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges --exit-on-error' < "$WORK/db.dump"

db_sql -c "$TABLE_COUNTS_SQL" > "$WORK/db-counts.now"
if ! diff "$WORK/db-counts.txt" "$WORK/db-counts.now" >/dev/null; then
  diff "$WORK/db-counts.txt" "$WORK/db-counts.now" >&2 || true
  die "row counts after the restore differ from the backup (shown above)"
fi
say "  row counts         match the backup ($(wc -l < "$WORK/db-counts.txt" | tr -d ' ') tables)"

# 6. Media: empty the folder, unpack, give the files to the app user. Asked for as root; an image whose
#    entrypoint drops to the app user (after handing it /app/media) runs this as app, which works too.
log "Restoring media files"
app_sh root "find '$APP_MEDIA_PATH' -mindepth 1 -maxdepth 1 -exec rm -rf {} + && tar -xf - -C '$APP_MEDIA_PATH' && chown -R app:app '$APP_MEDIA_PATH'" < "$WORK/media.tar"
now_files=$(app_sh root "find '$APP_MEDIA_PATH' -type f | wc -l" | tr -d ' \r')
[ "$now_files" = "$media_files" ] || die "media: $now_files files after the restore, the backup has $media_files"
say "  media files        $now_files, match the backup"

# 7. Settings, only when asked
if [ "$with_env" = yes ]; then
  if [ "$MODE" = prod ]; then target="$SITE_DIR/deploy/.env"; src="$WORK/env/deploy.env"
  else target="$SITE_DIR/.env"; src="$WORK/env/site.env"; fi
  [ -f "$src" ] || die "the backup's settings file is for the other kind of site"
  [ -f "$target" ] && cp -p "$target" "$target.before-restore"
  cp "$src" "$target" && chmod 600 "$target"
  say "  settings           restored to $target (the old one is $target.before-restore). Rebuild if NEXT_PUBLIC_* values changed."
fi

# 8. Start the site again; it applies any newer migrations of the current code on start
if [ "${START_AFTER:-yes}" = yes ]; then
  log "Starting the site"
  dc up -d >/dev/null
  i=0
  until dc exec -T app sh -c 'wget -q -O /dev/null "http://$(hostname):3000/"' 2>/dev/null; do
    i=$((i + 1))
    if [ $i -ge 60 ]; then log "The site did not answer within 2 minutes; check: $COMPOSE_HINT logs app"; exit 1; fi
    sleep 2
  done
  log "The site is up"
fi
log "Restore finished"
