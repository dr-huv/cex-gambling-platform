import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import OrderBook from './OrderBook'
import TradingChart from './TradingChart'
import OrderForm from './OrderForm'

interface MarketData {
  symbol: string
  price: number
  change24h: number
  volume: number
}

interface TradingInterfaceProps {
  marketData: MarketData[]
}

export default function TradingInterface({ marketData }: TradingInterfaceProps) {
  const [selectedPair, setSelectedPair] = useState('BTC/USDT')
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Market Overview */}
      <div className="lg:col-span-4">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Market Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {marketData.slice(0, 4).map((market) => (
              <div key={market.symbol} className="bg-dark-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{market.symbol}</span>
                  <div className={`flex items-center text-sm ${
                    market.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {market.change24h >= 0 ? (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    )}
                    {Math.abs(market.change24h).toFixed(2)}%
                  </div>
                </div>
                <div className="text-2xl font-bold">${market.price.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Vol: ${market.volume.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trading Chart */}
      <div className="lg:col-span-3">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{selectedPair}</h2>
            <select 
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="input"
            >
              <option value="BTC/USDT">BTC/USDT</option>
              <option value="ETH/USDT">ETH/USDT</option>
              <option value="SOL/USDT">SOL/USDT</option>
            </select>
          </div>
          <TradingChart pair={selectedPair} />
        </div>
      </div>

      {/* Order Book */}
      <div className="lg:col-span-1">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Order Book</h3>
          <OrderBook pair={selectedPair} />
        </div>
      </div>

      {/* Trading Form */}
      <div className="lg:col-span-2"> 
        <div className="card">
          <div className="flex mb-4 border-b border-dark-200">
            <button
              onClick={() => setOrderType('buy')}
              className={`flex-1 py-3 font-medium border-b-2 transition-colors ${
                orderType === 'buy'
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-gray-400'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setOrderType('sell')}
              className={`flex-1 py-3 font-medium border-b-2 transition-colors ${
                orderType === 'sell'
                  ? 'border-red-500 text-red-400'
                  : 'border-transparent text-gray-400'
              }`}
            >
              Sell
            </button>
          </div>
          <OrderForm type={orderType} pair={selectedPair} />
        </div>
      </div>

      {/* Recent Trades */}
      <div className="lg:col-span-2">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Trades</h3>
          <div className="space-y-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString()}
                </span>
                <span className="font-mono">
                  ${(50000 + Math.random() * 10000).toFixed(2)}
                </span>
                <span className={`font-mono ${Math.random() > 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                  {(Math.random() * 2).toFixed(4)} BTC
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
