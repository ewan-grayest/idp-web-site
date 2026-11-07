# Deploying

Development runs in the local environment (`./start.sh`). Production is a Docker host: it builds this repo's
`Dockerfile` from GitHub `main`, or runs an image built from it, and supplies the settings when the container starts.
It's the same image `./start.sh` builds locally.

```
local environment (./start.sh) ──push──▶ GitHub main ──build Dockerfile──▶ Docker host
```

Required settings, what the host must provide and troubleshooting: "Server hosting" in the [site README](../README.md#server-hosting).
Before trying a new host, `./scripts/check-image.sh` builds the image and starts it the way hosts do.

## Release

1. **Develop locally.** Merge the finished work into `main` on GitHub.
2. **Rehearse:** `./start.sh` runs the production image against the local database, and `./scripts/check-image.sh` starts it the way a host does.
3. **Bump the version** (shown in the footer), commit and push to `main`:
   ```bash
   npm run version:patch        # or version:minor / version:major
   git commit -am "Release $(node -p 'require("./package.json").version')"
   git push
   ```
4. **Back up the live site:** admin → «Резервные копии» → make a backup, then download it. Migrations can't be undone.
5. **Deploy** in the host's panel. Prefer a manual deploy over auto-deploy on every push, so merging work doesn't put it live by itself.
   Migrations apply when the new container starts.
6. **Check** that the footer shows the new version.

**Rollback:** redeploy the previous build in the host's panel. If the release changed the database, restore the step 4 backup from the admin.

On a hosting platform, make backups from the admin (`pg_dump` is inside the image). The Terminal scripts in `scripts/`
work through `docker compose` on a machine you control (see `BACKUP.md`).

## Self-hosted alternative: one server with Docker Compose (not in use)

The other files in this folder run everything on one server you control: the site, PostgreSQL 16 and Caddy, which gets
a free HTTPS certificate. Media uploads and the database live on the server disk (or the folders set as `MEDIA_DIR` /
`PGDATA_DIR` in `deploy/.env`, see the site README "Where the data is kept"). Nightly backups: `scripts/schedule-backup.sh on --prod` (see `BACKUP.md`).
`docker-compose.behind-proxy.yml` is the same without Caddy, for a server that already has its own proxy and HTTPS.

Get the code onto the server (`git clone`), then:

```bash
cp deploy/.env.example deploy/.env    # fill in; use `openssl rand -hex 32` for the two secrets
mkdir -p deploy/backups
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

Open `https://<SITE_DOMAIN>/admin` and create the first editor account straight away.

**Updating:** `git pull`, then the same `up -d --build`. Database migrations apply on start.
Then free the disk, because leftovers from rebuilds can fill it and stop PostgreSQL (volumes are not touched):

```bash
docker image prune -f && docker builder prune -f
```

**Before a domain exists:** use `SITE_DOMAIN=<server-ip>.sslip.io` (free wildcard DNS) so HTTPS works on the bare IP.
