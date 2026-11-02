# Deploying to Yandex Cloud

One VM runs everything: the site (Next.js + Payload admin), PostgreSQL 16 and Caddy, which gets a free HTTPS certificate.
Media uploads and the database live on the VM disk (or the folders set as `MEDIA_DIR` / `PGDATA_DIR` in `deploy/.env`, see the site README "Where the data is kept"). Backups: a daily disk snapshot plus a nightly full backup of the database and media, turned on once with `scripts/schedule-backup.sh on --prod` (see `BACKUP.md`).

## First install on the VM (Ubuntu 24.04)

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 rsync
sudo usermod -aG docker $USER   # then log out and back in
sudo mkdir -p /opt/idp && sudo chown $USER /opt/idp
```

Copy the `site` folder to `/opt/idp/site` (rsync from the Mac, or git clone once the repo exists), then:

```bash
cd /opt/idp/site
cp deploy/.env.example deploy/.env    # fill in; use `openssl rand -hex 32` for the two secrets
mkdir -p deploy/backups
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

Open `https://<SITE_DOMAIN>/admin` and create the first editor account straight away.

## Updating

Copy the new code over, then run the same `up -d --build`. Database migrations apply on start.

## Before a domain exists

Use `SITE_DOMAIN=<vm-ip>.sslip.io` (free wildcard DNS) so HTTPS works on the bare IP.
