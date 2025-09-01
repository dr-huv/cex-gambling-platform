import { useEffect, useState } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

interface OrderBookEntry {
  price: number
  size: number
  total: number
}

interface OrderBookProps {
  pair: string
}

export default function OrderBook({ pair }: OrderBookProps) {
  const { orderBook } = useWebSocket()
  const [asks, setAsks] = useState<OrderBookEntry[]>([])
  const [bids, setBids] = useState<OrderBookEntry[]>([])

  useEffect(() => {
    // Generate mock order book data
    const generateOrders = (basePrice: number, isBuy: boolean): OrderBookEntry[] => {
      const orders: OrderBookEntry[] = []
      let total = 0

      for (let i = 0; i < 10; i++) {
        const priceOffset = (Math.random() * 100) * (isBuy ? -1 : 1)
        const price = basePrice + priceOffset
        const size = Math.random() * 5
        total += size

        orders.push({
          price: Math.abs(price),
          size,
          total
        })
      }

      return orders.sort((a, b) => isBuy ? b.price - a.price : a.price - b.price)
    }

    const basePrice = 50000 + Math.random() * 10000
    setAsks(generateOrders(basePrice, false))
    setBids(generateOrders(basePrice, true))
  }, [pair])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="grid grid-cols-3 text-xs text-gray-400 font-medium">
        <span>Price (USD)</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (Sell Orders) */}
      <div className="space-y-1">
        {asks.slice(0, 10).map((order, index) => (
          <div key={index} className="grid grid-cols-3 text-xs font-mono hover:bg-dark-200 px-2 py-1 rounded">
            <span className="text-red-400">${order.price.toFixed(2)}</span>
            <span className="text-right text-gray-300">{order.size.toFixed(4)}</span>
            <span className="text-right text-gray-400">{order.total.toFixed(4)}</span>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div className="border-t border-b border-dark-200 py-2 text-center">
        <div className="text-sm font-medium">
          Spread: $
          {asks.length && bids.length 
            ? Math.abs(asks[asks.length - 1]?.price - bids[0]?.price).toFixed(2)
            : '0.00'
          }
        </div>
      </div>

      {/* Bids (Buy Orders) */}
      <div className="space-y-1">
        {bids.slice(0, 10).map((order, index) => (
          <div key={index} className="grid grid-cols-3 text-xs font-mono hover:bg-dark-200 px-2 py-1 rounded">
            <span className="text-green-400">${order.price.toFixed(2)}</span>
            <span className="text-right text-gray-300">{order.size.toFixed(4)}</span>
            <span className="text-right text-gray-400">{order.total.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
