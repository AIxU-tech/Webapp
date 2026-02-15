#!/bin/bash

# AIxU Mobile Testing Script
# Starts both servers exposed to your local network so you can test on your phone.
#
# Usage:
#   ./scripts/dev-mobile.sh          Full setup (clean reinstall + start servers)
#   ./scripts/dev-mobile.sh --quick  Quick start (skip reinstall, just start servers)
#
# Then open the printed URL on your phone (same Wi-Fi network or USB tethered).

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Parse arguments
QUICK_MODE=false
if [ "$1" == "--quick" ] || [ "$1" == "-q" ]; then
    QUICK_MODE=true
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Detect local IP address
get_local_ip() {
    # Try en0 (Wi-Fi) first, then en1, then any active interface
    local ip
    ip=$(ipconfig getifaddr en0 2>/dev/null)
    if [ -z "$ip" ]; then
        ip=$(ipconfig getifaddr en1 2>/dev/null)
    fi
    if [ -z "$ip" ]; then
        ip=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}')
    fi
    echo "$ip"
}

LOCAL_IP=$(get_local_ip)

if [ -z "$LOCAL_IP" ]; then
    echo -e "${RED}Could not detect your local IP address.${NC}"
    echo -e "${RED}Make sure you're connected to Wi-Fi or have a network connection.${NC}"
    exit 1
fi

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}   AIxU Mobile Testing Server Setup${NC}"
if [ "$QUICK_MODE" = true ]; then
    echo -e "${CYAN}            (Quick Mode)${NC}"
fi
echo -e "${CYAN}==========================================${NC}"
echo ""

# Function to kill process on a port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}Killing process on port $port (PID: $pid)...${NC}"
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Kill any existing processes on our ports
echo -e "${YELLOW}Checking for existing processes...${NC}"
kill_port 5000
kill_port 5173
echo -e "${GREEN}Ports 5000 and 5173 are now free.${NC}"
echo ""

# Clean and reinstall node_modules (skip if --quick)
if [ "$QUICK_MODE" = false ]; then
    echo -e "${YELLOW}Cleaning and reinstalling frontend dependencies...${NC}"
    cd "$PROJECT_DIR/frontend"
    rm -rf node_modules package-lock.json
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install npm dependencies. Exiting.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Frontend dependencies installed.${NC}"
    echo ""
else
    echo -e "${YELLOW}Skipping dependency reinstall (quick mode).${NC}"
    echo ""
fi

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${RED}Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup SIGINT SIGTERM

# Start Flask backend bound to all interfaces
cd "$PROJECT_DIR"
echo -e "${GREEN}Starting Flask backend on 0.0.0.0:5000...${NC}"
HOST=0.0.0.0 python -c "
import os
os.environ.setdefault('HOST', '0.0.0.0')
from backend import create_app
from backend.extensions import socketio
app = create_app()
socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
" &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start React frontend exposed to the network (--host flag)
cd "$PROJECT_DIR/frontend"
echo -e "${GREEN}Starting React frontend on 0.0.0.0:5173...${NC}"
npx vite --host 0.0.0.0 &
FRONTEND_PID=$!

# Wait for Vite to start
sleep 3

echo ""
echo -e "${CYAN}==========================================${NC}"
echo -e "${GREEN}${BOLD}  Both servers are running!${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""
echo -e "${BOLD}  On this computer:${NC}"
echo -e "    ${YELLOW}http://localhost:5173/app${NC}"
echo ""
echo -e "${BOLD}  On your phone (same Wi-Fi / USB):${NC}"
echo -e "    ${GREEN}${BOLD}http://${LOCAL_IP}:5173/app${NC}"
echo ""
echo -e "${CYAN}------------------------------------------${NC}"
echo -e "  ${YELLOW}Tip:${NC} Scan this URL or type it into your"
echo -e "  phone's browser. Both devices must be on"
echo -e "  the same Wi-Fi network, or your phone"
echo -e "  must be USB-tethered to this computer."
echo -e "${CYAN}------------------------------------------${NC}"
echo ""
echo -e "  Press ${RED}Ctrl+C${NC} to stop both servers."
echo ""

# Wait for both processes
wait
