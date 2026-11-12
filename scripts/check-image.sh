#!/bin/sh
# Checks the image starts and works on a host it knows nothing about. Builds it with no build arguments, then runs it
# the way hosting platforms do: settings as variables only, the port, HOSTNAME and user chosen by the host.
# Also builds the database's image (deploy/db/Dockerfile), for hosts that build every container from a Dockerfile.
# The main case is the layout every setup uses: the site and PostgreSQL 16 in separate containers, with storage at
# /data/media and /data/backup in the site's and /data/db in the database's, here the database's image with only a
# password and one disk at /data. On it the check works the site like an editor (uploads a photo, makes, checks and
# restores a backup), then redeploys both containers on the same storage. A new host then takes that backup as an
# upload and restores it before anything is uploaded there, run as an arbitrary user on disks with a lost+found.
# Then a database disk mounted straight at /data/db, a managed-style database that wants TLS, and a host that forbids root.
# Uses throwaway containers and volumes and removes everything it made, so it touches no real data. Needs Docker and curl.
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
db_image="idp-db-check:$id"
net="idp-check-$id"
db="idp-check-db-$id"
app="idp-check-app-$id"
tls="idp-check-tls-$id"
lf="idp-check-lf-$id"
new_db="idp-check-new-db-$id"
vol_media="idp-check-media-$id"
vol_db="idp-check-db-$id"
vol_backup="idp-check-backup-$id"
vol_data="idp-check-data-$id"
vol_lf="idp-check-lf-$id"
vol_new_media="idp-check-new-media-$id"
vol_new_backup="idp-check-new-backup-$id"
vol_new_db="idp-check-new-db-$id"
db_url="postgres://idp:check@$db:5432/idp"
tls_url="postgres://idp:check@$tls:5432/idp"
secret="check-secret-$id"
email="check-$id@example.com"
password="check-password-$id"
tmp=$(mktemp -d "${TMPDIR:-/tmp}/idp-check.XXXXXX")
failures=0
base= token= media_id= file= backup=

