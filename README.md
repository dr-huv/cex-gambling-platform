# CEX Gambling Platform

A high-performance centralized cryptocurrency exchange with integrated gambling features.

## Architecture Overview

This platform combines:
- **Frontend**: React/Next.js with WebSocket real-time updates
- **Backend**: Node.js API with Rust order matching engine
- **Blockchain**: Ethereum (DEX/Staking) + Solana (Gambling)
- **Database**: PostgreSQL + Redis + MongoDB

## Quick Start

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Docker & Docker Compose
- PostgreSQL, Redis, MongoDB

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd cex-gambling-platform

# Install dependencies
npm run install-all

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start services
docker-compose up -d

# Run development servers
npm run dev
```

## Architecture Components

### 1. Frontend (React/Next.js)
- Real-time trading interface
- WebSocket integration for live updates
- Responsive design for mobile/desktop
- State management with Context API + Recoil

### 2. Backend (Node.js)
- RESTful API endpoints
- WebSocket server for real-time data
- Authentication & authorization
- Integration with order matching engine

### 3. Order Matching Engine (Rust)
- High-performance order processing (8M+ orders/sec)
- Price-time priority matching
- Support for multiple order types
- Lock-free data structures

### 4. Smart Contracts
- **Ethereum**: ERC-20 swaps, DEX, staking
- **Solana**: High-speed gambling transactions

### 5. Database Layer
- **PostgreSQL**: User data, transactions
- **Redis**: Caching, real-time data
- **MongoDB**: Logs, analytics

## Development

```bash
# Frontend development
cd frontend && npm run dev

# Backend development
cd backend && npm run dev

# Order engine development
cd order-engine && cargo run

# Smart contract development
cd smart-contracts/ethereum && npx hardhat compile
cd smart-contracts/solana && anchor build
```

## Security Features

- Multi-factor authentication
- Cold/hot wallet management
- DDoS protection
- AML/KYC compliance
- Real-time fraud detection

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## Support

For support, email: support@cex-gambling-platform.com
