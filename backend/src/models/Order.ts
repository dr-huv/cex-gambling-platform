import { getDatabase } from '../utils/database'

export interface Order {
  id?: string
  userId: string
  pair: string
  type: 'buy' | 'sell'
  orderType: 'market' | 'limit'
  amount: number
  price: number | null
  filled?: number
  status: 'pending' | 'filled' | 'cancelled' | 'partial'
  createdAt: Date
  updatedAt?: Date
}

export async function createOrder(orderData: Omit<Order, 'id' | 'filled' | 'updatedAt'>) {
  const db = await getDatabase('postgres')

  const query = `
    INSERT INTO orders (user_id, pair, type, order_type, amount, price, filled, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `

  const values = [
    orderData.userId,
    orderData.pair,
    orderData.type,
    orderData.orderType,
    orderData.amount,
    orderData.price,
    0, // filled
    orderData.status,
    orderData.createdAt,
    new Date()
  ]

  const result = await db.query(query, values)
  return result.rows[0]
}

export async function getOrderBook(pair: string) {
  const db = await getDatabase('postgres')

  // Get buy orders (bids) - highest price first
  const bidsQuery = `
    SELECT price, SUM(amount - filled) as size
    FROM orders 
    WHERE pair = $1 AND type = 'buy' AND status IN ('pending', 'partial')
    GROUP BY price
    ORDER BY price DESC
    LIMIT 20
  `

  // Get sell orders (asks) - lowest price first
  const asksQuery = `
    SELECT price, SUM(amount - filled) as size
    FROM orders 
    WHERE pair = $1 AND type = 'sell' AND status IN ('pending', 'partial')
    GROUP BY price
    ORDER BY price ASC
    LIMIT 20
  `

  const [bidsResult, asksResult] = await Promise.all([
    db.query(bidsQuery, [pair]),
    db.query(asksQuery, [pair])
  ])

  return {
    bids: bidsResult.rows.map(row => [parseFloat(row.price), parseFloat(row.size)]),
    asks: asksResult.rows.map(row => [parseFloat(row.price), parseFloat(row.size)])
  }
}

export async function getUserOrders(userId: string) {
  const db = await getDatabase('postgres')

  const query = `
    SELECT * FROM orders 
    WHERE user_id = $1 
    ORDER BY created_at DESC 
    LIMIT 100
  `

  const result = await db.query(query, [userId])
  return result.rows
}

export async function updateOrderStatus(orderId: string, status: string, filled?: number) {
  const db = await getDatabase('postgres')

  let query = 'UPDATE orders SET status = $1, updated_at = $2'
  let values = [status, new Date()]

  if (filled !== undefined) {
    query += ', filled = $3'
    values.push(filled)
  }

  query += ' WHERE id = $' + (values.length + 1)
  values.push(orderId)

  await db.query(query, values)
}
