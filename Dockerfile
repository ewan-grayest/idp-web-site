# Single image: Next.js site + Payload admin + /api/v1. The database is never in it: PostgreSQL 16 always runs in a
# container of its own (docker-compose.yml, deploy/), or is the host's. One image runs on any host: the address, secrets,
# database and folders all come in as settings when it starts ("Server hosting" in the README). Nothing here needs
# BuildKit, so hosts on the older builder can build it too.
# Install and build in one stage: a separate deps stage would copy node_modules (~1 GB) a second time
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Drop npm's download cache in the same step: it is as big as node_modules and not needed after install
RUN npm ci --no-audit --no-fund && npm cache clean --force
COPY . .
# Readable by any user a host runs the image as: files copied from a local environment can arrive readable by their owner only
RUN chmod -R a+rX public
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# PostgreSQL 16 client tools (pg_dump, pg_restore, psql) for the admin's backups, the same version as the database.
# Copied with the libraries they use into /opt/pg, so they work whatever Alpine release the site image is on
FROM postgres:16-alpine AS pgtools
RUN mkdir -p /opt/pg/bin /opt/pg/lib \
  && cp /usr/local/bin/pg_dump /usr/local/bin/pg_restore /usr/local/bin/psql /opt/pg/bin/ \
  && for b in /opt/pg/bin/*; do ldd "$b" | awk '/=> \// { print $3 }'; done | sort -u | grep -v ld-musl \
     | xargs -I{} cp -L {} /opt/pg/lib/ \
  && LD_LIBRARY_PATH=/opt/pg/lib /opt/pg/bin/pg_dump --version

FROM node:22-alpine AS run
WORKDIR /app
# PORT: a host may set its own, and the site follows it. HOSTNAME: entrypoint.sh insists on it, see there.
# MEDIA_DIR, BACKUPS_DIR: where every setup mounts its storage, the same in compose and on any host ("Data locations"
# in CLAUDE.md). The database container keeps its files at /data/db
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
  MEDIA_DIR=/data/media BACKUPS_DIR=/data/backup BACKUP_MODE=prod
RUN addgroup -S app && adduser -S app -G app && apk add --no-cache su-exec
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=pgtools /opt/pg /opt/pg
# Uploads, backups and the image cache, all for the app user to write to.
# Group 0 too: hosts that forbid root run the image as an arbitrary user in group 0
RUN mkdir -p /data/media /data/backup /app/.next/cache \
  && chown -R app:0 /data /app/.next/cache \
  && chmod -R g=u /data /app/.next/cache
# Starts as root to give the storage to the app user, then runs the site as that user
COPY entrypoint.sh /usr/local/bin/idp-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/idp-entrypoint && chmod 755 /usr/local/bin/idp-entrypoint
ENTRYPOINT ["idp-entrypoint"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD wget -q -O /dev/null -T 8 "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1
CMD ["node", "server.js"]
