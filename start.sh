#!/bin/bash

# Evelyn Chat - Start Script
# Starts both backend and frontend servers with beautiful logging

# Colors for output
GREEN='\033[0;32m'
BRIGHT_GREEN='\033[1;32m'
BLUE='\033[0;34m'
BRIGHT_BLUE='\033[1;34m'
CYAN='\033[0;36m'
BRIGHT_CYAN='\033[1;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BRIGHT_RED='\033[1;31m'
MAGENTA='\033[0;35m'
BRIGHT_MAGENTA='\033[1;35m'
GRAY='\033[0;90m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BRIGHT_BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BRIGHT_BLUE}║      Evelyn Chat - Starting...       ║${NC}"
echo -e "${BRIGHT_BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Function to colorize backend logs
colorize_backend() {
    while IFS= read -r line; do
        timestamp=$(date '+%H:%M:%S')
        
        # Error logs
        if echo "$line" | grep -qiE "error|failed|fail|exception"; then
            echo -e "${GRAY}[${timestamp}]${NC} ${BRIGHT_RED}[BACKEND]${NC} ${RED}$line${NC}"
        
        # Warning logs
        elif echo "$line" | grep -qiE "warn|warning"; then
            echo -e "${GRAY}[${timestamp}]${NC} ${YELLOW}[BACKEND]${NC} ${YELLOW}$line${NC}"
        
        # Success/completion logs
        elif echo "$line" | grep -qiE "✓|success|complete|ready|listening|started"; then
            echo -e "${GRAY}[${timestamp}]${NC} ${BRIGHT_GREEN}[BACKEND]${NC} ${GREEN}$line${NC}"
        
        # InnerThought system logs
        elif echo "$line" | grep -q "\[InnerThought\]"; then
            echo -e "${GRAY}[${timestamp}]${NC} ${BRIGHT_MAGENTA}[BACKEND]${NC} ${MAGENTA}$line${NC}"
        
        # Memory/Database logs
        elif echo "$line" | grep -qE "\[Memory\]|\[Database\]|\[Prisma\]"; then
            echo -e "${GRAY}[${timestamp}]${NC} ${BRIGHT_CYAN}[BACKEND]${NC} ${CYAN}$line${NC}"
        
        # Personality/Agent logs
        elif echo "$line" | grep -qE "\[Personality\]|\[Agent\]|\[Orchestrator\]"; then
            echo -e "${GRAY}[${timestamp}]${NC} ${BRIGHT_BLUE}[BACKEND]${NC} ${BLUE}$line${NC}"
        
        # WebSocket logs
        elif echo "$line" | grep -qE "WebSocket|ws:|connection"; then
            echo -e "${GRAY}[${timestamp}]${NC} ${CYAN}[BACKEND]${NC} ${CYAN}$line${NC}"
        
        # API/Route logs
        elif echo "$line" | grep -qE "GET|POST|PUT|DELETE|API"; then
            echo -e "${GRAY}[${timestamp}]${NC} ${BLUE}[BACKEND]${NC} $line"
        
        # Default logs
        else
            echo -e "${GRAY}[${timestamp}]${NC} ${WHITE}[BACKEND]${NC} $line"
        fi
    done
}

# Function to colorize frontend logs
colorize_frontend() {
    while IFS= read -r line; do
        timestamp=$(date '+%H:%M:%S')
        
        # Vite-specific formatting
        if echo "$line" | grep -q "VITE"; then
            echo -e "${GRAY}[${timestamp}]${NC} ${BRIGHT_CYAN}[FRONTEND]${NC} ${CYAN}$line${NC}"
        elif echo "$line" | grep -q "Local:"; then
            echo -e "${GRAY}[${timestamp}]${NC} ${BRIGHT_GREEN}[FRONTEND]${NC} ${GREEN}$line${NC}"
        elif echo "$line" | grep -q "Network:"; then
            echo -e "${GRAY}[${timestamp}]${NC} ${BRIGHT_BLUE}[FRONTEND]${NC} ${BLUE}$line${NC}"
        elif echo "$line" | grep -qE "error|Error"; then
            echo -e "${GRAY}[${timestamp}]${NC} ${BRIGHT_RED}[FRONTEND]${NC} ${RED}$line${NC}"
        elif echo "$line" | grep -qE "ready|✓"; then
            echo -e "${GRAY}[${timestamp}]${NC} ${BRIGHT_GREEN}[FRONTEND]${NC} ${GREEN}$line${NC}"
        else
            echo -e "${GRAY}[${timestamp}]${NC} ${BRIGHT_CYAN}[FRONTEND]${NC} $line"
        fi
    done
}

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║    Shutting down servers...          ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
    
    # Kill backend
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        wait $BACKEND_PID 2>/dev/null
    fi
    
    # Kill frontend
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        wait $FRONTEND_PID 2>/dev/null
    fi
    
    echo -e "${BRIGHT_GREEN}✓ All servers stopped${NC}"
    echo ""
    exit 0
}

# Set up trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Check if node_modules exist
if [ ! -d "server/node_modules" ] || [ ! -d "web/node_modules" ]; then
    echo -e "${YELLOW}⚠ Dependencies not found. Installing...${NC}"
    npm install
    echo ""
fi

echo -e "${BRIGHT_GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${BRIGHT_GREEN}║    Starting Backend Server...        ║${NC}"
echo -e "${BRIGHT_GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Start backend server with colorized output
cd server
npm run dev 2>&1 | colorize_backend &
BACKEND_PID=$!
cd ..

# Wait for backend to initialize
sleep 3

# Check if backend started successfully
if ! ps -p $BACKEND_PID > /dev/null; then
    echo -e "${BRIGHT_RED}✗ Backend failed to start${NC}"
    exit 1
fi

echo ""
echo -e "${BRIGHT_GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${BRIGHT_GREEN}║    Starting Frontend Server...       ║${NC}"
echo -e "${BRIGHT_GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Start frontend server with colorized output
cd web
npm run dev 2>&1 | colorize_frontend &
FRONTEND_PID=$!
cd ..

# Wait for both processes
wait

