#!/usr/bin/env bash
# Moves the site's data from the places used before 2026-11-08 into the persistent Docker volumes every setup now
# uses ("Data locations" in CLAUDE.md): <project>_media, <project>_backup and <project>_db, mounted at /data/media,
# /data/backup and /data/db.
#
#   scripts/move-data.sh           the local dev site
#   scripts/move-data.sh --prod    production (deploy/docker-compose.prod.yml + deploy/.env)
#
# Old places: the Docker volume <project>_pgdata, the folders once set as MEDIA_DIR and PGDATA_DIR in the settings
# file, the backups/ folder (deploy/backups/ with --prod) and the volume <project>_backups that BACKUPS_MOUNT=backups
# chose on a Mac where Docker Desktop refused the backups/ folder. The volume <project>_media keeps its name and is used
# as it is. It stops the site and copies each old place into a new, empty volume, through Docker, so no folder needs
# sharing with Docker Desktop. The old copies stay until you delete them yourself. A volume that already has files is
# left alone.

. "$(dirname "$0")/backup-common.sh"

mode=local
while [ $# -gt 0 ]; do
  case $1 in
    --prod) mode=prod ;;
    -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
    *) die "unknown option: $1 (see --help)" ;;
  esac
  shift
done
use_mode "$mode"
need_docker

if [ "$MODE" = prod ]; then env_file="$SITE_DIR/deploy/.env"; old_backups="$SITE_DIR/deploy/backups"
else env_file="$SITE_DIR/.env"; old_backups="$SITE_DIR/backups"; fi
setting() { [ -f "$env_file" ] && sed -n "s/^$1=//p" "$env_file" | tail -n 1 | sed "s/^[\"']//; s/[\"']\$//"; }
has_files() { [ -d "$1" ] && [ -n "$(ls -A "$1" 2>/dev/null | grep -v '^\.DS_Store$')" ]; }
volume_exists() { docker volume inspect "$1" >/dev/null 2>&1; }
# Runs a shell command in a throwaway container with the volume at /v, and the old volume at /from if given
in_volume() {
  vol=$1; cmd=$2; shift 2
  docker run --rm -i -v "${PROJECT}_$vol":/v "$@" --entrypoint sh postgres:16 -c "$cmd"
}
volume_empty() { in_volume "$1" '[ -z "$(ls -A /v)" ]'; }

# Copies a host folder ("folder") or another Docker volume ("volume") into one of this project's volumes, if it is empty.
# A folder goes in as a tar stream, so Docker Desktop needs no access to it
copy_in() {
  what=$1; kind=$2; from=$3; vol=$4
  compose_volume "$vol"
  if ! volume_empty "$vol"; then say "  $what: the volume ${PROJECT}_$vol already has files, left alone"; return; fi
  if [ "$kind" = volume ]; then
    in_volume "$vol" 'cp -a /from/. /v/' -v "$from":/from:ro || die "copying $what from $from failed; nothing was removed"
  else
    # COPYFILE_DISABLE and --no-xattrs: leave out macOS file attributes, which add ._ files and warnings on the other side
    COPYFILE_DISABLE=1 tar --no-xattrs -C "$from" --exclude .DS_Store -cf - . | in_volume "$vol" 'tar -xf - -C /v' || die "copying $what from $from failed; nothing was removed"
  fi
  say "  $what: copied from $from into the volume ${PROJECT}_$vol"
}

# An empty data/ folder left by the first version of this script (2026-11-08)
for d in "$SITE_DIR/data" "$SITE_DIR/deploy/data"; do rmdir "$d/media" "$d/backup" "$d/db" "$d" 2>/dev/null || true; done

log "Stopping the $MODE site"
dc stop >/dev/null 2>&1 || true

moved=no
old_media=$(setting MEDIA_DIR); old_db=$(setting PGDATA_DIR)
if [ -n "$old_media" ] && [ -d "$old_media" ]; then copy_in media folder "$old_media" media; moved=yes; fi
if [ -n "$old_db" ] && [ -d "$old_db" ]; then
  copy_in database folder "$old_db" db
  # Files from a host folder keep the host's owner; PostgreSQL wants its own (uid 999) and a private folder
  in_volume db 'chown -R 999:999 /v && chmod 700 /v'
  moved=yes
elif volume_exists "${PROJECT}_pgdata"; then copy_in database volume "${PROJECT}_pgdata" db; moved=yes; fi
if has_files "$old_backups"; then
  copy_in backups folder "$old_backups" backup
  # The site's user (uid 100) lists and restores them from the admin; a lock left by an interrupted run is dropped
  in_volume backup 'rm -rf /v/.lock && chown -R 100:101 /v'
  moved=yes
fi
# Backups made from the admin under BACKUPS_MOUNT=backups: added beside any from the folder, none overwritten
if volume_exists "${PROJECT}_backups" && [ "$(docker run --rm -v "${PROJECT}_backups":/from:ro --entrypoint sh postgres:16 -c 'ls -A /from | grep -v "^\.lock$" | head -n 1')" ]; then
  compose_volume backup
  in_volume backup 'cp -an /from/. /v/ && rm -rf /v/.lock && chown -R 100:101 /v' -v "${PROJECT}_backups":/from:ro || die "copying backups from the volume ${PROJECT}_backups failed; nothing was removed"
  say "  backups: copied from the volume ${PROJECT}_backups into the volume ${PROJECT}_backup"
  moved=yes
fi

# The old settings would point `npm run dev` at the old folders: comment them out, keeping the values for reference
if [ -n "$old_media$old_db$(setting BACKUPS_MOUNT)" ]; then
  cp -p "$env_file" "$env_file.before-move"
  sed -i.bak -E 's/^(MEDIA_DIR|PGDATA_DIR|BACKUPS_MOUNT)=(.+)$/# \1=\2   (moved into a Docker volume by scripts\/move-data.sh)/' "$env_file" && rm -f "$env_file.bak"
  say "  settings: MEDIA_DIR, PGDATA_DIR and BACKUPS_MOUNT commented out in $env_file (the old file is $(basename "$env_file").before-move)"
fi

[ "$moved" = yes ] || { say "Nothing to move: no old data found."; exit 0; }
say ""
say "Done. Start the site ($([ "$MODE" = prod ] && echo "$COMPOSE_HINT up -d --build" || echo ./start.sh)) and check it."
say "Once it shows your content, delete the old copies yourself:"
volume_exists "${PROJECT}_pgdata" && say "  docker volume rm ${PROJECT}_pgdata"
volume_exists "${PROJECT}_backups" && say "  docker volume rm ${PROJECT}_backups"
[ -n "$old_media" ] && say "  the folder $old_media"
[ -n "$old_db" ] && say "  the folder $old_db"
has_files "$old_backups" && say "  the folder $old_backups"
exit 0