cleanup() {
  docker rm -f "$app" "$db" "$tls" "$lf" "$new_db" >/dev/null 2>&1 || true
  docker volume rm "$vol_media" "$vol_db" "$vol_backup" "$vol_data" "$vol_lf" "$vol_new_media" "$vol_new_backup" "$vol_new_db" \
    >/dev/null 2>&1 || true
  docker network rm "$net" >/dev/null 2>&1 || true
  docker rmi "$image" "$db_image" >/dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

check() {
  desc=$1; shift
  if "$@"; then echo "  ok    $desc"; else echo "  FAIL  $desc"; failures=$((failures + 1)); fi
}
fail() { echo "  FAIL  $1"; failures=$((failures + 1)); }

# Waits for the health check through the published port. A container that stopped ends the wait
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
logs_say() { docker logs "$1" 2>&1 | grep -q "$2"; }

stops_with() {
  out=$(docker run --rm $platform "$@" 2>&1) && return 1
  echo "$out" | grep -q "$want"
}
# As a Russian browser: with no Accept-Language the site sends Russian addresses on to /en (src/proxy.ts)
page_mentions() { curl -fsS -H 'Accept-Language: ru' "$base$1" | grep -q "$2"; }
page_opens() { curl -fsSL -H 'Accept-Language: ru' -o /dev/null "$base$1"; }
page_gone() { ! curl -fs -o /dev/null "$base$1"; }
site_user_is() { [ "$(docker exec "$app" stat -c %u /proc/1)" = "$1" ]; }
docker_says_healthy() {
  i=0
  while [ $i -lt 30 ]; do
    [ "$(docker inspect -f '{{.State.Health.Status}}' "$1")" = healthy ] && return 0
    i=$((i + 1))
    sleep 3
  done
  return 1
}
uses_tls() {
  n=$(docker exec "$tls" psql -U idp -d idp -Atc "select count(*) from pg_stat_ssl s join pg_stat_activity a using (pid) where s.ssl and a.client_addr is not null")
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
  [ -n "$backup" ] && docker exec "$app" test -f "/data/backup/$backup"
}
check_backup() { api POST "/api/v1/backups/$backup/verify" >/dev/null && wait_for_job; }
download_backup() { api GET "/api/v1/backups/$backup/download" -o "$tmp/$backup" && [ -s "$tmp/$backup" ]; }
# Sent as the admin page sends it; the site keeps a backup's own name
upload_backup() {
  backup=$(api POST /api/v1/backups/upload -H 'Content-Type: application/octet-stream' -H "X-File-Name: $backup" \
    --data-binary @"$tmp/$backup" | json name)
  [ -n "$backup" ]
}
delete_photo() { api DELETE "/api/v1/media/$media_id" >/dev/null && page_gone "/api/v1/media/file/$file"; }
# A restore ends the site's process on purpose; the container starts it again by itself. Followed as the admin page
# follows it: by the task's id, without sign-in (the restore replaces the accounts), through «restarting» until the
# restarted site no longer knows the task
restore_backup() {
  job=$(api POST "/api/v1/backups/$backup/restore" -H 'Content-Type: application/json' -d "{\"confirm\":\"$backup\"}" | json job.id)
  [ -n "$job" ] || return 1
  i=0 seen=
  while [ $i -lt 120 ]; do
    out=$(curl -s -m 5 -w '\n%{http_code}' "$base/api/v1/backups/job/$job")
    body=$(echo "$out" | sed '$d')
    case $(echo "$out" | tail -n 1) in
      200)
        case $(echo "$body" | json job.state) in
          restarting) seen=1 ;;
          failed) echo "        $(echo "$body" | json job.error)"; return 1 ;;
        esac ;;
      404) [ -n "$seen" ] && logs_say "$app" 'The site process ended; starting it again'; return ;;
    esac
    i=$((i + 1))
    sleep 1
  done
  return 1
}
docker_did_not_restart_it() {
  [ "$(docker inspect -f '{{.RestartCount}}' "$app")" = 0 ] && [ "$(docker inspect -f '{{.State.Running}}' "$app")" = true ]
}

# A PostgreSQL 16 container, waited for until it answers. The arguments are `docker run`'s: settings, volumes, the
# image, then any for the server. The database's image needs only the password; postgres:16, as the compose files run
# it, also needs the names and PGDATA ($compose_db)
compose_db="-e POSTGRES_USER=idp -e POSTGRES_PASSWORD=check -e POSTGRES_DB=idp -e PGDATA=/data/db"
start_db() {
  name=$1; shift
  docker run -d --name "$name" --network "$net" "$@" >/dev/null
  i=0
  until docker exec "$name" pg_isready -q -h 127.0.0.1 -U idp 2>/dev/null; do
    i=$((i + 1))
    if [ $i -gt 90 ] || [ "$(docker inspect -f '{{.State.Running}}' "$name")" != true ]; then
      echo "        The test database didn't start:"
      docker logs --tail 20 "$name" 2>&1 | sed 's/^/        /'
      return 1
    fi
    sleep 1
  done
}
# The database as a host that builds it from deploy/db/Dockerfile runs it: the password and one disk at /data
start_hosted_db() { start_db "$db" -e POSTGRES_PASSWORD=check -v "$vol_db":/data "$db_image"; }
# The site as the README's hosts run it: the host's port and HOSTNAME, storage at /data/media and /data/backup,
# the database in its own container, no restart policy
run_site() {
  docker run -d --name "$app" --network "$net" $platform -p 127.0.0.1::8080 -e PORT=8080 -e HOSTNAME=some-pod-name \
    -e DATABASE_URI="$db_url" -e PAYLOAD_SECRET="$secret" -e NEXT_PUBLIC_SITE_URL=check.example \
    -v "$vol_media":/data/media -v "$vol_backup":/data/backup "$image" >/dev/null
}
stops_cleanly() {
  docker stop -t 30 "$app" >/dev/null && [ "$(docker inspect -f '{{.State.ExitCode}}' "$app")" = 0 ]
}

