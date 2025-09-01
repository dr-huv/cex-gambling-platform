import { getDatabase } from '../utils/database'

export interface GamblingTransaction {
  id?: string
  userId: string
  gameType: 'dice' | 'crash' | 'plinko'
  betAmount: number
  result: any
  won: boolean
  payout: number
  txHash?: string
  createdAt: Date
}

export async function createGambleTransaction(transactionData: Omit<GamblingTransaction, 'id'>) {
  const db = await getDatabase('mongo')
  const collection = db.collection('gambling_transactions')

  const result = await collection.insertOne({
    ...transactionData,
    result: JSON.stringify(transactionData.result)
  })

  return { id: result.insertedId, ...transactionData }
}

export async function getUserGamblingHistory(userId: string, limit: number = 50) {
  const db = await getDatabase('mongo')
  const collection = db.collection('gambling_transactions')

  const transactions = await collection
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()

  return transactions.map(tx => ({
    ...tx,
    id: tx._id,
    result: JSON.parse(tx.result)
  }))
}

export async function getGamblingStats(userId: string) {
  const db = await getDatabase('mongo')
  const collection = db.collection('gambling_transactions')

  const stats = await collection.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        totalBets: { $sum: 1 },
        totalWagered: { $sum: '$betAmount' },
        totalWon: { $sum: '$payout' },
        winRate: { $avg: { $cond: ['$won', 1, 0] } }
      }
    }
  ]).toArray()

  return stats[0] || {
    totalBets: 0,
    totalWagered: 0,
    totalWon: 0,
    winRate: 0
  }
}
