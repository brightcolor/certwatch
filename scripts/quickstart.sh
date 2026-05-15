#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${CERTWATCH_REPO_URL:-https://github.com/brightcolor/certwatch.git}"
INSTALL_DIR="${CERTWATCH_INSTALL_DIR:-/opt/certwatch}"
APP_PORT="${CERTWATCH_PORT:-8080}"
CONTAINER_PORT="${CERTWATCH_CONTAINER_PORT:-8080}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run this script as root, for example: sudo bash scripts/quickstart.sh"
  exit 1
fi

need_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    echo "Install it first, then rerun this script."
    exit 1
  fi
}

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64
  fi
}

need_command git
need_command docker

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required. Install the Docker Compose plugin and rerun this script."
  exit 1
fi

if [[ -d "${INSTALL_DIR}/.git" ]]; then
  echo "Updating existing checkout in ${INSTALL_DIR}"
  git -C "${INSTALL_DIR}" pull --ff-only
else
  echo "Cloning CertWatch into ${INSTALL_DIR}"
  mkdir -p "$(dirname "${INSTALL_DIR}")"
  git clone "${REPO_URL}" "${INSTALL_DIR}"
fi

cd "${INSTALL_DIR}"

if [[ ! -f .env ]]; then
  SESSION_SECRET="${CERTWATCH_SESSION_SECRET:-$(random_secret)}"
  cat > .env <<ENV
NODE_ENV=production
PORT=${CONTAINER_PORT}
HOST_PORT=${APP_PORT}
BASE_URL=http://localhost:${APP_PORT}
DATABASE_PATH=/data/certwatch.sqlite
SESSION_SECRET=${SESSION_SECRET}
TRUST_PROXY=true
COOKIE_SECURE=false
ALLOW_PRIVATE_TARGETS=false
CHECK_CONCURRENCY=4
DEFAULT_INTERVAL_SECONDS=3600
DEFAULT_WARNING_DAYS=30
DEFAULT_CRITICAL_DAYS=7
ENV
  chmod 600 .env
  echo "Created ${INSTALL_DIR}/.env"
  echo "Create the first admin account in the web setup screen."
else
  echo "Using existing ${INSTALL_DIR}/.env"
fi

docker compose up -d --build
if [[ "${CERTWATCH_ENABLE_WATCHTOWER:-false}" == "true" ]]; then
  docker compose --profile watchtower up -d watchtower
fi

echo
echo "CertWatch is starting."
echo "Open: http://localhost:${APP_PORT}"
echo "First run: create the admin account in the browser."
echo "Data volume: certwatch_certwatch-data"
echo
echo "Useful commands:"
echo "  cd ${INSTALL_DIR}"
echo "  docker compose logs -f"
echo "  docker compose pull && docker compose up -d --build"
echo "  CERTWATCH_ENABLE_WATCHTOWER=true bash scripts/quickstart.sh"
