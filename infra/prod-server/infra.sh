#!/bin/bash
# One-time setup: create the external Docker network compose.yml expects. Mirrors the other apps'
# infra.sh scripts under ~/webroot, which pre-create a named network rather than let compose
# generate a default one — a shared, predictable name is what lets the monitoring stack attach.
#
# The `monitoring` network is NOT created here: it belongs to ~/webroot/00-admin/monitoring and
# already exists on this host. If it does not, that stack has to come up first.
set -euo pipefail

if docker network inspect abofonsanet >/dev/null 2>&1; then
  echo "abofonsanet already exists"
else
  docker network create abofonsanet
  echo "created abofonsanet"
fi

if ! docker network inspect monitoring >/dev/null 2>&1; then
  echo "WARNING: the shared 'monitoring' network is missing. Bring up ~/webroot/00-admin/monitoring" >&2
  echo "         first, or the api service will fail to start." >&2
fi

# --- OpenTelemetry agent -------------------------------------------------------------------------
#
# Fetched here rather than used from the image because the image bakes in v2.9.0, which instruments
# nothing at all on the Java 25 runtime it ships — see the OpenTelemetry comment in compose.yml.
# Once the image has been rebuilt from api/Dockerfile (now pinned to the same version below), this
# whole section and the bind mount in compose.yml can go.
#
# The checksum is pinned: this jar is fetched over the network and then loaded into the JVM of a
# production service, so "it downloaded" is not the same as "it is the right file". A truncated
# download would otherwise present as the api failing to start with no obvious cause.
OTEL_AGENT_VERSION="2.30.0"
OTEL_AGENT_SHA256="9d6bc2ad8dd8fb7f730984988e57b8ac0a82d81c7b3b8ae795378718733a509d"
OTEL_AGENT_PATH="$(dirname "${BASH_SOURCE[0]}")/agent/otel-javaagent.jar"

if [ -f "$OTEL_AGENT_PATH" ] \
   && echo "$OTEL_AGENT_SHA256  $OTEL_AGENT_PATH" | sha256sum -c --status 2>/dev/null; then
  echo "otel javaagent v$OTEL_AGENT_VERSION already present"
else
  mkdir -p "$(dirname "$OTEL_AGENT_PATH")"
  echo "fetching otel javaagent v$OTEL_AGENT_VERSION"
  # To a temp file first: writing straight to the final path would leave a half-downloaded jar in
  # place for the next `start` to mount into the JVM.
  curl -fsSL --retry 3 -o "$OTEL_AGENT_PATH.tmp" \
    "https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v${OTEL_AGENT_VERSION}/opentelemetry-javaagent.jar"
  if ! echo "$OTEL_AGENT_SHA256  $OTEL_AGENT_PATH.tmp" | sha256sum -c --status; then
    rm -f "$OTEL_AGENT_PATH.tmp"
    echo "ERROR: otel javaagent checksum mismatch. Not installing it." >&2
    exit 1
  fi
  mv "$OTEL_AGENT_PATH.tmp" "$OTEL_AGENT_PATH"
  echo "installed otel javaagent v$OTEL_AGENT_VERSION"
fi
