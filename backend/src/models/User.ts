import { Pool } from 'pg'
import { getDatabase } from '../utils/database'

export interface User {
  id: string
  username: string
  email: string
  password: string
  verified: boolean
  balance: { [token: string]: number }
  createdAt: Date
  updatedAt: Date
}

export async function createUser(userData: Omit<User, 'updatedAt'>) {
  const db = await getDatabase('postgres')

  const query = `
    INSERT INTO users (id, username, email, password, verified, balance, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `

  const values = [
    userData.id,
    userData.username,
    userData.email,
    userData.password,
    userData.verified,
    JSON.stringify(userData.balance),
    userData.createdAt,
    new Date()
  ]

  const result = await db.query(query, values)
  return {
    ...result.rows[0],
    balance: JSON.parse(result.rows[0].balance)
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getDatabase('postgres')

  const query = 'SELECT * FROM users WHERE email = $1'
  const result = await db.query(query, [email])

  if (result.rows.length === 0) {
    return null
  }

  return {
    ...result.rows[0],
    balance: JSON.parse(result.rows[0].balance)
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await getDatabase('postgres')

  const query = 'SELECT * FROM users WHERE id = $1'
  const result = await db.query(query, [id])

  if (result.rows.length === 0) {
    return null
  }

  return {
    ...result.rows[0],
    balance: JSON.parse(result.rows[0].balance)
  }
}

export async function updateUserBalance(userId: string, token: string, amount: number) {
  const user = await getUserById(userId)
  if (!user) throw new Error('User not found')

  user.balance[token] = amount

  const db = await getDatabase('postgres')
  const query = 'UPDATE users SET balance = $1, updated_at = $2 WHERE id = $3'

  await db.query(query, [JSON.stringify(user.balance), new Date(), userId])
}