echo "Building with no build arguments"
docker build $platform -t "$image" .
echo "Building the database's image, with the repository as the build context"
docker build $platform -t "$db_image" -f deploy/db/Dockerfile .
builds_in_own_folder() { docker build -q $platform -t "$db_image" deploy/db >/dev/null; }
check "the database's image also builds with its own folder as the context" builds_in_own_folder

echo "Missing settings"
want=PAYLOAD_SECRET
check "no secret: stops and names the setting" stops_with "$image"
want=DATABASE_URI
check "no database address: stops and names the setting" stops_with -e PAYLOAD_SECRET="$secret" "$image"
want='not on a persistent disk'
check "database with no disk: stops and says so" stops_with -e POSTGRES_PASSWORD=check "$db_image"

echo "Every setup: the site and PostgreSQL in separate containers, storage at /data/media, /data/backup and /data/db"
docker network create "$net" >/dev/null
for v in "$vol_media" "$vol_db" "$vol_backup"; do docker volume create "$v" >/dev/null; done
start_hosted_db || exit 1
run_site
if wait_for_site 8080; then
  echo "  ok    answers on the host's port, migrations applied"
  check "uses the address set when it started, not at build" page_mentions / 'https://check.example'
  check "admin opens" page_opens /admin
  check "drops root and runs as the app user" site_user_is 100
  check "the database keeps its files at /data/db" docker exec "$db" test -s /data/db/PG_VERSION
  check "Docker reports the site healthy" docker_says_healthy "$app"
  check "Docker reports the database healthy" docker_says_healthy "$db"

  echo "Editor's work: an upload, then a backup made, checked and restored"
  if first_admin; then
    echo "  ok    creates the first admin"
    check "uploads a photo" upload_photo
    check "serves the photo" page_opens "/api/v1/media/file/$file"
    check "keeps the photo at /data/media" docker exec "$app" test -f "/data/media/$file"
    check "makes a backup at /data/backup" make_backup
    check "the backup checks out, including a trial restore" check_backup
    check "downloads the backup" download_backup
    check "deletes the photo" delete_photo
    if restore_backup && wait_for_site 8080; then
      echo "  ok    restores the backup and starts the site again by itself"
      check "the container itself kept running" docker_did_not_restart_it
      check "the photo's record is back" page_opens "/api/v1/media/$media_id"
      check "the photo itself is back" page_opens "/api/v1/media/file/$file"
    else
      fail "restore"
    fi
  else
    fail "creates the first admin, so the editor's checks were skipped"
  fi

  echo "Redeploy: both containers are replaced, on the same storage"
  check "the site stops cleanly" stops_cleanly
  docker rm -f "$app" "$db" >/dev/null
  start_hosted_db || exit 1
  run_site
  if wait_for_site 8080; then
    echo "  ok    starts again"
    check "the photo is still there" page_opens "/api/v1/media/file/$file"
    check "its record is still there" page_opens "/api/v1/media/$media_id"
    check "the backup is still there" docker exec "$app" test -f "/data/backup/$backup"
  else
    fail "didn't start again on the same storage"
  fi
else
  fail "the site didn't answer"
fi
docker rm -f "$app" >/dev/null

