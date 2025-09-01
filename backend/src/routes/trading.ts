import express from 'express'
import { body, validationResult } from 'express-validator'
import { createOrder, getOrderBook, getUserOrders } from '../models/Order'
import { updateUserBalance } from '../models/User'
import { sendToOrderEngine } from '../utils/orderEngine'

const router = express.Router()

// Get order book
router.get('/orderbook/:pair', async (req, res) => {
  try {
    const { pair } = req.params
    const orderBook = await getOrderBook(pair)
    res.json(orderBook)
  } catch (error) {
    console.error('Get order book error:', error)
    res.status(500).json({ message: 'Failed to get order book' })
  }
})

// Place order
router.post('/order', [
  body('pair').notEmpty().withMessage('Trading pair is required'),
  body('type').isIn(['buy', 'sell']).withMessage('Type must be buy or sell'),
  body('orderType').isIn(['market', 'limit']).withMessage('Order type must be market or limit'),
  body('amount').isFloat({ min: 0.00001 }).withMessage('Amount must be greater than 0'),
  body('price').optional().isFloat({ min: 0.01 }).withMessage('Price must be greater than 0'),
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() })
    }

    const { pair, type, orderType, amount, price } = req.body
    const userId = (req as any).userId

    // Create order
    const order = await createOrder({
      userId,
      pair,
      type,
      orderType,
      amount: parseFloat(amount),
      price: price ? parseFloat(price) : null,
      status: 'pending',
      createdAt: new Date()
    })

    // Send to order matching engine
    await sendToOrderEngine(order)

    res.status(201).json({
      message: 'Order placed successfully',
      order
    })
  } catch (error) {
    console.error('Place order error:', error)
    res.status(500).json({ message: 'Failed to place order' })
  }
})

// Get user orders
router.get('/orders', async (req, res) => {
  try {
    const userId = (req as any).userId
    const orders = await getUserOrders(userId)
    res.json(orders)
  } catch (error) {
    console.error('Get user orders error:', error)
    res.status(500).json({ message: 'Failed to get orders' })
  }
})

// Cancel order
router.delete('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params
    const userId = (req as any).userId

    // TODO: Implement order cancellation
    res.json({ message: 'Order cancelled successfully' })
  } catch (error) {
    console.error('Cancel order error:', error)
    res.status(500).json({ message: 'Failed to cancel order' })
  }
})

// Get market data
router.get('/markets', async (req, res) => {
  try {
    // Mock market data - in production, this would come from real price feeds
    const markets = [
      { symbol: 'BTC/USDT', price: 65000, change24h: 2.5, volume: 1200000000 },
      { symbol: 'ETH/USDT', price: 3200, change24h: -1.8, volume: 800000000 },
      { symbol: 'SOL/USDT', price: 145, change24h: 5.2, volume: 300000000 },
      { symbol: 'ADA/USDT', price: 0.58, change24h: 1.9, volume: 150000000 },
    ]
    res.json(markets)
  } catch (error) {
    console.error('Get markets error:', error)
    res.status(500).json({ message: 'Failed to get market data' })
  }
})

export default router
