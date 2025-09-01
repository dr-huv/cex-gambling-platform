import WebSocket from 'ws'
import { Order } from '../models/Order'

interface OrderEngineMessage {
  type: 'new_order' | 'cancel_order' | 'order_update'
  data: any
}

let engineSocket: WebSocket | null = null

export async function connectToOrderEngine(): Promise<void> {
  const engineUrl = `ws://${process.env.ENGINE_HOST || '127.0.0.1'}:${process.env.ENGINE_PORT || '9090'}`

  engineSocket = new WebSocket(engineUrl)

  return new Promise((resolve, reject) => {
    if (!engineSocket) {
      reject(new Error('Failed to create WebSocket connection'))
      return
    }

    engineSocket.on('open', () => {
      console.log('✅ Connected to Rust order matching engine')
      resolve()
    })

    engineSocket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        handleEngineMessage(message)
      } catch (error) {
        console.error('Failed to parse engine message:', error)
      }
    })

    engineSocket.on('error', (error) => {
      console.error('Order engine connection error:', error)
      reject(error)
    })

    engineSocket.on('close', () => {
      console.log('Order engine connection closed')
      // Attempt to reconnect after 5 seconds
      setTimeout(connectToOrderEngine, 5000)
    })
  })
}

export async function sendToOrderEngine(order: Order): Promise<void> {
  if (!engineSocket || engineSocket.readyState !== WebSocket.OPEN) {
    throw new Error('Order engine not connected')
  }

  const message: OrderEngineMessage = {
    type: 'new_order',
    data: {
      id: order.id,
      userId: order.userId,
      pair: order.pair,
      type: order.type,
      orderType: order.orderType,
      amount: order.amount,
      price: order.price,
      timestamp: order.createdAt.getTime()
    }
  }

  engineSocket.send(JSON.stringify(message))
}

export async function cancelOrderInEngine(orderId: string): Promise<void> {
  if (!engineSocket || engineSocket.readyState !== WebSocket.OPEN) {
    throw new Error('Order engine not connected')
  }

  const message: OrderEngineMessage = {
    type: 'cancel_order',
    data: { orderId }
  }

  engineSocket.send(JSON.stringify(message))
}

function handleEngineMessage(message: any) {
  switch (message.type) {
    case 'order_filled':
      handleOrderFilled(message.data)
      break
    case 'order_partial':
      handleOrderPartial(message.data)
      break
    case 'order_cancelled':
      handleOrderCancelled(message.data)
      break
    default:
      console.log('Unknown engine message type:', message.type)
  }
}

async function handleOrderFilled(data: any) {
  // Update order status in database
  const { orderId, filledAmount, executedPrice } = data

  try {
    // Update order in database
    // Update user balances
    // Emit WebSocket event to user
    console.log(`Order ${orderId} filled: ${filledAmount} at ${executedPrice}`)
  } catch (error) {
    console.error('Error handling order fill:', error)
  }
}

async function handleOrderPartial(data: any) {
  const { orderId, partialFill, remainingAmount } = data

  try {
    // Update order status to partial
    // Update user balances for filled portion
    console.log(`Order ${orderId} partially filled: ${partialFill}, remaining: ${remainingAmount}`)
  } catch (error) {
    console.error('Error handling partial fill:', error)
  }
}

async function handleOrderCancelled(data: any) {
  const { orderId, reason } = data

  try {
    // Update order status to cancelled
    // Release reserved balances
    console.log(`Order ${orderId} cancelled: ${reason}`)
  } catch (error) {
    console.error('Error handling order cancellation:', error)
  }
}

// Initialize connection when the module is loaded
// connectToOrderEngine().catch(console.error)
