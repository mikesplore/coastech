#!/usr/bin/env bash
set -Eeuo pipefail

readonly image_repository="${IMAGE_REPOSITORY:-mikesplore/coastech-backend}"
readonly image_tag="${IMAGE_TAG:-latest}"
readonly image="$image_repository:$image_tag"
readonly container_name="${CONTAINER_NAME:-coastech-backend}"
readonly network="${DOCKER_NETWORK:-coastech-net}"
readonly postgres_container="${POSTGRES_CONTAINER:-app-postgres}"
readonly redis_container="${REDIS_CONTAINER:-redis}"
readonly env_file="${ENV_FILE:-.env}"
readonly host_port="${HOST_PORT:-9000}"
readonly container_port="${CONTAINER_PORT:-9000}"

if [[ ! -f "$env_file" ]]; then
  printf 'Environment file not found: %s\n' "$env_file" >&2
  exit 1
fi

if ! docker network inspect "$network" >/dev/null 2>&1; then
  docker network create "$network" >/dev/null
fi

for dependency in "$postgres_container" "$redis_container"; do
  if ! docker inspect "$dependency" >/dev/null 2>&1; then
    printf 'Required container not found: %s\n' "$dependency" >&2
    exit 1
  fi

  if [[ "$(docker inspect -f '{{.State.Running}}' "$dependency")" != "true" ]]; then
    docker start "$dependency" >/dev/null
  fi

  if ! docker network inspect "$network" -f '{{range .Containers}}{{.Name}}{{"\n"}}{{end}}' | grep -Fxq "$dependency"; then
    docker network connect "$network" "$dependency"
  fi
done

docker pull "$image"
docker rm -f "$container_name" >/dev/null 2>&1 || true

docker run --rm \
  --network "$network" \
  --env-file "$env_file" \
  "$image" \
  npx medusa db:migrate --skip-scripts

if [[ "${RUN_SEED:-false}" == "true" ]]; then
  docker run --rm \
    --network "$network" \
    --env-file "$env_file" \
    "$image" \
    npx medusa exec ./src/migration-scripts/initial-data-seed.js

  docker run --rm \
    --network "$network" \
    --env-file "$env_file" \
    "$image" \
    npx medusa db:migrate
fi

docker run -d \
  --name "$container_name" \
  --network "$network" \
  --env-file "$env_file" \
  -p "$host_port:$container_port" \
  --restart unless-stopped \
  "$image" \
  npx medusa start >/dev/null

for attempt in $(seq 1 60); do
  if ! docker inspect -f '{{.State.Running}}' "$container_name" 2>/dev/null | grep -q true; then
    printf 'Backend stopped during startup. Recent logs:\n' >&2
    docker logs --tail 100 "$container_name" >&2
    exit 1
  fi

  if curl -fsS --max-time 2 "http://127.0.0.1:$host_port/health" >/dev/null 2>&1; then
    admin_html="$(curl -fsS --max-time 2 "http://127.0.0.1:$host_port/app/")"
    if grep -qE '/app/@vite/client|@react-refresh|/app/entry\.jsx' <<<"$admin_html"; then
      printf 'Backend is serving the Medusa admin in development mode. Deploy the built image with `medusa start`.\n' >&2
      docker logs --tail 100 "$container_name" >&2
      exit 1
    fi
    printf 'Backend is ready: %s\n' "http://127.0.0.1:$host_port"
    exit 0
  fi

  sleep 1
done

printf 'Backend did not become ready. Recent logs:\n' >&2
docker logs --tail 100 "$container_name" >&2
exit 1
