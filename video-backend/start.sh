#!/bin/bash

# YouTube Video Backend Startup Script
# This script starts the video backend service

set -e

# Configuration
SERVICE_NAME="yt-video-backend"
NODE_ENV="${NODE_ENV:-production}"
PORT="${PORT:-3003}"
PID_FILE="./video-backend.pid"
LOG_FILE="./video-backend.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 16+ and try again."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    print_status "Node.js version: $NODE_VERSION"
}

# Check if yt-dlp is installed
check_ytdlp() {
    if ! command -v yt-dlp &> /dev/null; then
        print_error "yt-dlp is not installed. Please install yt-dlp and try again."
        print_error "Installation: pip install yt-dlp"
        exit 1
    fi
    
    YTDLP_VERSION=$(yt-dlp --version)
    print_status "yt-dlp version: $YTDLP_VERSION"
}

# Check if service is already running
check_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Start the service
start_service() {
    print_status "Starting $SERVICE_NAME..."
    
    # Check dependencies
    check_nodejs
    check_ytdlp
    
    # Check if already running
    if check_running; then
        print_warning "Service is already running (PID: $(cat $PID_FILE))"
        return 0
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
    fi
    
    # Create downloads directory
    mkdir -p downloads
    
    # Start the service
    print_status "Starting server on port $PORT..."
    NODE_ENV=$NODE_ENV PORT=$PORT nohup node server.js > "$LOG_FILE" 2>&1 &
    
    # Save PID
    echo $! > "$PID_FILE"
    
    # Wait a moment and check if it started successfully
    sleep 2
    
    if check_running; then
        print_status "Service started successfully (PID: $(cat $PID_FILE))"
        print_status "Log file: $LOG_FILE"
        print_status "Health check: http://localhost:$PORT/health"
    else
        print_error "Failed to start service. Check log file: $LOG_FILE"
        exit 1
    fi
}

# Stop the service
stop_service() {
    print_status "Stopping $SERVICE_NAME..."
    
    if check_running; then
        PID=$(cat "$PID_FILE")
        kill "$PID"
        rm -f "$PID_FILE"
        print_status "Service stopped (PID: $PID)"
    else
        print_warning "Service is not running"
    fi
}

# Restart the service
restart_service() {
    stop_service
    sleep 2
    start_service
}

# Check service status
check_status() {
    if check_running; then
        PID=$(cat "$PID_FILE")
        print_status "Service is running (PID: $PID)"
        
        # Try to reach health endpoint
        if command -v curl &> /dev/null; then
            if curl -s "http://localhost:$PORT/health" > /dev/null; then
                print_status "Health check: OK"
            else
                print_warning "Health check: FAILED"
            fi
        fi
    else
        print_warning "Service is not running"
    fi
}

# Show service logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        print_error "Log file not found: $LOG_FILE"
        exit 1
    fi
}

# Main script logic
case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        check_status
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the video backend service"
        echo "  stop    - Stop the video backend service"
        echo "  restart - Restart the video backend service"
        echo "  status  - Check service status"
        echo "  logs    - Show service logs (tail -f)"
        echo ""
        echo "Environment variables:"
        echo "  PORT     - Server port (default: 3003)"
        echo "  NODE_ENV - Environment (default: production)"
        exit 1
        ;;
esac