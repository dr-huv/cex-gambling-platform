import { Server as SocketServer } from 'socket.io'
import jwt from 'jsonwebtoken'
import { getDatabase } from './database'

interface AuthenticatedSocket extends Socket {
  userId?: string
}

export function setupWebSocket(io: SocketServer) {
  // Authentication middleware for WebSocket
  io.use((socket: any, next) => {
    try {
      const token = socket.handshake.auth.token
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
        socket.userId = decoded.userId
      }
      next()
    } catch (error) {
      // Allow connection without authentication for public data
      next()
    }
  })

  io.on('connection', (socket: any) => {
    console.log(`Client connected: ${socket.id}`, socket.userId ? `(User: ${socket.userId})` : '(Anonymous)')

    // Join user-specific room if authenticated
    if (socket.userId) {
      socket.join(`user:${socket.userId}`)

      // Send user-specific data
      sendUserData(socket)
    }

    // Subscribe to market data
    socket.on('subscribe_market', (pairs: string[]) => {
      pairs.forEach(pair => {
        socket.join(`market:${pair}`)
      })
      console.log(`Client ${socket.id} subscribed to markets:`, pairs)
    })

    // Subscribe to order book updates
    socket.on('subscribe_orderbook', (pair: string) => {
      socket.join(`orderbook:${pair}`)
      console.log(`Client ${socket.id} subscribed to orderbook: ${pair}`)
    })

    // Handle gambling events
    socket.on('join_game', (gameType: string) => {
      socket.join(`game:${gameType}`)
      console.log(`Client ${socket.id} joined game: ${gameType}`)
    })

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`)
    })
  })

  // Start broadcasting market data
  startMarketDataBroadcast(io)

  console.log('✅ WebSocket server configured')
}

async function sendUserData(socket: any) {
  try {
    // Send user-specific updates like balance, orders, etc.
    // This would be implemented based on your needs
    socket.emit('user_connected', { message: 'Welcome back!' })
  } catch (error) {
    console.error('Error sending user data:', error)
  }
}

function startMarketDataBroadcast(io: SocketServer) {
  // Simulate market data updates
  setInterval(() => {
    const marketData = [
      {
        symbol: 'BTC/USDT',
        price: 65000 + (Math.random() - 0.5) * 1000,
        change24h: (Math.random() - 0.5) * 10,
        volume: 1200000000 + Math.random() * 100000000
      },
      {
        symbol: 'ETH/USDT',
        price: 3200 + (Math.random() - 0.5) * 200,
        change24h: (Math.random() - 0.5) * 8,
        volume: 800000000 + Math.random() * 50000000
      },
      {
        symbol: 'SOL/USDT',
        price: 145 + (Math.random() - 0.5) * 20,
        change24h: (Math.random() - 0.5) * 15,
        volume: 300000000 + Math.random() * 30000000
      }
    ]

    // Broadcast to all connected clients
    io.emit('market_data', marketData)

    // Broadcast individual pair updates
    marketData.forEach(market => {
      io.to(`market:${market.symbol}`).emit('price_update', {
        symbol: market.symbol,
        price: market.price,
        change: market.change24h
      })
    })
  }, 1000) // Update every second

  // Simulate order book updates
  setInterval(() => {
    const pairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT']

    pairs.forEach(pair => {
      const orderBookUpdate = generateMockOrderBook()
      io.to(`orderbook:${pair}`).emit('orderbook_update', {
        pair,
        ...orderBookUpdate
      })
    })
  }, 500) // Update every 500ms
}

function generateMockOrderBook() {
  const basePrice = 50000 + Math.random() * 20000
  const bids = []
  const asks = []

  // Generate 10 bid levels
  for (let i = 0; i < 10; i++) {
    bids.push([
      basePrice - (i * 10) - Math.random() * 10,
      Math.random() * 5
    ])
  }

  // Generate 10 ask levels
  for (let i = 0; i < 10; i++) {
    asks.push([
      basePrice + (i * 10) + Math.random() * 10,
      Math.random() * 5
    ])
  }

  return { bids, asks }
}

export function broadcastToUser(io: SocketServer, userId: string, event: string, data: any) {
  io.to(`user:${userId}`).emit(event, data)
}

export function broadcastGameResult(io: SocketServer, gameType: string, result: any) {
  io.to(`game:${gameType}`).emit('game_result', result)
}