# Where a restore has its own work to do: the site saves the current state first, with no uploads to save yet
echo "A new host: the backup above, uploaded and restored before anything is uploaded here"
echo "  run as an arbitrary user, on disks whose root has a lost+found only root can open"
if [ -s "$tmp/$backup" ]; then
  for v in "$vol_new_media" "$vol_new_backup" "$vol_new_db"; do docker volume create "$v" >/dev/null; done
  for v in "$vol_new_media" "$vol_new_backup"; do
    docker run --rm --user 0 -v "$v":/v --entrypoint sh "$image" -c 'chown 100:0 /v && chmod 775 /v && mkdir -m 700 /v/lost+found'
  done
  start_db "$new_db" -e POSTGRES_PASSWORD=check -v "$vol_new_db":/data "$db_image" || exit 1
  docker run -d --name "$app" --network "$net" $platform -p 127.0.0.1::3000 --user 12345:0 \
    -e DATABASE_URI="postgres://idp:check@$new_db:5432/idp" -e PAYLOAD_SECRET="$secret" -e NEXT_PUBLIC_SITE_URL=https://check.example \
    -v "$vol_new_media":/data/media -v "$vol_new_backup":/data/backup "$image" >/dev/null
  if wait_for_site 3000 && first_admin; then
    check "takes the backup as an upload" upload_backup
    if restore_backup && wait_for_site 3000; then
      echo "  ok    restores it and starts the site again by itself"
      check "the photo's record is there" page_opens "/api/v1/media/$media_id"
      check "the photo itself is there" page_opens "/api/v1/media/file/$file"
      check "the disk's lost+found stays" docker exec "$app" test -d /data/media/lost+found
    else
      fail "restore on the new host"
    fi
  else
    fail "the new host's site didn't answer, or its first admin wasn't created"
  fi
  docker rm -f "$app" "$new_db" >/dev/null
else
  fail "no backup from the first site to restore"
fi

echo "A database disk mounted straight at /data/db, with an empty lost+found on it"
docker volume create "$vol_lf" >/dev/null
docker run --rm -v "$vol_lf":/v --entrypoint mkdir "$db_image" /v/lost+found
check "the database starts on it" start_db "$lf" -e POSTGRES_PASSWORD=check -v "$vol_lf":/data/db "$db_image"
docker rm -f "$lf" >/dev/null

# PostgreSQL with TLS on and a certificate no one vouches for, like a managed database with the provider's own.
# Run as the compose files run postgres:16, so that setup is checked too
start_db "$tls" $compose_db postgres:16 \
  -c ssl=on -c ssl_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem -c ssl_key_file=/etc/ssl/private/ssl-cert-snakeoil.key || exit 1

echo "A managed-style database with TLS and its own certificate, given as DATABASE_URL, one disk at /data"
docker volume create "$vol_data" >/dev/null
docker run -d --name "$app" --network "$net" $platform -p 127.0.0.1::3000 \
  -e DATABASE_URL="$tls_url?sslmode=no-verify" -e PAYLOAD_SECRET="$secret" -e NEXT_PUBLIC_SITE_URL=https://check.example \
  -v "$vol_data":/data "$image" >/dev/null
if wait_for_site 3000; then
  echo "  ok    starts and answers"
  check "talks to the database over TLS" uses_tls
  if first_admin; then
    check "makes a backup over TLS" make_backup
  else
    fail "creates the first admin, so the backup check was skipped"
  fi
else
  fail "the site didn't answer"
fi
docker rm -f "$app" >/dev/null

echo "A host that forbids root: an arbitrary user, no storage"
docker run -d --name "$app" --network "$net" $platform -p 127.0.0.1::3000 --user 12345:0 \
  -e DATABASE_URI="$db_url" -e PAYLOAD_SECRET="$secret" -e NEXT_PUBLIC_SITE_URL=https://check.example "$image" >/dev/null
if wait_for_site 3000; then
  echo "  ok    starts and answers"
  check "home page opens" page_opens /
  check "can write uploads" docker exec "$app" test -w /data/media
  check "can write the image cache" docker exec "$app" test -w /app/.next/cache
  check "can write backups" docker exec "$app" test -w /data/backup
  check "the backup tools reach the database" docker exec "$app" sh -c 'LD_LIBRARY_PATH=/opt/pg/lib /opt/pg/bin/pg_dump -d "$DATABASE_URI" -Fc -f "$BACKUPS_DIR/check.dump"'
else
  fail "the site didn't answer"
fi

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed."
  exit 1
fi
echo "All checks passed."
