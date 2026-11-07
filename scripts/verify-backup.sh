#!/usr/bin/env bash
# Check that backups are complete and restorable, without touching the site.
#
#   scripts/verify-backup.sh data/backup/idp-local-....tar     checksums, readable dump and media list
#   scripts/verify-backup.sh --deep data/backup/idp-....tar    also restores the database into a throwaway
#                                                          PostgreSQL container and compares every table's rows
#   scripts/verify-backup.sh --latest [--prod] [--deep]    the newest backup in the backup folder

. "$(dirname "$0")/backup-common.sh"

mode=local; deep=no; latest=no; archive=""
while [ $# -gt 0 ]; do
  case $1 in
    --prod) mode=prod ;;
    --deep) deep=yes ;;
    --latest) latest=yes ;;
    -h|--help) sed -n '2,8p' "$0"; exit 0 ;;
    -*) die "unknown option: $1 (see --help)" ;;
    *) archive=$1 ;;
  esac
  shift
done
use_mode "$mode"
if [ "$latest" = yes ]; then
  archive=$(ls -1 "$BACKUP_DIR"/idp-"$MODE"-[0-9]*.tar 2>/dev/null | sort | tail -n 1)
  [ -n "$archive" ] || die "no backups in $BACKUP_DIR"
fi
[ -n "$archive" ] || die "which backup? Example: scripts/verify-backup.sh --latest"

say "Checking $(basename "$archive")"
WORK=$(mktemp -d "${TMPDIR:-/tmp}/idp-verify.XXXXXX")
pg=""
trap 'rm -rf "$WORK"; [ -n "$pg" ] && docker rm -f -v "$pg" >/dev/null 2>&1; true' EXIT INT TERM
unpack_and_check "$archive" "$WORK"

media_files=$(manifest_get "$WORK" media_files)
listed=$(tar -tf "$WORK/media.tar" | grep -cv '/$' || true)
[ "$listed" = "$media_files" ] || die "media.tar lists $listed files, the manifest says $media_files"
say "  media archive      readable, $listed files"

if [ "$deep" = yes ]; then
  need_docker
  pg="idp-verify-$$"
  docker run -d --name "$pg" --tmpfs /var/lib/postgresql/data -e POSTGRES_USER=idp -e POSTGRES_PASSWORD=verify -e POSTGRES_DB=idp postgres:16 >/dev/null
  i=0
  # The image starts PostgreSQL twice on first run (setup, then for real): wait for the second start
  until [ "$(docker logs "$pg" 2>&1 | grep -c 'ready to accept connections')" -ge 2 ]; do
    i=$((i + 1)); [ $i -lt 60 ] || die "the test database did not start"
    sleep 1
  done
  docker exec -i "$pg" pg_restore -U idp -d idp --no-owner --no-privileges --exit-on-error < "$WORK/db.dump" \
    || die "the database dump does not restore cleanly"
  docker exec "$pg" psql -X -q -At -U idp -d idp -c "$TABLE_COUNTS_SQL" > "$WORK/db-counts.now"
  diff "$WORK/db-counts.txt" "$WORK/db-counts.now" >&2 || die "row counts after a test restore differ from the backup"
  say "  test restore       OK, all $(wc -l < "$WORK/db-counts.txt" | tr -d ' ') tables have the same rows"
else
  docker info >/dev/null 2>&1 && docker run --rm -i postgres:16 pg_restore --list < "$WORK/db.dump" >/dev/null \
    && say "  database dump      readable" || say "  database dump      not opened (Docker not running); use --deep later"
fi
say "Backup OK"
