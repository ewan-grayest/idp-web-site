# Backup and restore

A backup saves the whole site: the PostgreSQL database (projects, people, texts, enquiries, admin accounts)
and every uploaded photo and video with its resized copies. Restoring one puts it all back.

There are two ways to do it, and they share one folder and one file format, so a backup made either way
restores either way:

- **In the admin**: «Резервные копии» in the side menu (`/admin/backups`). No Terminal needed.
- **With scripts** in Terminal, from the site folder (below). They also run the nightly backup.

## Backups from before 2026-11-08

On this Mac, backups made from the admin went to the Docker volume `site_backups` (`BACKUPS_MOUNT=backups`, because Docker Desktop refused the `backups/` folder), and those from Terminal to `backups/`. Both now live in the volume `site_backup`, which the admin and the scripts share. `scripts/move-data.sh` copies both old places into it without overwriting anything, and `./start.sh` stops until that is done.

## In the admin

Open `/admin/backups` (side menu → Обслуживание → Резервные копии). Every signed-in admin user can:

| Button | What happens |
|---|---|
| Сделать копию сейчас | Saves the database and all media into a new backup. Takes seconds for a small site; the site keeps running. Old backups are rotated as below. |
| Загрузить копию с компьютера | Uploads a backup `.tar` (for example one downloaded from the other site). A file that is not a site backup is refused. |
| Скачать | Downloads the backup file, to keep a copy on another disk. |
| Проверить | Checks every checksum and test-loads the database into a temporary copy, comparing every table's rows. The site is not touched. |
| Восстановить… | Asks for confirmation, then restores (below). |
| Удалить | Deletes the file, after a second click. |

A restore from the admin:

1. Checks the backup and that the site code is new enough for it.
2. Saves the current state as a «До восстановления» (`…-pre-restore-…`) backup.
3. Loads the backup into a new database beside the live one and checks every table's rows,
   and unpacks the media beside the live files. The live site is untouched until both are ready.
4. Switches the site to the restored database and files within a second.
5. Restarts the site, which its container starts again by itself (about half a minute). The page waits and then
   opens the sign-in page: sign in with an account from the backup.

The admin and the scripts keep backups in the same place: the persistent Docker volume `backup` (`site_backup`, or
`deploy_backup` in production; see "Where the data is kept" in the README), mounted in the site's container at
`/data/backup`. The scripts reach it through Docker. `scripts/get-backup.sh --list` lists the backups, and
`scripts/get-backup.sh --latest [folder]` copies the newest one out. The app's database tools are PostgreSQL 16, copied into the image from
`postgres:16-alpine` (see `Dockerfile`). In `npm run dev` the page works too when `pg_dump`, `pg_restore` and `psql` 16
are installed in the local environment (on the PATH, or set `PG_BIN_DIR` to their folder), but after a restore restart the dev server by hand.

Only one backup or restore runs at a time: the admin and the scripts share a lock (`.lock` in the backup folder).
If a task was cut off by a crash, the next one from the admin clears the leftover lock itself.

## With scripts

