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

# Configuration
BACKEND_PORT=3001
FRONTEND_PORT=5000
BACKEND_URL="http://localhost:$BACKEND_PORT"
FRONTEND_URL="http://localhost:$FRONTEND_PORT"

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BRIGHT_BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BRIGHT_BLUE}║      Evelyn Chat - Starting...       ║${NC}"
echo -e "${BRIGHT_BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Pre-flight checks
echo -e "${CYAN}Running pre-flight checks...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${BRIGHT_RED}✗ Node.js is not installed${NC}"
    echo -e "${YELLOW}  Please install Node.js 20+ from https://nodejs.org/${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${BRIGHT_RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found: $(npm --version)${NC}"

# Check if .env file exists
if [ ! -f "server/.env" ]; then
    echo -e "${BRIGHT_RED}✗ Missing server/.env file${NC}"
    echo -e "${YELLOW}  Creating from template...${NC}"
    if [ -f "server/.env.example" ]; then
        cp server/.env.example server/.env
        echo -e "${YELLOW}  ⚠ Please edit server/.env and add your API keys:${NC}"
        echo -e "${YELLOW}     - OPENROUTER_API_KEY${NC}"
        echo -e "${YELLOW}     - PERPLEXITY_API_KEY${NC}"
        echo -e "${YELLOW}  Then run this script again.${NC}"
        exit 1
    else
        echo -e "${BRIGHT_RED}✗ server/.env.example not found${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ Environment file found${NC}"

# Check if API keys are set
if ! grep -q "OPENROUTER_API_KEY=sk-" server/.env 2>/dev/null && \
   ! grep -q "OPENROUTER_API_KEY=your_" server/.env 2>/dev/null; then
    echo -e "${YELLOW}⚠ OPENROUTER_API_KEY might not be set in server/.env${NC}"
fi

if ! grep -q "PERPLEXITY_API_KEY=pplx-" server/.env 2>/dev/null && \
   ! grep -q "PERPLEXITY_API_KEY=your_" server/.env 2>/dev/null; then
    echo -e "${YELLOW}⚠ PERPLEXITY_API_KEY might not be set in server/.env${NC}"
fi

# Check if ports are available
if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${BRIGHT_RED}✗ Port $BACKEND_PORT is already in use${NC}"
    echo -e "${YELLOW}  Run './stop.sh' to stop any existing servers${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Port $BACKEND_PORT is available${NC}"

if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${BRIGHT_RED}✗ Port $FRONTEND_PORT is already in use${NC}"
    echo -e "${YELLOW}  Run './stop.sh' to stop any existing servers${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Port $FRONTEND_PORT is available${NC}"

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

echo ""
echo -e "${CYAN}Waiting for servers to be ready...${NC}"

# Wait for backend to be ready
BACKEND_READY=false
for i in {1..30}; do
    if curl -s "$BACKEND_URL/api/health" > /dev/null 2>&1 || \
       curl -s "$BACKEND_URL/api/personality" > /dev/null 2>&1; then
        BACKEND_READY=true
        break
    fi
    sleep 1
done

if [ "$BACKEND_READY" = true ]; then
    echo -e "${GREEN}✓ Backend is ready${NC}"
else
    echo -e "${YELLOW}⚠ Backend might still be starting...${NC}"
fi

# Wait for frontend to be ready
FRONTEND_READY=false
for i in {1..30}; do
    if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
        FRONTEND_READY=true
        break
    fi
    sleep 1
done

if [ "$FRONTEND_READY" = true ]; then
    echo -e "${GREEN}✓ Frontend is ready${NC}"
else
    echo -e "${YELLOW}⚠ Frontend might still be starting...${NC}"
fi

echo ""
echo -e "${BRIGHT_GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${BRIGHT_GREEN}║    Servers started successfully!     ║${NC}"
echo -e "${BRIGHT_GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BRIGHT_CYAN}🌐 Frontend:${NC} ${WHITE}$FRONTEND_URL${NC}"
echo -e "${BRIGHT_CYAN}⚙️  Backend:${NC}  ${WHITE}$BACKEND_URL${NC}"
echo ""
echo -e "${GRAY}Press Ctrl+C to stop both servers${NC}"

# Ask if user wants to open browser (only in interactive mode)
if [ -t 0 ]; then
    echo ""
    read -t 5 -p "$(echo -e ${CYAN}Open browser? [y/N]: ${NC})" -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${CYAN}Opening browser...${NC}"
        if command -v open &> /dev/null; then
            open "$FRONTEND_URL"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "$FRONTEND_URL"
        else
            echo -e "${YELLOW}Could not open browser automatically${NC}"
        fi
    fi
fi

echo ""

# Wait for both processes
wait

