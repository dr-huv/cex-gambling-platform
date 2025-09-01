import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'

import { connectDatabases } from './utils/database'
import { setupWebSocket } from './utils/websocket'
import { errorHandler } from './middleware/errorHandler'
import { authMiddleware } from './middleware/auth'

// Routes
import authRoutes from './routes/auth'
import tradingRoutes from './routes/trading'
import gamblingRoutes from './routes/gambling'
import walletRoutes from './routes/wallet'

dotenv.config()

const app = express()
const server = createServer(app)
const io = new SocketServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

const PORT = process.env.PORT || 3001

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}))
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(limiter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/trading', authMiddleware, tradingRoutes)
app.use('/api/gambling', authMiddleware, gamblingRoutes)
app.use('/api/wallet', authMiddleware, walletRoutes)

// Error handling
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

async function startServer() {
  try {
    // Connect to databases
    await connectDatabases()

    // Setup WebSocket handlers
    setupWebSocket(io)

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`📡 WebSocket server ready`)
      console.log(`🔗 Health check: http://localhost:${PORT}/health`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

startServer()

export { app, io }
