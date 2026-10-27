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

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
RUN addgroup -S app && adduser -S app -G app && apk add --no-cache su-exec
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Owned by the app user: files copied from a Mac can arrive readable by their owner only
COPY --from=build --chown=app:app /app/public ./public
# Uploaded media and the image cache live on volumes the app user must write to
RUN mkdir -p /app/media /app/.next/cache && chown -R app:app /app/media /app/.next/cache
# Starts as root to give a host folder (MEDIA_DIR) to the app user, then runs the site as that user
COPY --chmod=755 entrypoint.sh /usr/local/bin/idp-entrypoint
ENTRYPOINT ["idp-entrypoint"]
EXPOSE 3000
CMD ["node", "server.js"]
