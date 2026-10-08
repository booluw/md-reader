#!/usr/bin/env bash
# Builds the production image and serves it on localhost:4174 for the
# nginx-backed security suite (playwright.security.config.ts).
set -euo pipefail

readonly image="md-reader-security"
readonly container="md-reader-security"
readonly port="4174"

log_pid=""

log() { printf '[security-e2e] %s\n' "$*" >&2; }

stop_all() {
  if [[ -n "${log_pid}" ]]; then
    kill "${log_pid}" 2>/dev/null || true
    log_pid=""
  fi
  docker rm -f "${container}" >/dev/null 2>&1 || true
}

trap stop_all EXIT
trap 'stop_all; exit 143' INT TERM

if ! docker build --quiet --tag "${image}" . >/dev/null; then
  log "docker build failed"
  exit 1
fi
log "image ${image} built"

stop_all

docker run --detach --name "${container}" --publish "${port}:8080" "${image}" >/dev/null
log "container up on http://localhost:${port}"

docker logs --follow "${container}" &
log_pid=$!
wait "${log_pid}"
