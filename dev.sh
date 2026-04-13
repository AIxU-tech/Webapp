#!/bin/bash
# Start AIxU dev environment and print phone-accessible URL.
# Usage: ./dev.sh [--no-login] [any docker compose up args]
#
#   --no-login   Disable dev auto-login so you can test flows as
#                an anonymous user (e.g. attendance check-in on phone).

# Parse our flags, pass the rest through to docker compose
NO_LOGIN=false
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --no-login) NO_LOGIN=true ;;
    *)          ARGS+=("$arg") ;;
  esac
done

export DISABLE_AUTO_LOGIN=$NO_LOGIN

# Detect LAN IP (macOS)
IP=$(ipconfig getifaddr en0 2>/dev/null)
[ -z "$IP" ] && IP=$(ipconfig getifaddr en1 2>/dev/null)

# Background: print URL once app is healthy
(
  # Wait for port to go down (old containers stopping during rebuild)
  while curl -sf http://localhost:5173/healthz >/dev/null 2>&1; do
    sleep 1
  done
  # Now wait for the new container to come up
  while ! curl -sf http://localhost:5173/healthz >/dev/null 2>&1; do
    sleep 2
  done
  echo ""
  echo "==========================================="
  echo "  Local:  http://localhost:5173/app"
  [ -n "$IP" ] && echo "  Phone:  http://${IP}:5173/app"
  $NO_LOGIN && echo "  Auto-login: DISABLED (--no-login)"
  echo "==========================================="
  echo ""
) &
URL_PID=$!

trap "kill $URL_PID 2>/dev/null" EXIT

docker compose down -v --remove-orphans
docker compose up --build "${ARGS[@]}"
