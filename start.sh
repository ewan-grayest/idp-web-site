#!/bin/sh
# Builds and starts the site in Docker in the local environment, at http://localhost:3000
# Usage: ./start.sh [--open-browser]
#   --open-browser  open the site in the browser once it is ready
set -e
cd "$(dirname "$0")"

open_browser=
for arg in "$@"; do
  case "$arg" in
    --open-browser) open_browser=1 ;;
    *) echo "Unknown option: $arg"; echo "Usage: ./start.sh [--open-browser]"; exit 1 ;;
  esac
done

if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running. Open Docker Desktop, wait until it says it's running, then run ./start.sh again."
  exit 1
fi

# First run: make a private settings file with a fresh random secret
if [ ! -f .env ]; then
  cp .env.example .env
  secret=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 48)
  sed -i.bak "s|^PAYLOAD_SECRET=.*|PAYLOAD_SECRET=$secret|" .env && rm -f .env.bak
  echo "Created .env with a new secret."
fi

# Data lives in the persistent Docker volumes site_media, site_backup and site_db ("Data locations" in CLAUDE.md).
# Data still in the places used before 2026-11-08 would look like an empty site: move it first
setting() { sed -n "s/^$1=//p" .env | tail -1 | sed "s/^[\"']//; s/[\"']\$//"; }
old=
[ -z "$(setting MEDIA_DIR)$(setting PGDATA_DIR)" ] || old="the folders set as MEDIA_DIR or PGDATA_DIR in .env"
if docker volume inspect site_pgdata >/dev/null 2>&1 && ! docker volume inspect site_db >/dev/null 2>&1; then old="${old:+$old, and }the Docker volume site_pgdata"; fi
if [ -n "$(ls backups/*.tar 2>/dev/null)" ] && ! docker volume inspect site_backup >/dev/null 2>&1; then old="${old:+$old, and }the backups folder"; fi
if docker volume inspect site_backups >/dev/null 2>&1 && ! docker volume inspect site_backup >/dev/null 2>&1; then old="${old:+$old, and }the Docker volume site_backups (BACKUPS_MOUNT)"; fi
if [ -n "$old" ]; then
  echo "Your content is still in $old."
  echo "Move it into the Docker volumes with scripts/move-data.sh, then run ./start.sh again."
  exit 1
fi

docker compose up -d --build

# Rebuilds leave old image versions and build cache behind. Remove only those:
# never volumes, which hold the data, and never images still tagged or layers still in use.
echo "Freeing Docker storage:"
docker image prune -f | tail -1
docker builder prune -f | tail -1

printf "Waiting for the site"
for i in $(seq 1 60); do
  if curl -fs -o /dev/null http://localhost:3000/; then
    echo " ready."
    echo "Site:  http://localhost:3000"
    echo "Admin: http://localhost:3000/admin (first visit asks you to create an account)"
    if [ -n "$open_browser" ]; then
      open http://localhost:3000 || echo "Couldn't open the browser. Open http://localhost:3000 yourself."
    fi
    exit 0
  fi
  printf "."
  sleep 2
done
echo
echo "The site didn't answer yet. Check the log with: docker compose logs app"
exit 1
