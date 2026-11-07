# Deploying to Yandex Cloud

Required settings, host requirements and troubleshooting: "Server hosting" in the [site README](../README.md#server-hosting).
That section also covers hosts with their own proxy and HTTPS, and container platforms.

One VM runs everything: the site (Next.js + Payload admin), PostgreSQL 16 and Caddy, which gets a free HTTPS certificate.
The site, PostgreSQL and Caddy run in separate containers. Uploads, backups and the database live in `deploy/data/` on the VM (`media/`, `backup/`, `db/`; set `DATA_DIR` in `deploy/.env` to put them elsewhere, see the site README "Where the data is kept"). Backups: a daily disk snapshot plus a nightly full backup of the database and media, turned on once with `scripts/schedule-backup.sh on --prod` (see `BACKUP.md`).

## First install on the VM (Ubuntu 24.04)

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 rsync
sudo usermod -aG docker $USER   # then log out and back in
sudo mkdir -p /opt/idp && sudo chown $USER /opt/idp
```

Copy the `site` folder to `/opt/idp/site` (rsync from the local environment, or git clone once the repo exists), then:

```bash
cd /opt/idp/site
cp deploy/.env.example deploy/.env    # fill in; use `openssl rand -hex 32` for the two secrets
mkdir -p deploy/data/media deploy/data/backup deploy/data/db
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

Open `https://<SITE_DOMAIN>/admin` and create the first editor account straight away.

## Updating

Copy the new code over, then run the same `up -d --build`. Database migrations apply on start.
A server set up before 2026-11-08 keeps its data in Docker volumes and `deploy/backups/`: after copying the new code and before `up`, run `scripts/move-data.sh --prod` once, or the site starts empty.
Then free the disk, because leftovers from rebuilds can fill it and stop PostgreSQL (the data folder is not touched):

```bash
docker image prune -f && docker builder prune -f
```

## Before a domain exists

Use `SITE_DOMAIN=<vm-ip>.sslip.io` (free wildcard DNS) so HTTPS works on the bare IP.
