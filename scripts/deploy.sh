#!/bin/bash

# CEX Gambling Platform Deployment Script

set -e

echo "🚀 Starting CEX Gambling Platform deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Environment setup
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before continuing."
    echo "   Press Enter when ready..."
    read
fi

# Build and start services
echo "🏗️  Building Docker images..."
docker-compose build

echo "🗄️  Starting database services..."
docker-compose up -d postgres redis mongodb

echo "⏳ Waiting for databases to be ready..."
sleep 10

echo "🔧 Running database migrations..."
docker-compose exec postgres psql -U cex_user -d cex_gambling -f /docker-entrypoint-initdb.d/init.sql

echo "🚀 Starting application services..."
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 15

# Health checks
echo "🔍 Performing health checks..."

# Check backend
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend health check failed"
fi

echo "🎉 Deployment complete!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:3001"
echo "📊 Order Engine: localhost:9090"
echo ""
echo "📋 To view logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down"
echo "🔄 To restart: docker-compose restart"

# Show running containers
echo ""
echo "🐳 Running containers:"
docker-compose ps
