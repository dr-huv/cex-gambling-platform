import express from 'express'
import { body, validationResult } from 'express-validator'
import { createGambleTransaction, getUserGamblingHistory } from '../models/Gambling'
import { updateUserBalance, getUserById } from '../models/User'
import { processSolanaGambling } from '../utils/solana'

const router = express.Router()

// Play dice game
router.post('/dice', [
  body('betAmount').isFloat({ min: 0.01 }).withMessage('Bet amount must be at least 0.01'),
  body('prediction').isInt({ min: 1, max: 100 }).withMessage('Prediction must be between 1 and 100'),
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() })
    }

    const { betAmount, prediction } = req.body
    const userId = (req as any).userId

    // Get user balance
    const user = await getUserById(userId)
    if (!user || user.balance.USDT < betAmount) {
      return res.status(400).json({ message: 'Insufficient balance' })
    }

    // Generate random number (1-100)
    const result = Math.floor(Math.random() * 100) + 1
    const won = result > prediction

    // Calculate payout
    let payout = 0
    if (won) {
      const multiplier = 99 / (100 - prediction) // House edge: 1%
      payout = betAmount * multiplier
    }

    // Process on Solana blockchain
    const txHash = await processSolanaGambling({
      userId,
      gameType: 'dice',
      betAmount,
      result: won,
      payout
    })

    // Update user balance
    const newBalance = user.balance.USDT - betAmount + payout
    await updateUserBalance(userId, 'USDT', newBalance)

    // Record transaction
    await createGambleTransaction({
      userId,
      gameType: 'dice',
      betAmount,
      prediction,
      result,
      won,
      payout,
      txHash,
      createdAt: new Date()
    })

    res.json({
      result,
      won,
      payout: payout.toFixed(2),
      newBalance: newBalance.toFixed(2),
      txHash
    })
  } catch (error) {
    console.error('Dice game error:', error)
    res.status(500).json({ message: 'Game failed. Please try again.' })
  }
})

// Play crash game
router.post('/crash', [
  body('betAmount').isFloat({ min: 0.01 }).withMessage('Bet amount must be at least 0.01'),
  body('cashOutAt').optional().isFloat({ min: 1.01 }).withMessage('Cash out multiplier must be at least 1.01'),
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() })
    }

    const { betAmount, cashOutAt } = req.body
    const userId = (req as any).userId

    // Get user balance
    const user = await getUserById(userId)
    if (!user || user.balance.USDT < betAmount) {
      return res.status(400).json({ message: 'Insufficient balance' })
    }

    // Generate crash point (house edge: 1%)
    const crashPoint = Math.random() * 10 + 1 // Random between 1-11x
    const won = !cashOutAt || cashOutAt <= crashPoint

    let payout = 0
    if (won && cashOutAt) {
      payout = betAmount * cashOutAt * 0.99 // 1% house edge
    }

    // Process on Solana
    const txHash = await processSolanaGambling({
      userId,
      gameType: 'crash',
      betAmount,
      result: won,
      payout
    })

    // Update balance
    const newBalance = user.balance.USDT - betAmount + payout
    await updateUserBalance(userId, 'USDT', newBalance)

    // Record transaction
    await createGambleTransaction({
      userId,
      gameType: 'crash',
      betAmount,
      crashPoint,
      cashOutAt,
      won,
      payout,
      txHash,
      createdAt: new Date()
    })

    res.json({
      crashPoint: crashPoint.toFixed(2),
      won,
      payout: payout.toFixed(2),
      newBalance: newBalance.toFixed(2),
      txHash
    })
  } catch (error) {
    console.error('Crash game error:', error)
    res.status(500).json({ message: 'Game failed. Please try again.' })
  }
})

// Get gambling history
router.get('/history', async (req, res) => {
  try {
    const userId = (req as any).userId
    const history = await getUserGamblingHistory(userId)
    res.json(history)
  } catch (error) {
    console.error('Get gambling history error:', error)
    res.status(500).json({ message: 'Failed to get gambling history' })
  }
})

export default router
