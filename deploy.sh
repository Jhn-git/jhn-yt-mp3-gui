#!/bin/bash

# YouTube MP3 GUI Deployment Script
# Usage: ./deploy.sh [start|stop|status|restart]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/webapp.pid"
LOG_FILE="$SCRIPT_DIR/webapp.log"

start_server() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "Server is already running (PID: $PID)"
            return 1
        else
            echo "Removing stale PID file"
            rm -f "$PID_FILE"
        fi
    fi
    
    echo "Starting YouTube MP3 GUI web server..."
    cd "$SCRIPT_DIR"
    
    # Start the server in background and capture PID
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    
    # Wait a moment and check if it started successfully
    sleep 2
    if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "Server started successfully (PID: $(cat "$PID_FILE"))"
        echo "Access the app at: http://localhost:3000"
        echo "Logs: $LOG_FILE"
        return 0
    else
        echo "Failed to start server"
        rm -f "$PID_FILE"
        return 1
    fi
}

stop_server() {
    if [ ! -f "$PID_FILE" ]; then
        echo "Server is not running (no PID file found)"
        return 0
    fi
    
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Stopping server (PID: $PID)..."
        kill "$PID"
        
        # Wait for graceful shutdown
        for i in {1..10}; do
            if ! kill -0 "$PID" 2>/dev/null; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if kill -0 "$PID" 2>/dev/null; then
            echo "Force killing server..."
            kill -9 "$PID"
        fi
        
        rm -f "$PID_FILE"
        echo "Server stopped"
    else
        echo "Server is not running"
        rm -f "$PID_FILE"
    fi
}

status_server() {
    if [ ! -f "$PID_FILE" ]; then
        echo "Server is not running"
        return 1
    fi
    
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Server is running (PID: $PID)"
        echo "URL: http://localhost:3000"
        echo "Log file: $LOG_FILE"
        return 0
    else
        echo "Server is not running (stale PID file)"
        rm -f "$PID_FILE"
        return 1
    fi
}

restart_server() {
    echo "Restarting server..."
    stop_server
    sleep 2
    start_server
}

case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    status)
        status_server
        ;;
    restart)
        restart_server
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the web server in daemon mode"
        echo "  stop    - Stop the web server"
        echo "  status  - Check if the server is running"
        echo "  restart - Restart the web server"
        echo ""
        echo "The server will be available at: http://localhost:3000"
        exit 1
        ;;
esac