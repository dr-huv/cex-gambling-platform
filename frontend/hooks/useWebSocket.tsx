import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

interface MarketData {
  symbol: string
  price: number
  change24h: number
  volume: number
}

interface OrderBookData {
  bids: Array<[number, number]>
  asks: Array<[number, number]>
}

interface UseWebSocketReturn {
  socket: Socket | null
  isConnected: boolean
  marketData: MarketData[]
  orderBook: OrderBookData | null
  gameResult: any | null
}

export function useWebSocket(): UseWebSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null)
  const [gameResult, setGameResult] = useState<any | null>(null)

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
    const newSocket = io(wsUrl, {
      transports: ['websocket'],
      upgrade: false
    })

    newSocket.on('connect', () => {
      setIsConnected(true)
      console.log('WebSocket connected')
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
      console.log('WebSocket disconnected')
    })

    newSocket.on('market_data', (data: MarketData[]) => {
      setMarketData(data)
    })

    newSocket.on('orderbook_update', (data: OrderBookData) => {
      setOrderBook(data)
    })

    newSocket.on('game_result', (result: any) => {
      setGameResult(result)
    })

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      setIsConnected(false)
    })

    setSocket(newSocket)

    // Simulate initial market data
    const mockData: MarketData[] = [
      { symbol: 'BTC/USDT', price: 65000, change24h: 2.5, volume: 1200000000 },
      { symbol: 'ETH/USDT', price: 3200, change24h: -1.8, volume: 800000000 },
      { symbol: 'SOL/USDT', price: 145, change24h: 5.2, volume: 300000000 },
      { symbol: 'ADA/USDT', price: 0.58, change24h: 1.9, volume: 150000000 },
    ]
    setMarketData(mockData)

    return () => {
      newSocket.close()
    }
  }, [])

  return {
    socket,
    isConnected,
    marketData,
    orderBook,
    gameResult
  }
}
