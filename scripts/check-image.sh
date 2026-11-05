#!/bin/sh
# Checks the image starts and works on a host it knows nothing about. Builds it with no build arguments, then runs it
# the way hosting platforms do: settings as variables only, with the port, HOSTNAME and user chosen by the host, and a
# database that wants TLS with its own certificate, as managed databases often do. Then works the site like an editor:
# uploads a photo, makes, checks and restores a backup, and waits for the site to come back by itself.
# Uses a throwaway database and volume and removes everything it made, so it touches no real data. Needs Docker and curl.
# Usage: scripts/check-image.sh [--platform linux/amd64]   (the host's platform, when it differs from the local environment)
set -eu
cd "$(dirname "$0")/.."

platform=
case "${1:-}" in
  '') ;;
  --platform) platform="--platform=${2:?Usage: scripts/check-image.sh [--platform linux/amd64]}" ;;
  *) echo "Usage: scripts/check-image.sh [--platform linux/amd64]"; exit 1 ;;
esac

id=$$
image="idp-site-check:$id"
net="idp-check-$id"
db="idp-check-db-$id"
app="idp-check-app-$id"
data="idp-check-data-$id"
db_url="postgres://idp:check@$db:5432/idp"
secret="check-secret-$id"
email="check-$id@example.com"
password="check-password-$id"
tmp=$(mktemp -d "${TMPDIR:-/tmp}/idp-check.XXXXXX")
failures=0
base= token= media_id= file= backup=

cleanup() {
  docker rm -f "$app" "$db" >/dev/null 2>&1 || true
  docker volume rm "$data" >/dev/null 2>&1 || true
  docker network rm "$net" >/dev/null 2>&1 || true
  docker rmi "$image" >/dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

check() {
  desc=$1; shift
  if "$@"; then echo "  ok    $desc"; else echo "  FAIL  $desc"; failures=$((failures + 1)); fi
}

# Waits for the health check through the published port, which can change when the container restarts.
# A container that stopped ends the wait
wait_for_site() {
  i=0
  while [ $i -lt 90 ]; do
    addr=$(docker port "$app" "$1" 2>/dev/null | head -1)
    base="http://127.0.0.1:${addr##*:}"
    [ -n "$addr" ] && curl -fs -o /dev/null "$base/api/health" && return 0
    [ "$(docker inspect -f '{{.State.Running}}' "$app")" = true ] || break
    i=$((i + 1))
    sleep 2
  done
  docker logs --tail 40 "$app" 2>&1 | sed 's/^/        /'
  return 1
}

# One value from JSON on stdin, by a dotted path; read with the image's own Node, so nothing else needs installing
json() {
  docker exec -i "$app" node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let v;try{v=process.argv[1].split(".").reduce((o,k)=>o==null?o:o[k],JSON.parse(s))}catch{}console.log(v==null?"":typeof v=="object"?JSON.stringify(v):v)})' "$1"
}
# The admin's API, signed in as the first admin
api() { method=$1; route=$2; shift 2; curl -fsS -X "$method" -H "Authorization: JWT $token" "$@" "$base$route"; }
job_state() { api GET /api/v1/backups 2>/dev/null | json job.state 2>/dev/null; }
show_job_error() { echo "        $(api GET /api/v1/backups 2>/dev/null | json job.error 2>/dev/null)"; }
wait_for_job() {
  i=0
  while [ $i -lt 120 ]; do
    case "$(job_state)" in
      done) return 0 ;;
      failed) show_job_error; return 1 ;;
    esac
    i=$((i + 1))
    sleep 2
  done
  return 1
}

stops_with_message() {
  out=$(docker run --rm $platform "$image" 2>&1) && return 1
  echo "$out" | grep -q PAYLOAD_SECRET
}
page_mentions() { curl -fsS "$base$1" | grep -q "$2"; }
page_opens() { curl -fsSL -o /dev/null "$base$1"; }
page_gone() { ! curl -fs -o /dev/null "$base$1"; }
site_user_is() { [ "$(docker exec "$app" stat -c %u /proc/1)" = "$1" ]; }
docker_says_healthy() {
  i=0
  while [ $i -lt 30 ]; do
    [ "$(docker inspect -f '{{.State.Health.Status}}' "$app")" = healthy ] && return 0
    i=$((i + 1))
    sleep 3
  done
  return 1
}
uses_tls() {
  n=$(docker exec "$db" psql -U idp -d idp -Atc "select count(*) from pg_stat_ssl s join pg_stat_activity a using (pid) where s.ssl and a.client_addr is not null")
  [ "$n" -gt 0 ]
}

