#!/usr/bin/env bash
# Moves the site's data from the places used before 2026-11-08 into the data folder every setup now uses
# ("Data locations" in CLAUDE.md): media/, backup/ and db/ in DATA_DIR (default ./data, or deploy/data with --prod).
#
#   scripts/move-data.sh           the local dev site
#   scripts/move-data.sh --prod    production (deploy/docker-compose.prod.yml + deploy/.env)
#
# Old places: the Docker volumes <project>_media and <project>_pgdata, or the folders set as MEDIA_DIR and PGDATA_DIR
# in the settings file, and the backups/ folder (deploy/backups/ with --prod). It stops the site, copies each one into
# an empty new folder, and comments the old settings out. The old copies stay until you delete them yourself, so
# nothing is lost if something goes wrong. A new folder that already has files is left alone.

. "$(dirname "$0")/backup-common.sh"

mode=local
while [ $# -gt 0 ]; do
  case $1 in
    --prod) mode=prod ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) die "unknown option: $1 (see --help)" ;;
  esac
  shift
done
use_mode "$mode"
need_docker

if [ "$MODE" = prod ]; then env_file="$SITE_DIR/deploy/.env"; old_backups="$SITE_DIR/deploy/backups"
else env_file="$SITE_DIR/.env"; old_backups="$SITE_DIR/backups"; fi
setting() { [ -f "$env_file" ] && sed -n "s/^$1=//p" "$env_file" | tail -n 1 | sed "s/^[\"']//; s/[\"']\$//"; }
project=$(dc config 2>/dev/null | sed -n 's/^name: //p' | head -n 1)
[ -n "$project" ] || die "can't read the compose setup; check $COMPOSE_HINT config"

has_files() { [ -d "$1" ] && [ -n "$(ls -A "$1" 2>/dev/null | grep -v '^\.DS_Store$')" ]; }
volume_exists() { docker volume inspect "$1" >/dev/null 2>&1; }

# Copies one old place (a folder, or a Docker volume when $2 is "volume") into a new folder, through a container so
# owners and permissions stay as they are. Copies into the new folder only when it is empty
copy_in() {
  what=$1; kind=$2; from=$3; to=$4
  if has_files "$to"; then say "  $what: $to already has files, left alone"; return; fi
  mkdir -p "$to"
  if [ "$kind" = volume ]; then src=$from; else src=$(cd "$from" && pwd); fi
  docker run --rm -v "$src":/from:ro -v "$to":/to --entrypoint cp postgres:16 -a /from/. /to/ \
    || die "copying $what from $from failed; nothing was removed"
  say "  $what: copied from $from to $to"
}

# Docker Desktop refuses folders it doesn't share, or quietly uses one inside its own disk: check a file written there appears here
mkdir -p "$HOST_DATA_DIR"
docker run --rm -v "$HOST_DATA_DIR":/data --entrypoint touch postgres:16 /data/.idp-docker-check >/dev/null 2>&1 || true
if [ ! -f "$HOST_DATA_DIR/.idp-docker-check" ]; then
  say "Docker can't use the folder $HOST_DATA_DIR."
  say "In Docker Desktop open Settings > Resources > File sharing, add that folder (or one above it), click Apply & restart,"
  say "then run this again. Nothing was changed."
  exit 1
fi
rm -f "$HOST_DATA_DIR/.idp-docker-check"

log "Stopping the $MODE site"
dc stop >/dev/null 2>&1 || true

moved=no
old_media=$(setting MEDIA_DIR); old_db=$(setting PGDATA_DIR)
if [ -n "$old_media" ] && [ -d "$old_media" ]; then copy_in media folder "$old_media" "$HOST_DATA_DIR/media"; moved=yes
elif volume_exists "${project}_media"; then copy_in media volume "${project}_media" "$HOST_DATA_DIR/media"; moved=yes; fi
if [ -n "$old_db" ] && [ -d "$old_db" ]; then copy_in database folder "$old_db" "$HOST_DATA_DIR/db"; moved=yes
elif volume_exists "${project}_pgdata"; then copy_in database volume "${project}_pgdata" "$HOST_DATA_DIR/db"; moved=yes; fi
if has_files "$old_backups"; then
  if has_files "$HOST_DATA_DIR/backup"; then say "  backups: $HOST_DATA_DIR/backup already has files, left alone"
  else
    mkdir -p "$HOST_DATA_DIR/backup"
    cp -a "$old_backups/." "$HOST_DATA_DIR/backup/" && rm -rf "$HOST_DATA_DIR/backup/.lock"
    say "  backups: copied from $old_backups to $HOST_DATA_DIR/backup"
  fi
  moved=yes
fi

# The old settings would send `npm run dev` to the old folder: comment them out, keeping the values for reference
if [ -n "$old_media$old_db" ]; then
  cp -p "$env_file" "$env_file.before-move"
  sed -i.bak -E 's/^(MEDIA_DIR|PGDATA_DIR)=(.+)$/# \1=\2   (moved into DATA_DIR by scripts\/move-data.sh)/' "$env_file" && rm -f "$env_file.bak"
  say "  settings: MEDIA_DIR and PGDATA_DIR commented out in $env_file (the old file is $(basename "$env_file").before-move)"
fi

[ "$moved" = yes ] || { say "Nothing to move: no old data found."; exit 0; }
say ""
say "Done. Start the site ($([ "$MODE" = prod ] && echo "$COMPOSE_HINT up -d --build" || echo ./start.sh)) and check it."
say "Once it shows your content, delete the old copies yourself:"
volume_exists "${project}_media" && say "  docker volume rm ${project}_media"
volume_exists "${project}_pgdata" && say "  docker volume rm ${project}_pgdata"
[ -n "$old_media" ] && say "  the folder $old_media"
[ -n "$old_db" ] && say "  the folder $old_db"
has_files "$old_backups" && say "  the folder $old_backups"
exit 0
