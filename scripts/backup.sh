#!/usr/bin/env bash
# Full backup of the site: the PostgreSQL database and every uploaded file, in one checked archive.
#
#   scripts/backup.sh              the local dev site (docker-compose.yml)
#   scripts/backup.sh --prod       production (deploy/docker-compose.prod.yml + deploy/.env)
#   scripts/backup.sh --with-env   also put the settings file (.env, holds passwords) into the archive
#
# Settings, all optional: environment variables, or lines in backup.env (deploy/backup.env with --prod):
#   KEEP_LAST          how many newest backups to keep (default 14)
#   KEEP_MONTHLY       also keep the newest backup of each of this many past months (default 6)
#   BACKUP_UPLOAD_CMD  optional off-site copy, run with the archive path as $1,
#                      e.g. 'rclone copy "$1" yandex:idp-backups' or 'scp "$1" backup@my-server:/srv/idp/'
#
# Output: idp-<local|prod>-<date>_<time>.tar and a .sha256 file beside it, in the backup volume (/data/backup in the
# site's container), where the admin lists them too. Copy one out with scripts/get-backup.sh.
# Restore with scripts/restore.sh, check with scripts/verify-backup.sh.

. "$(dirname "$0")/backup-common.sh"

mode=local; with_env=no; label=""
while [ $# -gt 0 ]; do
  case $1 in
    --prod) mode=prod ;;
    --with-env) with_env=yes ;;
    --label) label="-$2"; shift ;;  # used by restore.sh for its safety copy
    -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
    *) die "unknown option: $1 (see --help)" ;;
  esac
  shift
done

use_mode "$mode"
need_docker
umask 077  # backups hold enquiries (names, emails): readable by this user only
take_lock
KEEP_LAST=${KEEP_LAST:-14}
KEEP_MONTHLY=${KEEP_MONTHLY:-6}

stamp=$(date '+%Y-%m-%d_%H%M%S')
name="idp-$MODE$label-$stamp"
WORK=$(mktemp -d "${TMPDIR:-/tmp}/idp-backup.XXXXXX")
log "Backing up the $MODE site as $name.tar"

# 1. Database: a pg_dump custom-format file (compressed, restorable table by table)
db_up
dc exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -Z 6' > "$WORK/db.dump"
[ -s "$WORK/db.dump" ] || die "the database dump is empty"
db_sql -c "$TABLE_COUNTS_SQL" > "$WORK/db-counts.txt"
pg_version=$(db_sql -c 'show server_version' | tr -d '\r')
last_migration=$(db_sql -c "select coalesce((select name from payload_migrations where batch > 0 order by id desc limit 1), '')" 2>/dev/null | tr -d '\r' || true)
log "  database: $(wc -c < "$WORK/db.dump" | tr -d ' ') bytes, $(wc -l < "$WORK/db-counts.txt" | tr -d ' ') tables"

# 2. Media: every uploaded file and its resized copies, taken after the dump so the database never
#    points at a file the archive lacks (a file uploaded in between is simply extra)
app_sh app "cd '$APP_MEDIA_PATH' && tar -cf - ." > "$WORK/media.tar"
media_files=$(tar -tf "$WORK/media.tar" | grep -cv '/$' || true)
log "  media: $media_files files, $(wc -c < "$WORK/media.tar" | tr -d ' ') bytes"

# 3. Settings, only when asked: they hold the database password and PAYLOAD_SECRET
if [ "$with_env" = yes ]; then
  mkdir -p "$WORK/env"
  if [ "$MODE" = prod ]; then cp "$SITE_DIR/deploy/.env" "$WORK/env/deploy.env"
  elif [ -f "$SITE_DIR/.env" ]; then cp "$SITE_DIR/.env" "$WORK/env/site.env"; fi
  log "  settings: included (keep this archive private)"
fi

cat > "$WORK/manifest.txt" <<EOF
format=$FORMAT_VERSION
created=$(date '+%Y-%m-%dT%H:%M:%S%z')
mode=$MODE
host=$(hostname)
postgres=$pg_version
last_migration=$last_migration
tables=$(wc -l < "$WORK/db-counts.txt" | tr -d ' ')
media_files=$media_files
media_path=$APP_MEDIA_PATH
settings_included=$with_env
EOF

(cd "$WORK" && find . -type f ! -name SHA256SUMS | sed 's|^\./||' | sort | while read -r f; do
  printf '%s  %s\n' "$(sha256_of "$f")" "$f"; done > SHA256SUMS)

mkdir "$WORK/out"
(cd "$WORK" && tar -cf "out/$name.tar" manifest.txt SHA256SUMS db.dump db-counts.txt media.tar $( [ -d env ] && echo env ))
printf '%s  %s\n' "$(sha256_of "$WORK/out/$name.tar")" "$name.tar" > "$WORK/out/$name.tar.sha256"
# Into the backup volume, checksum last: the admin and the other scripts only trust a backup with its checksum beside it
bk_put "$WORK/out/$name.tar" && bk_put "$WORK/out/$name.tar.sha256" || die "couldn't save the backup into the volume $BACKUP_VOLUME"
log "Done: $name.tar ($(wc -c < "$WORK/out/$name.tar" | tr -d ' ') bytes) in the backup volume"

# 4. Optional off-site copy (Russian-payable or your own storage, e.g. Yandex Object Storage, Selectel, a home NAS)
if [ -n "${BACKUP_UPLOAD_CMD:-}" ] && [ -z "$label" ]; then
  log "Copying off-site"
  sh -c "$BACKUP_UPLOAD_CMD" sh "$WORK/out/$name.tar" && sh -c "$BACKUP_UPLOAD_CMD" sh "$WORK/out/$name.tar.sha256" \
    || log "WARNING: the off-site copy failed; the local backup is fine"
fi

# 5. Rotation: keep the KEEP_LAST newest plus the newest one of each of the last KEEP_MONTHLY months.
#    Only regular backups of this mode are rotated; safety copies made by restore.sh stay until you delete them.
[ -n "$label" ] && exit 0
kept=0; months=""; nmonths=0
for f in $(bk_list | sort -r); do
  month=$(printf '%s' "$f" | sed -E "s/^idp-$MODE-([0-9]{4}-[0-9]{2}).*/\1/")
  keep=no
  if [ $kept -lt "$KEEP_LAST" ]; then keep=yes; fi
  case " $months " in
    *" $month "*) ;;
    *) if [ $nmonths -lt "$KEEP_MONTHLY" ]; then keep=yes; months="$months $month"; nmonths=$((nmonths + 1)); fi ;;
  esac
  if [ $keep = yes ]; then kept=$((kept + 1))
  else bk 'rm -f "$1" "$1.sha256"' "$f"; log "  removed old backup $f"; fi
done
