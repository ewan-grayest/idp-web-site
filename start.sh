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

# The data folder ("Data locations" in CLAUDE.md): media/, backup/ and db/ in DATA_DIR from .env, default ./data
setting() { sed -n "s/^$1=//p" .env | tail -1 | sed "s/^[\"']//; s/[\"']\$//"; }
dir=${DATA_DIR:-$(setting DATA_DIR)}
dir=${dir:-./data}
case "$dir" in /*) ;; *) dir="$PWD/${dir#./}" ;; esac
# On Linux the database container makes db/ readable by itself only: a folder this user can't open holds a database
has_db() { [ -f "$dir/db/PG_VERSION" ] || { [ -d "$dir/db" ] && ! ls "$dir/db" >/dev/null 2>&1; }; }

# Data still in the places used before 2026-11-08 would look like an empty site here: move it first
if ! has_db; then
  old=
  [ -z "$(setting MEDIA_DIR)$(setting PGDATA_DIR)" ] || old="the folders set as MEDIA_DIR or PGDATA_DIR in .env"
  [ -n "$old" ] || ! docker volume inspect site_pgdata >/dev/null 2>&1 || old="the Docker volume site_pgdata"
  if [ -n "$old" ]; then
    echo "Your content is still in $old, and $dir/db has no database yet."
    echo "Move it with scripts/move-data.sh, then run ./start.sh again."
    exit 1
  fi
fi

mkdir -p "$dir/media" "$dir/backup" "$dir/db"
# Docker Desktop silently uses a folder inside its own disk for paths it isn't sharing, so check a file written there appears here
docker run --rm -v "$dir":/data postgres:16 touch /data/.idp-docker-check >/dev/null 2>&1 || true
if [ ! -f "$dir/.idp-docker-check" ]; then
  echo "Docker can't use the folder $dir (DATA_DIR)."
  echo "In Docker Desktop open Settings > Resources > File sharing, add that folder (or one above it), click Apply & restart, then run ./start.sh again."
  exit 1
fi
rm -f "$dir/.idp-docker-check"
# PostgreSQL only creates a database in an empty folder; Finder's hidden .DS_Store would block it
if ! has_db; then
  rm -f "$dir/db/.DS_Store"
  if [ -n "$(ls -A "$dir/db")" ]; then
    echo "$dir/db has files but no database in it. Empty it, or put a copy of the database files there."
    exit 1
  fi
fi

docker compose up -d --build

# Rebuilds leave old image versions and build cache behind. Remove only those:
# never the data folder or volumes, and never images still tagged or layers still in use.
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
