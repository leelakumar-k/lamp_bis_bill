#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=== Building and Starting Restaurant POS API Microservice ==="
docker compose up -d --build

echo "Waiting for API to be ready..."
sleep 3

curl -s http://localhost:8005/health || echo "Starting up..."
echo ""
echo "API is running at http://localhost:8005"
echo "Interactive Swagger docs: http://localhost:8005/docs"
