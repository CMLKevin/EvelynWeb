#!/bin/bash

# Evelyn Chat - Stop Script
# Stops all running Evelyn servers

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping Evelyn servers...${NC}"

# Kill all node processes running tsx or vite from this project
pkill -f "tsx watch src/index.ts" 2>/dev/null
pkill -f "vite" | grep -v grep 2>/dev/null

echo -e "${GREEN}✓ All servers stopped${NC}"

