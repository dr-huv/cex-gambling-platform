import { useState, useEffect } from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import TradingInterface from '../components/TradingInterface'
import GamblingInterface from '../components/GamblingInterface'
import { useWebSocket } from '../hooks/useWebSocket'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'trading' | 'gambling'>('trading')
  const { isConnected, marketData } = useWebSocket()

  return (
    <>
      <Head>
        <title>CEX Gambling Platform</title>
        <meta name="description" content="High-performance cryptocurrency exchange with gambling features" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Layout>
        <div className="container mx-auto px-4 py-6">
          {/* Connection Status */}
          <div className="mb-6">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
              isConnected 
                ? 'bg-green-900 text-green-300 border border-green-700' 
                : 'bg-red-900 text-red-300 border border-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex mb-8 border-b border-dark-200">
            <button
              onClick={() => setActiveTab('trading')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'trading'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Trading
            </button>
            <button
              onClick={() => setActiveTab('gambling')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'gambling'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Gambling
            </button>
          </div>

          {/* Content */}
          {activeTab === 'trading' ? (
            <TradingInterface marketData={marketData} />
          ) : (
            <GamblingInterface />
          )}
        </div>
      </Layout>
    </>
  )
}