The same scripts work for the local dev site (`docker-compose.yml`) and for production
(`deploy/docker-compose.prod.yml`, add `--prod`). Run them from the site folder. Docker must be running.
On a Linux server, run them with `sudo` so the admin page can read the backups they make
(the files are handed to the app's user, uid 100).

| Task | Local dev site | Production |
|---|---|---|
| Back up now | `scripts/backup.sh` | `scripts/backup.sh --prod` |
| Check a backup | `scripts/verify-backup.sh --deep --latest` | `scripts/verify-backup.sh --deep --latest --prod` |
| Restore | `scripts/restore.sh <name>.tar` | `scripts/restore.sh --prod <name>.tar` |
| Nightly backup on / off | `scripts/schedule-backup.sh on` / `off` | `scripts/schedule-backup.sh on --prod` / `off --prod` |

## What a backup contains

Each backup is one file, `idp-<local|prod>-<date>_<time>.tar`, with a `.sha256` checksum file beside it,
in the backup volume. Inside:

- `db.dump`: the whole database (`pg_dump` custom format, compressed)
- `media.tar`: everything in the media storage (`/data/media` in the site's container)
- `db-counts.txt`: the number of rows in every table, used to prove a restore is complete
- `manifest.txt`: when and where it was made, PostgreSQL version, last database migration, number of media files
- `SHA256SUMS`: a checksum for each of the files above

The scripts reach the database, media and backups through Docker, so no folder needs sharing with Docker Desktop.
`restore.sh` and `verify-backup.sh` take a backup's name in the volume, or a path to a backup file anywhere.

Backups hold enquiries (emails, names), so they are created readable by your user only. Treat them as private.

## Settings and secrets (.env)

The settings files (`.env`, `deploy/.env`) are **not** in the backup by default: they hold the database
password and `PAYLOAD_SECRET`. Keep a copy of each in a password manager. To restore on a new computer you need
the site folder, its settings file and a backup.

- `scripts/backup.sh --with-env` also puts the settings file into the archive (`env/` inside). Use it only for
  archives you keep somewhere private; `scripts/restore.sh --with-env` puts it back and keeps the old one as `.env.before-restore`.
- If the restored site runs with a different `PAYLOAD_SECRET`, content and passwords still work; everyone is
  simply signed out of the admin.

## Back up

```bash
scripts/backup.sh            # local dev site
scripts/backup.sh --prod     # production
```

It takes a few seconds for a small site. The site keeps running. The database is saved first and the media
second, so the backup never refers to a photo it lacks.

Optional settings, as environment variables or one `NAME=value` per line in `backup.env`
(local) or `deploy/backup.env` (production):

| Setting | Default | Meaning |
|---|---|---|
| `KEEP_LAST` | `14` | How many newest backups to keep |
| `KEEP_MONTHLY` | `6` | Also keep the newest backup of each of this many months |
| `BACKUP_UPLOAD_CMD` | empty | Off-site copy, run after each backup with the file as `$1` |

Rotation runs after each successful backup and only touches regular backups of that site. Safety copies made
before a restore (`idp-…-pre-restore-…`) stay until you delete them.

### Off-site copy (optional)

Keep at least one copy away from the environment that runs the site. Only Russian-payable or your own storage:

- Your own server or NAS: `BACKUP_UPLOAD_CMD='scp "$1" backup@nas.local:/srv/idp-backups/'`
- Yandex Object Storage or Selectel (S3-compatible, paid in roubles) with [rclone](https://rclone.org) (free):
  set up a remote once with `rclone config`, ideally wrapped in an rclone `crypt` remote so the copy is encrypted,
  then `BACKUP_UPLOAD_CMD='rclone copy "$1" idp-crypt:'`

The access keys stay in rclone's own config, not in `backup.env`. A failed upload is logged and does not
spoil the local backup. Rotation does not delete remote copies; set a lifecycle rule in the bucket for that.

## Check a backup

```bash
scripts/verify-backup.sh --latest           # checksums, the dump opens, the media list matches
scripts/verify-backup.sh --deep --latest    # also restores the database into a throwaway PostgreSQL
                                            # container and compares the rows of every table
scripts/verify-backup.sh --deep idp-local-2026-10-25_033000.tar   # a specific backup
```

The site is not touched. Any damaged or incomplete file stops the check with an error.

## Restore

```bash
scripts/restore.sh idp-local-2026-10-25_033000.tar                 # local dev site
scripts/restore.sh --prod idp-prod-2026-10-25_033000.tar           # production
scripts/restore.sh ~/Downloads/idp-prod-2026-10-25_033000.tar      # a backup file copied out earlier
```

What it does, in order:

1. Checks the archive's checksums and that the current code knows the backup's database version.
2. Asks you to type `restore` (or pass `--yes` in scripts).
3. Backs up the current state first (`…-pre-restore-…`), unless the database is empty or you pass `--no-safety-backup`.
4. Stops the site, recreates the database from the dump and checks the row counts of every table.
5. Empties the media storage, unpacks the backup's files and checks their number.
6. Starts the site and waits until it answers. Newer database migrations of the current code apply on start.

A local backup restores into production and the other way round, which is also how to move content between them.
If anything goes wrong, restore the `pre-restore` backup the same way.

### Restore on a new or empty computer

1. Install Docker (Docker Desktop in a local environment) and copy the site folder there.
2. Put the saved settings file back: `.env` (local) or `deploy/.env` (production). Without a saved one, copy
   `.env.example` and set a new `PAYLOAD_SECRET`.
3. Copy the backup `.tar` and `.tar.sha256` files onto the computer, side by side.
4. `scripts/restore.sh <path to the .tar>` (add `--prod` for production). It creates the database and builds the
   site image if they don't exist yet; the first build takes a few minutes.
5. Open the site and sign in to `/admin` with the accounts from the backup.

## Nightly backup

```bash
scripts/schedule-backup.sh on                 # every night at 03:30, then a --deep check
scripts/schedule-backup.sh on --at 01:15      # another time
scripts/schedule-backup.sh on --prod          # production server
scripts/schedule-backup.sh status
scripts/schedule-backup.sh off
```

This adds one line to your user's crontab. Each night's output goes to `backup.log` in the backup folder;
look there if a backup is missing. In the local environment the job runs only while the computer is awake and Docker Desktop is
running (Docker Desktop's "Start when you sign in" setting helps). If macOS blocks it, give `cron` Full Disk
Access in System Settings → Privacy & Security.

On the production server, a daily disk snapshot from the hosting provider is a good second layer.

## Test restores

Run `scripts/verify-backup.sh --deep --latest` after changing anything about backups, and once a month restore
a backup into a spare copy of the site to make sure the whole procedure still works.
`scripts/check-image.sh` does a quick version of that: in a throwaway copy, it makes, checks and restores a backup
through the admin's API and waits for the site to restart.
