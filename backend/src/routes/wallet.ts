import express from 'express'
import { body, validationResult } from 'express-validator'
import { getUserById, updateUserBalance } from '../models/User'
import { processEthereumDeposit, processEthereumWithdrawal } from '../utils/ethereum'
import { processSolanaDeposit, processSolanaWithdrawal } from '../utils/solana'

const router = express.Router()

// Get wallet balances
router.get('/balance', async (req, res) => {
  try {
    const userId = (req as any).userId
    const user = await getUserById(userId)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ balance: user.balance })
  } catch (error) {
    console.error('Get balance error:', error)
    res.status(500).json({ message: 'Failed to get balance' })
  }
})

// Deposit
router.post('/deposit', [
  body('token').isIn(['USDT', 'BTC', 'ETH', 'SOL']).withMessage('Invalid token'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('network').isIn(['ethereum', 'solana']).withMessage('Invalid network'),
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() })
    }

    const { token, amount, network } = req.body
    const userId = (req as any).userId

    let txHash: string

    if (network === 'ethereum') {
      txHash = await processEthereumDeposit(userId, token, amount)
    } else {
      txHash = await processSolanaDeposit(userId, token, amount)
    }

    // Update user balance
    const user = await getUserById(userId)
    if (user) {
      const newBalance = (user.balance[token] || 0) + parseFloat(amount)
      await updateUserBalance(userId, token, newBalance)
    }

    res.json({
      message: 'Deposit processed successfully',
      txHash,
      newBalance: user?.balance[token] || 0
    })
  } catch (error) {
    console.error('Deposit error:', error)
    res.status(500).json({ message: 'Deposit failed' })
  }
})

// Withdraw
router.post('/withdraw', [
  body('token').isIn(['USDT', 'BTC', 'ETH', 'SOL']).withMessage('Invalid token'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('address').notEmpty().withMessage('Withdrawal address is required'),
  body('network').isIn(['ethereum', 'solana']).withMessage('Invalid network'),
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() })
    }

    const { token, amount, address, network } = req.body
    const userId = (req as any).userId

    // Check balance
    const user = await getUserById(userId)
    if (!user || (user.balance[token] || 0) < amount) {
      return res.status(400).json({ message: 'Insufficient balance' })
    }

    let txHash: string

    if (network === 'ethereum') {
      txHash = await processEthereumWithdrawal(userId, token, amount, address)
    } else {
      txHash = await processSolanaWithdrawal(userId, token, amount, address)
    }

    // Update user balance
    const newBalance = user.balance[token] - parseFloat(amount)
    await updateUserBalance(userId, token, newBalance)

    res.json({
      message: 'Withdrawal processed successfully',
      txHash,
      newBalance
    })
  } catch (error) {
    console.error('Withdrawal error:', error)
    res.status(500).json({ message: 'Withdrawal failed' })
  }
})

// Get transaction history
router.get('/transactions', async (req, res) => {
  try {
    const userId = (req as any).userId

    // TODO: Implement transaction history retrieval
    // This would query the database for user's deposit/withdrawal history

    res.json([])
  } catch (error) {
    console.error('Get transactions error:', error)
    res.status(500).json({ message: 'Failed to get transaction history' })
  }
})

export default router
