#!/usr/bin/env bash
# Turn the nightly backup on or off (cron, on a Mac or a Linux server).
#
#   scripts/schedule-backup.sh on [--prod] [--at 03:30]   back up every night, then check the new backup
#   scripts/schedule-backup.sh off [--prod]               stop the nightly backup
#   scripts/schedule-backup.sh status                     show what is scheduled
#
# The output of each night's run goes to backup.log in the backup folder.
# Settings such as KEEP_LAST or BACKUP_UPLOAD_CMD go in backup.env (see backup.sh).
# On a Mac the job only runs while the computer is awake and Docker Desktop is running.

. "$(dirname "$0")/backup-common.sh"

action=${1:-status}; [ $# -gt 0 ] && shift
mode=local; at=03:30
while [ $# -gt 0 ]; do
  case $1 in
    --prod) mode=prod ;;
    --at) at=$2; shift ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) die "unknown option: $1 (see --help)" ;;
  esac
  shift
done
use_mode "$mode"
command -v crontab >/dev/null 2>&1 || die "cron is not available on this computer"

tag="# idp-site-backup:$MODE:$SITE_DIR"
current=$(crontab -l 2>/dev/null | grep -vF "$tag" || true)

case $action in
  on)
    hour=${at%%:*}; minute=${at##*:}
    case "$hour$minute" in *[!0-9]*|"") die "--at wants a time like 03:30" ;; esac
    flag=""; [ "$MODE" = prod ] && flag=" --prod"
    mkdir -p "$BACKUP_DIR"
    # cron starts with an almost empty PATH: add where Docker lives on Macs (Intel, Apple silicon) and Linux
    q() { printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"; }
    job="cd $(q "$SITE_DIR") && bash scripts/backup.sh$flag && bash scripts/verify-backup.sh --deep --latest$flag"
    line="$((10#$minute)) $((10#$hour)) * * * PATH=/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin; ( $job || echo \"[\$(date)] BACKUP FAILED, see above\" ) >> $(q "$BACKUP_DIR/backup.log") 2>&1 $tag"
    { [ -n "$current" ] && printf '%s\n' "$current"; printf '%s\n' "$line"; } | crontab -
    say "Nightly backup of the $MODE site is on, at $at. Log: $BACKUP_DIR/backup.log"
    ;;
  off)
    if [ -n "$current" ]; then printf '%s\n' "$current" | crontab -; else crontab -r 2>/dev/null || true; fi
    say "Nightly backup of the $MODE site is off."
    ;;
  status)
    found=$(crontab -l 2>/dev/null | grep -F "# idp-site-backup:" || true)
    if [ -n "$found" ]; then say "Scheduled:"; printf '%s\n' "$found"; else say "No nightly backup is scheduled."; fi
    ;;
  *) die "use: on, off or status (see --help)" ;;
esac
