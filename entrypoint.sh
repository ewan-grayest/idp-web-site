#!/bin/sh
# Runs before the site on every host. Evens out what hosts do differently and stops early, with a clear message, when
# a setting is missing. The database is always another container (or the host's), reached through DATABASE_URI.
# Then it runs the site as the app user, and starts the site again whenever it ends: a restore from the admin ends it
# on purpose, and this way no host has to restart the container for it.
set -e

# Kubernetes-based hosts set HOSTNAME to the pod's name over the image's value, and Next.js would listen on that name only
export HOSTNAME=0.0.0.0
# Many hosts hand over a managed database as DATABASE_URL
export DATABASE_URI="${DATABASE_URI:-${DATABASE_URL:-}}"
# A settings form can pass these as empty, which the site would take as folders relative to wherever it runs.
# The same paths in every setup: see "Data locations" in CLAUDE.md
export MEDIA_DIR="${MEDIA_DIR:-/data/media}"
export BACKUPS_DIR="${BACKUPS_DIR:-/data/backup}"

say() { echo "$*" >&2; }

# Whether a folder is on storage mounted into the container, which survives a redeploy, rather than on the container's own layer
on_mounted_disk() {
  _dir=$1
  while [ -n "$_dir" ] && [ "$_dir" != / ] && [ "$_dir" != . ]; do
    awk -v p="$_dir" '$2 == p { found = 1 } END { exit !found }' /proc/mounts 2>/dev/null && return 0
    _dir=$(dirname "$_dir")
  done
  return 1
}

# Say what is wrong now, in the host's deploy log, rather than fail on every page. Only for the site itself, not for
# `docker run <image> sh`, and once: this script runs again after dropping root
if [ "${1:-}" = node ] && [ -z "${IDP_CHECKED:-}" ]; then
  for name in PAYLOAD_SECRET DATABASE_URI; do
    eval "value=\${$name:-}"
    if [ -z "$value" ]; then
      say "Can't start: the setting $name is empty. See \"Server hosting\" in README.md."
      exit 1
    fi
  done
  for d in "$MEDIA_DIR" "$BACKUPS_DIR"; do
    on_mounted_disk "$d" || say "Warning: $d is not on persistent storage, so its files will be lost on the next deploy."
  done
  [ -n "${NEXT_PUBLIC_SITE_URL:-}" ] || say "Warning: NEXT_PUBLIC_SITE_URL is empty, so share links and search addresses point to localhost."
  export IDP_CHECKED=1
fi

if [ "$(id -u)" = 0 ]; then
  # A host's disk usually belongs to root or someone else, so hand the folders to the app user.
  # Only files that are not the app user's yet, so a big folder is not rewritten on every start
  mkdir -p "$MEDIA_DIR" "$BACKUPS_DIR" 2>/dev/null || true
  find "$MEDIA_DIR" "$BACKUPS_DIR" /app/.next/cache ! -user app -exec chown app:app {} + 2>/dev/null || true
  if su-exec app true 2>/dev/null; then
    exec su-exec app "$0" "$@"
  fi
  # Some hosts remove the right to change user: better to run than to stop
  say "Warning: this host doesn't allow changing user, so the site runs as root."
fi

[ "${1:-}" = node ] || exec "$@"

[ -w "$MEDIA_DIR" ] || say "The upload folder ($MEDIA_DIR) is not writable by uid $(id -u), so uploads will fail. Make it writable by that user."

# Runs the site, and starts it again when it ends, until the host stops the container
stopping=
site=
trap 'stopping=1; [ -z "$site" ] || kill -TERM "$site" 2>/dev/null' TERM INT
while [ -z "$stopping" ]; do
  "$@" &
  site=$!
  code=0
  wait "$site" || code=$?
  # A signal interrupts the wait before the site has finished
  while kill -0 "$site" 2>/dev/null; do wait "$site" || code=$?; done
  site=
  [ -z "$stopping" ] || break
  if [ "$code" = 0 ]; then
    say "The site process ended; starting it again."
  else
    say "The site process failed (code $code); starting it again in 5 seconds."
    sleep 5
  fi
done
exit 0
