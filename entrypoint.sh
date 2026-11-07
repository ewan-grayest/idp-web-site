#!/bin/sh
# Runs before the site on every host. Evens out what hosts do differently, stops early with a clear message
# if a required setting is missing, then starts the site as the app user when the host allows it.
set -e

# Kubernetes-based hosts set HOSTNAME to the pod's name over the image's value, and Next.js would listen on that name only
export HOSTNAME=0.0.0.0
# Many hosts hand over their managed database as DATABASE_URL
export DATABASE_URI="${DATABASE_URI:-${DATABASE_URL:-}}"
# A settings form can pass these as empty, which the site would take as folders relative to wherever it runs
export MEDIA_DIR="${MEDIA_DIR:-/app/media}"
export BACKUPS_DIR="${BACKUPS_DIR:-/app/backups}"

# Without these every page fails: say so now, in the host's deploy log. Only for the site, not for `docker run <image> sh`
if [ "${1:-}" = node ]; then
  for name in PAYLOAD_SECRET DATABASE_URI; do
    eval "value=\${$name:-}"
    if [ -z "$value" ]; then
      echo "Can't start: the setting $name is empty. See \"Server hosting\" in README.md." >&2
      exit 1
    fi
  done
  [ -n "${NEXT_PUBLIC_SITE_URL:-}" ] || echo "Warning: NEXT_PUBLIC_SITE_URL is empty, so share links and search addresses point to localhost." >&2
fi

mkdir -p "$MEDIA_DIR" "$BACKUPS_DIR" 2>/dev/null || true
unwritable="The upload folder ($MEDIA_DIR) is not writable by the user running the site, so uploads will fail."

if [ "$(id -u)" = 0 ]; then
  # A host folder usually belongs to someone else (the local user, root on a server), so hand it to the app user.
  # Only files that are not the app user's yet, so a big folder is not rewritten on every start
  find "$MEDIA_DIR" "$BACKUPS_DIR" /app/.next/cache ! -user app -exec chown app:app {} + 2>/dev/null || true
  if su-exec app true 2>/dev/null; then
    su-exec app test -w "$MEDIA_DIR" || echo "$unwritable Give it to uid 100, e.g. sudo chown -R 100:101 <folder>" >&2
    exec su-exec app "$@"
  fi
  # Some hosts remove the right to change user: better to run than to stop
  echo "Warning: this host doesn't allow changing user, so the site runs as root." >&2
  exec "$@"
fi

# The host chose the user (no root allowed). Group 0 can write to the image's own folders
[ -w "$MEDIA_DIR" ] || echo "$unwritable Make it writable by uid $(id -u)." >&2
exec "$@"
