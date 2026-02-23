#!/bin/bash
# Start AIxU dev environment and print phone-accessible URL.
# Usage: ./dev.sh [any docker compose up args]

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
  echo "==========================================="
  echo ""
) &
URL_PID=$!

trap "kill $URL_PID 2>/dev/null" EXIT

docker compose down -v --remove-orphans
docker compose up --build "$@"
