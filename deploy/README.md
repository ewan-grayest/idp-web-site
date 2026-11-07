# Deploying

Development runs on the local Mac (`./start.sh`). Production is a Docker PaaS: it builds this repo's `Dockerfile`
from GitHub `main` and runs that one image. It's the same image `./start.sh` builds on the Mac, so a working local
Docker run is the rehearsal for production.

```
Mac (dev, ./start.sh) ──push──▶ GitHub main ──build Dockerfile──▶ Docker PaaS
```

## What the hosting must provide

| Need | Details |
|---|---|
| Build from `Dockerfile` | Build variables (baked into the image, so set them as **build** variables): `NEXT_PUBLIC_SITE_URL` (e.g. `https://example.ru`), `NEXT_PUBLIC_STUDIO_PHONE`, `NEXT_PUBLIC_PROMO_VIDEO_URL` (optional) |
| HTTPS and a domain | Routed to container port **3000** |
| PostgreSQL 16 | Managed by the hosting or a separate container; given to the app as `DATABASE_URI` |
| Persistent storage at `/app/media` | Uploaded photos and videos are files on disk. Without a persistent volume they are lost on every deploy and the site would need S3 storage instead, which is a code change. |
| Persistent storage at `/app/backups` | Backups made in the admin. Recommended. |
| Runtime variables | `PAYLOAD_SECRET` (`openssl rand -hex 32`), `DATABASE_URI`, `MEDIA_DIR=/app/media`, `BACKUPS_DIR=/app/backups`, `BACKUP_MODE=prod` |

Secrets live only in the hosting's settings, never in git. Database migrations apply automatically when the container starts.
After the first deploy, open `https://<domain>/admin` and create the first editor account straight away.

## Release

1. **Develop on the Mac.** Merge the finished work into `main` on GitHub.
2. **Rehearse:** `./start.sh` on the Mac builds the production image and runs it against the local database.
3. **Bump the version** (it is baked into the image and shown in the footer), commit and push to `main`:
   ```bash
   npm run version:patch        # or version:minor / version:major
   git commit -am "Release $(node -p 'require("./package.json").version')"
   git push
   ```
4. **Back up the live site:** admin → «Резервные копии» → make a backup, then download it. Migrations can't be undone.
5. **Deploy** in the hosting's panel. Prefer a manual deploy over auto-deploy on every push, so merging work doesn't put it live by itself.
6. **Check** that the footer shows the new version.

**Rollback:** redeploy the previous build in the hosting's panel. If the release changed the database, restore the step 4 backup from the admin.

On the hosting, backups are made from the admin (`pg_dump` is inside the image). The Terminal scripts in `scripts/`
work through `docker compose` on a machine you control, so they're for the Mac (see `BACKUP.md`).

## Self-hosted alternative (not in use)

The other files in this folder run everything on one server you control with Docker Compose: the site, PostgreSQL 16 and
Caddy for free HTTPS. They're kept for reference.

```bash
cp deploy/.env.example deploy/.env    # fill in; use `openssl rand -hex 32` for the two secrets
mkdir -p deploy/backups
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

Updating means getting the new code onto the server (`git pull`) and running the same `up -d --build`. The Terminal backup
scripts work there with `--prod` (see `BACKUP.md`). Before a domain exists, `SITE_DOMAIN=<server-ip>.sslip.io` (free wildcard DNS)
makes HTTPS work on the bare IP.
