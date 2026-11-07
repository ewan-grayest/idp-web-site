#!/usr/bin/env bash
# Lists the backups in the backup volume (/data/backup in the site's container), or copies one out to a folder,
# for example to keep it on another disk. The admin («Резервные копии») can download them too.
#
#   scripts/get-backup.sh --list [--prod]                    list them, oldest first
#   scripts/get-backup.sh [--prod] --latest [folder]         copy the newest one (default: the current folder)
#   scripts/get-backup.sh [--prod] idp-local-....tar [folder]

. "$(dirname "$0")/backup-common.sh"

mode=local; list=no; name=""; dest=.
while [ $# -gt 0 ]; do
  case $1 in
    --prod) mode=prod ;;
    --list) list=yes ;;
    --latest) name=latest ;;
    -h|--help) sed -n '2,7p' "$0"; exit 0 ;;
    -*) die "unknown option: $1 (see --help)" ;;
    *) if [ -z "$name" ]; then name=$1; else dest=$1; fi ;;
  esac
  shift
done
use_mode "$mode"
need_docker
compose_volume backup

if [ "$list" = yes ]; then
  bk 'for f in idp-*.tar; do [ -f "$f" ] && printf "%s  %s bytes\n" "$f" "$(wc -c < "$f" | tr -d " ")"; done; true'
  exit 0
fi
[ -n "$name" ] || die "which backup? See --help"
[ "$name" = latest ] && { name=$(bk_list | tail -n 1); [ -n "$name" ] || die "no $MODE backups in the backup volume"; }
name=$(basename "$name")
mkdir -p "$dest"
bk 'test -f "$1"' "$name" || die "no backup $name in the backup volume (scripts/get-backup.sh --list)"
bk 'cat "$1"' "$name" > "$dest/$name"
if bk 'test -f "$1.sha256"' "$name"; then bk 'cat "$1.sha256"' "$name" > "$dest/$name.sha256"; fi
say "Copied $name to $dest"