first_admin() {
  token=$(curl -fsS -H 'Content-Type: application/json' -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
    "$base/api/v1/users/first-register" | json token)
  [ -n "$token" ]
}
upload_photo() {
  # A 1×1 PNG
  printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' | base64 --decode >"$tmp/check.png"
  doc=$(api POST /api/v1/media -F "file=@$tmp/check.png;type=image/png" -F '_payload={"alt":"check"}') || return 1
  media_id=$(echo "$doc" | json doc.id)
  file=$(echo "$doc" | json doc.filename)
  [ -n "$media_id" ] && [ -n "$file" ]
}
make_backup() {
  api POST /api/v1/backups >/dev/null && wait_for_job || return 1
  backup=$(api GET /api/v1/backups | json job.result)
  [ -n "$backup" ] && docker exec "$app" test -f "/data/backups/$backup"
}
check_backup() { api POST "/api/v1/backups/$backup/verify" >/dev/null && wait_for_job; }
delete_photo() { api DELETE "/api/v1/media/$media_id" >/dev/null && page_gone "/api/v1/media/file/$file"; }
# A restore ends the site's process; the host's restart policy must start it again
restore_backup() {
  api POST "/api/v1/backups/$backup/restore" -H 'Content-Type: application/json' -d "{\"confirm\":\"$backup\"}" >/dev/null || return 1
  i=0
  while [ $i -lt 120 ]; do
    [ "$(docker inspect -f '{{.RestartCount}}' "$app")" -gt 0 ] && return 0
    [ "$(job_state)" = failed ] && { show_job_error; return 1; }
    i=$((i + 1))
    sleep 2
  done
  return 1
}

echo "Building with no build arguments"
docker build $platform -t "$image" .

# PostgreSQL with TLS on and a certificate no one vouches for, like a managed database with the provider's own
docker network create "$net" >/dev/null
docker run -d --name "$db" --network "$net" -e POSTGRES_USER=idp -e POSTGRES_PASSWORD=check -e POSTGRES_DB=idp postgres:16 \
  -c ssl=on -c ssl_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem -c ssl_key_file=/etc/ssl/private/ssl-cert-snakeoil.key >/dev/null
i=0
until docker exec "$db" pg_isready -q -h 127.0.0.1 -U idp 2>/dev/null; do
  i=$((i + 1))
  if [ $i -gt 90 ] || [ "$(docker inspect -f '{{.State.Running}}' "$db")" != true ]; then
    echo "The test database didn't start:"
    docker logs --tail 20 "$db" 2>&1 | sed 's/^/        /'
    exit 1
  fi
  sleep 1
done

echo "No settings at all"
check "stops and names the missing setting" stops_with_message

echo "A platform: its own port, HOSTNAME and DATABASE_URL, one disk, a TLS database, a bare domain as the address"
docker volume create "$data" >/dev/null
docker run -d --name "$app" --network "$net" $platform --restart unless-stopped -p 127.0.0.1::8080 \
  -e PORT=8080 -e HOSTNAME=some-pod-name -e DATABASE_URL="$db_url?sslmode=no-verify" -e PAYLOAD_SECRET="$secret" \
  -e NEXT_PUBLIC_SITE_URL=check.example -e MEDIA_DIR=/data/media -e BACKUPS_DIR=/data/backups -v "$data":/data "$image" >/dev/null
if wait_for_site 8080; then
  echo "  ok    answers on the host's port, migrations applied"
  check "uses the address set when it started, not at build" page_mentions / 'https://check.example'
  check "admin opens" page_opens /admin
  check "drops root and runs as the app user" site_user_is 100
  check "the app user can write to the one disk" docker exec --user app "$app" test -w /data/media
  check "talks to the database over TLS" uses_tls
  check "Docker reports it healthy" docker_says_healthy

  echo "Editor's work: an upload, then a backup made, checked and restored"
  if first_admin; then
    echo "  ok    creates the first admin"
    check "uploads a photo" upload_photo
    check "serves the photo" page_opens "/api/v1/media/file/$file"
    check "keeps the photo on the disk" docker exec "$app" test -f "/data/media/$file"
    check "makes a backup" make_backup
    check "the backup checks out, including a trial restore" check_backup
    check "deletes the photo" delete_photo
    if restore_backup; then
      echo "  ok    restores the backup and restarts by itself"
      if wait_for_site 8080; then
        echo "  ok    answers again after the restart"
        check "the photo's record is back" page_opens "/api/v1/media/$media_id"
        check "the photo itself is back" page_opens "/api/v1/media/file/$file"
      else
        echo "  FAIL  didn't come back after the restore"; failures=$((failures + 1))
      fi
    else
      echo "  FAIL  restore"; failures=$((failures + 1))
    fi
  else
    echo "  FAIL  creates the first admin, so the editor's checks were skipped"; failures=$((failures + 1))
  fi
else
  echo "  FAIL  the site didn't answer"; failures=$((failures + 1))
fi
docker rm -f "$app" >/dev/null

echo "A host that forbids root: an arbitrary user, default folders and port, plain database connection"
docker run -d --name "$app" --network "$net" $platform -p 127.0.0.1::3000 --user 12345:0 \
  -e DATABASE_URI="$db_url" -e PAYLOAD_SECRET="$secret" -e NEXT_PUBLIC_SITE_URL=https://check.example "$image" >/dev/null
if wait_for_site 3000; then
  echo "  ok    starts and answers"
  check "home page opens" page_opens /
  check "can write uploads" docker exec "$app" test -w /app/media
  check "can write the image cache" docker exec "$app" test -w /app/.next/cache
  check "can write backups" docker exec "$app" test -w /app/backups
  check "the backup tools reach the database" docker exec "$app" sh -c 'LD_LIBRARY_PATH=/opt/pg/lib /opt/pg/bin/pg_dump -d "$DATABASE_URI" -Fc -f "$BACKUPS_DIR/check.dump"'
else
  echo "  FAIL  the site didn't answer"; failures=$((failures + 1))
fi

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed."
  exit 1
fi
echo "All checks passed."
