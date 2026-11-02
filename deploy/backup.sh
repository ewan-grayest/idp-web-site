#!/bin/sh
# Kept so old cron lines still work: full production backup (database and media). See BACKUP.md.
exec bash "$(dirname "$0")/../scripts/backup.sh" --prod "$@"
