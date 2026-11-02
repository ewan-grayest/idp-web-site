#!/bin/sh
# Builds and starts the site in Docker on this computer, then opens it at http://localhost:3000
set -e
cd "$(dirname "$0")"

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

# Folders picked in .env for the content (MEDIA_DIR, PGDATA_DIR; empty means Docker volumes):
# create them and check Docker can really reach them before starting
for name in MEDIA_DIR PGDATA_DIR; do
  eval "dir=\${$name:-}"
  [ -n "$dir" ] || dir=$(sed -n "s/^$name=//p" .env | tail -1 | sed "s/^[\"']//; s/[\"']\$//")
  [ -n "$dir" ] || continue
  case "$dir" in
    /*) ;;
    *) echo "$name in .env must be a full path starting with /, not \"$dir\"."; exit 1 ;;
  esac
  mkdir -p "$dir"
  # Docker Desktop silently uses a folder inside its own disk for paths it isn't sharing, so check a file written there appears here.
  # Mounted over the image's own volume path, so no throwaway Docker volume is created
  docker run --rm -v "$dir":/var/lib/postgresql/data postgres:16 touch /var/lib/postgresql/data/.idp-docker-check >/dev/null 2>&1 || true
  if [ ! -f "$dir/.idp-docker-check" ]; then
    echo "Docker can't use the folder $dir ($name)."
    echo "In Docker Desktop open Settings > Resources > File sharing, add that folder (or one above it), click Apply & restart, then run ./start.sh again."
    exit 1
  fi
  docker run --rm -v "$dir":/var/lib/postgresql/data postgres:16 rm -f /var/lib/postgresql/data/.idp-docker-check
  # PostgreSQL only creates a database in an empty folder; Finder's hidden .DS_Store would block it
  if [ "$name" = PGDATA_DIR ] && [ ! -f "$dir/PG_VERSION" ]; then
    rm -f "$dir/.DS_Store"
    if [ -n "$(ls -A "$dir")" ]; then
      echo "PGDATA_DIR ($dir) has files but no database in it. Point it at an empty folder or at a copy of the database files."
      exit 1
    fi
  fi
done

docker compose up -d --build

printf "Waiting for the site"
for i in $(seq 1 60); do
  if curl -fs -o /dev/null http://localhost:3000/; then
    echo " ready."
    echo "Site:  http://localhost:3000"
    echo "Admin: http://localhost:3000/admin (first visit asks you to create an account)"
    command -v open >/dev/null && open http://localhost:3000
    exit 0
  fi
  printf "."
  sleep 2
done
echo
echo "The site didn't answer yet. Check the log with: docker compose logs app"
exit 1
