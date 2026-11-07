#!/usr/bin/env bash
# Imports the archived id-proekt.com and get-together.ru content (scripts/import-archive.ts) into the local dev site.
#
#   scripts/run-archive-import.sh
#
# 1. A full backup first (scripts/backup.sh); the import does not start if it fails.
# 2. A throwaway image with the site's code and ../content-source: Docker Desktop cannot bind-mount this folder.
# 3. The import, on the site's network and media volume, so new photos land where the app serves them.
# 4. Uploaded files handed to the app user, then the image removed.
# Everything is logged to logs/archive-import-<date>.log. Safe to re-run: the import only adds and fills empty fields.

set -euo pipefail
cd "$(dirname "$0")/.."

stamp=$(date '+%Y-%m-%d_%H%M%S')
. scripts/backup-common.sh
use_mode local
logs="$SITE_DIR/logs"
mkdir -p "$logs"
# Runs itself again with all output going through tee into the log (a pipe, not >(…): that needs /dev/fd)
if [ -z "${ARCHIVE_IMPORT_LOG:-}" ]; then
  export ARCHIVE_IMPORT_LOG="$logs/archive-import-$stamp.log"
  bash "$0" "$@" 2>&1 | tee -a "$ARCHIVE_IMPORT_LOG"
  exit "${PIPESTATUS[0]}"
fi
logfile=$ARCHIVE_IMPORT_LOG
image="idp-archive-import:$stamp"
echo "[$(date '+%F %T')] archive import, log: $logfile"

bash scripts/backup.sh

echo "[$(date '+%F %T')] building $image"
# A fresh buildx state folder: the default one may not be writable from a sandboxed shell; the build uses the default builder
export BUILDX_CONFIG=${BUILDX_CONFIG:-$logs/.buildx-$stamp}
docker build -q -t "$image" --build-context content=../content-source -f - . <<'EOF'
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund && npm cache clean --force
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY --from=content . /content
EOF
trap 'docker image rm -f "$image" >/dev/null 2>&1 || true; rm -rf "$logs/.buildx-$stamp"' EXIT

echo "[$(date '+%F %T')] importing"
docker run --rm --network site_default -v "${PROJECT}_media":/data/media --env-file .env \
  -e NODE_ENV=production -e MEDIA_DIR=/data/media -e CONTENT_DIR=/content \
  -e DATABASE_URI=postgres://idp:idp@db:5432/idp \
  "$image" npx payload run scripts/import-archive.ts

docker compose exec -T app chown -R app:app /data/media
docker image rm "$image" >/dev/null
rm -rf "$logs/.buildx-$stamp"
trap - EXIT
echo "[$(date '+%F %T')] done"
