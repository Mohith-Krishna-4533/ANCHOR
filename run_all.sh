#!/bin/bash
# run_all.sh - Automatically starts the Anchor Stack

echo "Starting Anchor Application Stack..."

# Find and kill any existing instances to avoid "Address already in use" errors
echo "Cleaning up old processes..."
kill -9 $(lsof -t -i:8545) 2>/dev/null || true # Hardhat
kill -9 $(lsof -t -i:5001) 2>/dev/null || true # Flask Backend
kill -9 $(lsof -t -i:5173) 2>/dev/null || true # Vite Frontend

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "1. Starting Hardhat Local Blockchain Node..."
cd "$DIR/blockchain" && npx hardhat node > /tmp/hardhat.log 2>&1 &
HARDHAT_PID=$!
sleep 2 # wait for blockchain spinup

echo "2. Starting Python Backend Server..."
cd "$DIR/backend" && nohup python3 app.py > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

echo "3. Starting React Frontend..."
cd "$DIR/frontend" && nohup npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

echo "=========================================="
echo "Anchor Stack is running!"
echo "- Hardhat on :8545 (PID $HARDHAT_PID)"
echo "- Backend on :5001 (PID $BACKEND_PID)"
echo "- Frontend on :5173 (PID $FRONTEND_PID)"
echo "=========================================="
echo "Logs are being written to /tmp/hardhat.log, /tmp/backend.log, and /tmp/frontend.log"
echo "Press Ctrl+C to shut down all processes."

# Wait for user interrupt
trap "echo 'Shutting down...'; kill $HARDHAT_PID $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait
