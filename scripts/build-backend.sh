#!/usr/bin/env bash
set -Eeuo pipefail

readonly image_repository="${IMAGE_REPOSITORY:-mikesplore/coastech-backend}"
readonly image_tag="${IMAGE_TAG:-latest}"
readonly dockerfile="${DOCKERFILE:-apps/backend/Dockerfile}"

docker build \
  -f "$dockerfile" \
  -t "$image_repository:$image_tag" \
  -t "$image_repository:latest" \
  .

if [[ "${PUSH_IMAGE:-true}" == "true" ]]; then
  docker push "$image_repository:$image_tag"

  if [[ "$image_tag" != "latest" ]]; then
    docker push "$image_repository:latest"
  fi
fi

printf 'Built image: %s:%s\n' "$image_repository" "$image_tag"
