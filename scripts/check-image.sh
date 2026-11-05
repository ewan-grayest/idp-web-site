#!/bin/sh
# Checks the image can start on a host it knows nothing about. Builds it with no build arguments, then starts it the way
# hosting platforms do: settings as variables only, with the port, HOSTNAME and user chosen by the host.
# Uses a throwaway database and removes everything it made, so it touches no real data. Needs Docker and curl.
# Usage: scripts/check-image.sh [--platform linux/amd64]   (the platform of the host, when it differs from this one)
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
db_url="postgres://idp:check@$db:5432/idp"
secret="check-secret-$id"
failures=0

cleanup() {
  docker rm -f "$app" "$db" >/dev/null 2>&1 || true
  docker network rm "$net" >/dev/null 2>&1 || true
  docker rmi "$image" >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 130' INT TERM

check() {
  desc=$1; shift
  if "$@"; then echo "  ok    $desc"; else echo "  FAIL  $desc"; failures=$((failures + 1)); fi
}

# Waits for the health check through the published port; a container that stopped ends the wait
wait_for_site() {
  addr=$(docker port "$app" "$1" | head -1)
  base="http://127.0.0.1:${addr##*:}"
  i=0
  while [ $i -lt 90 ]; do
    curl -fs -o /dev/null "$base/api/health" && return 0
    [ "$(docker inspect -f '{{.State.Running}}' "$app")" = true ] || break
    i=$((i + 1))
    sleep 2
  done
  docker logs --tail 40 "$app" 2>&1 | sed 's/^/        /'
  return 1
}

stops_with_message() {
  out=$(docker run --rm $platform "$image" 2>&1) && return 1
  echo "$out" | grep -q PAYLOAD_SECRET
}
page_mentions() { curl -fsS "$base$1" | grep -q "$2"; }
page_opens() { curl -fsSL -o /dev/null "$base$1"; }
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

echo "Building with no build arguments"
docker build $platform -t "$image" .

docker network create "$net" >/dev/null
docker run -d --name "$db" --network "$net" -e POSTGRES_USER=idp -e POSTGRES_PASSWORD=check -e POSTGRES_DB=idp postgres:16 >/dev/null
until docker exec "$db" pg_isready -q -h 127.0.0.1 -U idp 2>/dev/null; do sleep 1; done

echo "No settings at all"
check "stops and names the missing setting" stops_with_message

echo "A platform: its own port, HOSTNAME and DATABASE_URL, one disk, a bare domain as the address"
docker run -d --name "$app" --network "$net" $platform -p 127.0.0.1::8080 \
  -e PORT=8080 -e HOSTNAME=some-pod-name -e DATABASE_URL="$db_url" -e PAYLOAD_SECRET="$secret" \
  -e NEXT_PUBLIC_SITE_URL=check.example -e MEDIA_DIR=/data/media -e BACKUPS_DIR=/data/backups --tmpfs /data "$image" >/dev/null
if wait_for_site 8080; then
  echo "  ok    answers on the host's port, migrations applied"
  check "uses the address set when it started, not at build" page_mentions / 'https://check.example'
  check "admin opens" page_opens /admin
  check "drops root and runs as the app user" site_user_is 100
  check "the app user can write to the one disk" docker exec --user app "$app" test -w /data/media
  check "Docker reports it healthy" docker_says_healthy
else
  echo "  FAIL  the site didn't answer"; failures=$((failures + 1))
fi
docker rm -f "$app" >/dev/null

echo "A host that forbids root: an arbitrary user, default folders and port"
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
