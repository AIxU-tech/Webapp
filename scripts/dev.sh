#!/bin/bash

# AIxU Development Server Script
# Runs both Flask backend and React frontend in dev mode
#
# Usage:
#   ./dev.sh          Full setup (clean reinstall + start servers)
#   ./dev.sh --quick  Quick start (skip reinstall, just start servers)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
QUICK_MODE=false
if [ "$1" == "--quick" ] || [ "$1" == "-q" ]; then
    QUICK_MODE=true
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}   AIxU Development Server Setup${NC}"
if [ "$QUICK_MODE" = true ]; then
    echo -e "${CYAN}         (Quick Mode)${NC}"
fi
echo -e "${CYAN}======================================${NC}"
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

echo -e "${CYAN}======================================${NC}"
echo -e "${GREEN}Starting AIxU Development Servers...${NC}"
echo -e "${CYAN}======================================${NC}"
echo -e "${YELLOW}Backend:${NC}  http://localhost:5000"
echo -e "${YELLOW}Frontend:${NC} http://localhost:5173/app/"
echo ""

# Start Flask backend
cd "$PROJECT_DIR"
echo -e "${GREEN}Starting Flask backend...${NC}"
python app.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start React frontend
cd "$PROJECT_DIR/frontend"
echo -e "${GREEN}Starting React frontend...${NC}"
npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}Both servers running. Press Ctrl+C to stop.${NC}"
echo ""

# Wait for both processes
wait
