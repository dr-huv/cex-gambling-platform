import { Pool } from 'pg'
import { createClient } from 'redis'
import { MongoClient, Db } from 'mongodb'

let pgPool: Pool | null = null
let redisClient: any = null
let mongoClient: MongoClient | null = null
let mongoDB: Db | null = null

export async function connectDatabases() {
  try {
    // PostgreSQL connection
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    await pgPool.query('SELECT NOW()')
    console.log('✅ PostgreSQL connected')

    // Redis connection
    redisClient = createClient({
      url: process.env.REDIS_URL
    })

    redisClient.on('error', (err: any) => {
      console.error('Redis error:', err)
    })

    await redisClient.connect()
    console.log('✅ Redis connected')

    // MongoDB connection
    mongoClient = new MongoClient(process.env.MONGODB_URL!)
    await mongoClient.connect()
    mongoDB = mongoClient.db('cex_gambling')
    console.log('✅ MongoDB connected')

    // Create indexes and tables
    await createTables()
    await createIndexes()

  } catch (error) {
    console.error('Database connection failed:', error)
    throw error
  }
}

async function createTables() {
  if (!pgPool) return

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      balance JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  const createOrdersTable = `
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      pair VARCHAR(20) NOT NULL,
      type VARCHAR(10) NOT NULL CHECK (type IN ('buy', 'sell')),
      order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('market', 'limit')),
      amount DECIMAL(18,8) NOT NULL,
      price DECIMAL(18,8),
      filled DECIMAL(18,8) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'partial')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  const createTransactionsTable = `
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'trade', 'gambling')),
      token VARCHAR(10) NOT NULL,
      amount DECIMAL(18,8) NOT NULL,
      tx_hash VARCHAR(255),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  await pgPool.query(createUsersTable)
  await pgPool.query(createOrdersTable)
  await pgPool.query(createTransactionsTable)

  console.log('✅ PostgreSQL tables created')
}

async function createIndexes() {
  if (!pgPool) return

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_pair ON orders(pair)',
    'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)'
  ]

  for (const index of indexes) {
    await pgPool.query(index)
  }

  console.log('✅ PostgreSQL indexes created')
}

export async function getDatabase(type: 'postgres' | 'redis' | 'mongo') {
  switch (type) {
    case 'postgres':
      if (!pgPool) throw new Error('PostgreSQL not connected')
      return pgPool
    case 'redis':
      if (!redisClient) throw new Error('Redis not connected')
      return redisClient
    case 'mongo':
      if (!mongoDB) throw new Error('MongoDB not connected')
      return mongoDB
    default:
      throw new Error('Invalid database type')
  }
}

export async function closeDatabases() {
  if (pgPool) {
    await pgPool.end()
    console.log('PostgreSQL connection closed')
  }

  if (redisClient) {
    await redisClient.quit()
    console.log('Redis connection closed')
  }

  if (mongoClient) {
    await mongoClient.close()
    console.log('MongoDB connection closed')
  }
}
