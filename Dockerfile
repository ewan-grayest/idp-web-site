# Single image: Next.js site + Payload admin + /api/v1
# Install and build in one stage: a separate deps stage would copy node_modules (~1 GB) a second time
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Drop npm's download cache in the same step: it is as big as node_modules and not needed after install
RUN npm ci --no-audit --no-fund && npm cache clean --force
COPY . .
# NEXT_PUBLIC_* values are baked into the build, so they come in as build args
ARG NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_STUDIO_PHONE NEXT_PUBLIC_PROMO_VIDEO_URL
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
  NEXT_PUBLIC_STUDIO_PHONE=$NEXT_PUBLIC_STUDIO_PHONE NEXT_PUBLIC_PROMO_VIDEO_URL=$NEXT_PUBLIC_PROMO_VIDEO_URL
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
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
# Defaults so a hosting panel needs only the database and secret (see .env.hosting.example); any of these can be overridden.
# HOSTNAME: Docker sets it to the container id, and the Next.js server would listen on that address only
ENV HOSTNAME=0.0.0.0 MEDIA_DIR=/app/media BACKUPS_DIR=/app/backups BACKUP_MODE=prod
RUN addgroup -S app && adduser -S app -G app && apk add --no-cache su-exec
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Owned by the app user: files copied from a Mac can arrive readable by their owner only
COPY --from=build --chown=app:app /app/public ./public
COPY --from=pgtools /opt/pg /opt/pg
# Uploaded media, the image cache and backups live on volumes the app user must write to
RUN mkdir -p /app/media /app/.next/cache /app/backups && chown -R app:app /app/media /app/.next/cache /app/backups
# Starts as root to give a host folder (MEDIA_DIR) to the app user, then runs the site as that user
COPY --chmod=755 entrypoint.sh /usr/local/bin/idp-entrypoint
ENTRYPOINT ["idp-entrypoint"]
EXPOSE 3000
CMD ["node", "server.js"]
