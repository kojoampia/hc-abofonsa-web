#!/bin/bash
# Builds the api and web Docker images and pushes them to the registry.
# Requires `docker login` against $REGISTRY_HOST to already be done.
#
#   ./build.sh                    # tag with the current short commit
#   TAG=v1.2.3 ./build.sh         # tag a release
#   REGISTRY=docker.jojoaddison.net/ns ./build.sh   # push somewhere else
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

# Namespace prefix, not just the host — image names are ${REGISTRY}/abofonsa-{api,web}.
#
# This is the `local` deploy channel's registry, and it is deliberately NOT where CI pushes:
# .github/workflows/release.yml builds the same two images and pushes them to ghcr.io. The two
# channels are told apart by the registry, which is why the server's .env pins REGISTRY alongside
# TAG and why `./deploy.sh --channel github` never calls this script — see CONTRIBUTING.md
# "Deploy channels". Overridable so deploy.sh can pass its own value.
REGISTRY="${REGISTRY:-docker.jojoaddison.net}"
REGISTRY_HOST="${REGISTRY%%/*}"
API_IMAGE="${REGISTRY}/abofonsa-api"
WEB_IMAGE="${REGISTRY}/abofonsa-web"

# Defaults to the current commit so every pushed image is traceable back to source.
TAG="${TAG:-$(git rev-parse --short HEAD)}"

if ! grep -q "$REGISTRY_HOST" ~/.docker/config.json 2>/dev/null; then
  echo "warning: no stored credential for $REGISTRY_HOST - the push will fail." >&2
  echo "         run: docker login $REGISTRY_HOST" >&2
fi

# --network=host works around a BuildKit DNS resolution failure reaching Maven Central and the npm
# registry in some sandboxed Docker setups (see CONTRIBUTING.md).
BUILD_ARGS=(--network=host)

# The API image builds from the REPOSITORY ROOT, not from api/: it needs web/public/i18n on the
# classpath for the i18n coverage report (spec §9.4 T-7). `docker build api/` cannot work.
echo "Building ${API_IMAGE}:${TAG} (context: repository root, dockerfile: api/Dockerfile)"
docker build "${BUILD_ARGS[@]}" -f api/Dockerfile \
  -t "${API_IMAGE}:${TAG}" -t "${API_IMAGE}:latest" .

echo "Building ${WEB_IMAGE}:${TAG} from web/"
docker build "${BUILD_ARGS[@]}" \
  -t "${WEB_IMAGE}:${TAG}" -t "${WEB_IMAGE}:latest" web/

echo "Pushing ${API_IMAGE}:${TAG} and :latest"
docker push "${API_IMAGE}:${TAG}"
docker push "${API_IMAGE}:latest"

echo "Pushing ${WEB_IMAGE}:${TAG} and :latest"
docker push "${WEB_IMAGE}:${TAG}"
docker push "${WEB_IMAGE}:latest"

echo "Done. Pushed:"
echo "  ${API_IMAGE}:${TAG}"
echo "  ${WEB_IMAGE}:${TAG}"
