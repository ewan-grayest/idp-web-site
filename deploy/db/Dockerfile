# The site's database, for hosts that build every container from a Dockerfile and can't run the image postgres:16 as it
# is (Dockhost, for one): a second container built from this repository, beside the site's. It is postgres:16, as in the
# compose files, with the project's layout and names set, so the host only needs POSTGRES_PASSWORD and a persistent disk
# at /data ("Containers on a hosting platform" in README.md). The site's image never holds a database server.
# It copies nothing from the repository, so it builds with any build context (the repository root or this folder), and
# it needs no BuildKit. Build it again only when this file changes, not on every release of the site.
FROM postgres:16
ENV PGDATA=/data/db POSTGRES_USER=idp POSTGRES_DB=idp
# Runs before the official entrypoint, which does the rest (owners of the disk, initdb, the password check):
# - stops with a clear message when /data/db is not on a persistent disk, where the database would vanish on the next deploy;
# - removes an empty lost+found, which a disk mounted straight at /data/db can carry and initdb refuses;
# - puts back the project's names when a settings form passes them empty.
RUN printf '%s\n' \
  '#!/bin/sh' \
  'set -e' \
  'export PGDATA="${PGDATA:-/data/db}" POSTGRES_USER="${POSTGRES_USER:-idp}" POSTGRES_DB="${POSTGRES_DB:-idp}"' \
  'on_mounted_disk() {' \
  '  _dir=$1' \
  '  while [ -n "$_dir" ] && [ "$_dir" != / ] && [ "$_dir" != . ]; do' \
  '    while read -r _dev _mnt _rest; do [ "$_mnt" != "$_dir" ] || return 0; done </proc/mounts' \
  '    _dir=$(dirname "$_dir")' \
  '  done' \
  '  return 1' \
  '}' \
  'if [ "${1:-}" = postgres ]; then' \
  '  if ! on_mounted_disk "$PGDATA"; then' \
  '    echo "Cannot start: $PGDATA is not on a persistent disk, so the database would be lost on the next deploy. Mount a disk at /data. See README.md, Containers on a hosting platform." >&2' \
  '    exit 1' \
  '  fi' \
  '  [ -s "$PGDATA/PG_VERSION" ] || rmdir "$PGDATA/lost+found" 2>/dev/null || true' \
  'fi' \
  'exec docker-entrypoint.sh "$@"' \
  >/usr/local/bin/idp-db-entrypoint \
  && chmod 755 /usr/local/bin/idp-db-entrypoint
ENTRYPOINT ["idp-db-entrypoint"]
# Setting ENTRYPOINT clears the CMD that postgres:16 sets
CMD ["postgres"]
EXPOSE 5432
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
  CMD pg_isready -q -h 127.0.0.1 -U "${POSTGRES_USER:-idp}" -d "${POSTGRES_DB:-idp}" || exit 1
