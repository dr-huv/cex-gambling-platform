#!/bin/bash

# CEX Gambling Platform Development Script

set -e

echo "🔧 Starting CEX Platform in development mode..."

# Install dependencies
echo "📦 Installing dependencies..."

# Frontend
if [ -d "frontend" ]; then
    cd frontend
    npm install
    cd ..
fi

# Backend  
if [ -d "backend" ]; then
    cd backend
    npm install
    cd ..
fi

# Order Engine
if [ -d "order-engine" ]; then
    cd order-engine
    cargo check
    cd ..
fi

# Start development services
echo "🗄️  Starting development databases..."
docker-compose up -d postgres redis mongodb

echo "⏳ Waiting for databases..."
sleep 10

echo "🚀 Starting development servers..."

# Start backend in development mode
echo "Starting backend..."
cd backend && npm run dev &
BACKEND_PID=$!

# Start order engine
echo "Starting order engine..."
cd order-engine && cargo run &
ENGINE_PID=$!

# Start frontend
echo "Starting frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 Development servers started!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:3001" 
echo "📊 Order Engine: localhost:9090"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for interrupt
trap 'kill $BACKEND_PID $ENGINE_PID $FRONTEND_PID 2>/dev/null; exit' INT
wait
