#!/bin/sh
# Starts as root only to hand the upload folder to the app user, then runs the site as that user.
# A host folder set as MEDIA_DIR usually belongs to someone else (the local user, root on a server),
# and the app could not write uploads there otherwise.
set -e
if [ "$(id -u)" = 0 ]; then
  # Only files that are not the app user's yet, so a big folder is not rewritten on every start
  find /app/media /app/.next/cache /app/backups ! -user app -exec chown app:app {} + 2>/dev/null || true
  if ! su-exec app test -w /app/media; then
    echo "The upload folder (MEDIA_DIR) is not writable by the app user (uid 100). Give it to that user, e.g. sudo chown -R 100:101 <folder>" >&2
  fi
  exec su-exec app "$@"
fi
exec "$@"
