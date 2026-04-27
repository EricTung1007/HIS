#!/bin/bash
# Change directory to where the script is located
cd "$(dirname "$0")"

echo "==========================================="
echo "   Starting HIS System (Backend + Frontend)  "
echo "==========================================="

# Check if node_modules exists in root, if not, install dependencies
if [ ! -d "node_modules" ]; then
    echo "First time setup: Installing root dependencies (concurrently)..."
    npm install
fi

# Run the start script
npm start
