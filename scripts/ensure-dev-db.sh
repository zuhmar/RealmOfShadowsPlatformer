#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Do not start a local database when the user configured a different connection.
if ! node --env-file-if-exists=apps/server/.env --input-type=module -e '
 const url=new URL(process.env.DATABASE_URL??"postgresql://realm:realm@localhost:5432/realm");
 process.exit(["localhost","127.0.0.1"].includes(url.hostname)&&url.port==="5432"&&url.username==="realm"&&url.password==="realm"&&url.pathname==="/realm"?0:1);
'; then
  echo "Using the configured PostgreSQL service; no local container was changed."
  exit 0
fi
# Explicit local socket: do not accidentally use a remote Docker context.
docker_local() {
  env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
    docker --host=unix:///var/run/docker.sock "$@"
}
docker_local info >/dev/null
if docker_local container inspect realm-postgres >/dev/null 2>&1; then
  image="$(docker_local inspect --format '{{.Config.Image}}' realm-postgres)"
  if [ "$image" != "postgres:16-alpine" ]; then
    echo "realm-postgres exists with a different image; refusing to change it." >&2
    exit 1
  fi
  docker_local start realm-postgres >/dev/null
else
  docker_local run -d --name realm-postgres \
    -e POSTGRES_USER=realm -e POSTGRES_PASSWORD=realm -e POSTGRES_DB=realm \
    -p 127.0.0.1:5432:5432 -v realm-postgres-data:/var/lib/postgresql/data \
    postgres:16-alpine >/dev/null
fi
for attempt in $(seq 1 30); do
  if docker_local exec realm-postgres pg_isready -U realm -d realm >/dev/null; then
    echo "Development PostgreSQL is ready."
    exit 0
  fi
  sleep 1
done
echo "PostgreSQL did not become ready within 30 seconds." >&2
exit 1
