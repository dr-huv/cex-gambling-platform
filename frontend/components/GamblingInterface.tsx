import { useState } from 'react'
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Play } from 'lucide-react'
import toast from 'react-hot-toast'

export default function GamblingInterface() {
  const [activeGame, setActiveGame] = useState<'dice' | 'crash' | 'plinko'>('dice')
  const [betAmount, setBetAmount] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)

  const games = [
    { id: 'dice', name: 'Dice Roll', icon: Dice1 },
    { id: 'crash', name: 'Crash', icon: Play },
    { id: 'plinko', name: 'Plinko', icon: Dice3 },
  ] as const

  const playGame = async () => {
    if (!betAmount || isNaN(Number(betAmount))) {
      toast.error('Please enter a valid bet amount')
      return
    }

    setIsPlaying(true)

    try {
      // Simulate game play
      await new Promise(resolve => setTimeout(resolve, 2000))

      const win = Math.random() > 0.5
      const multiplier = 1 + Math.random() * 2

      if (win) {
        toast.success(`You won! ${multiplier.toFixed(2)}x multiplier`)
      } else {
        toast.error('Better luck next time!')
      }
    } catch (error) {
      toast.error('Game failed. Please try again.')
    } finally {
      setIsPlaying(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Game Selection */}
      <div className="lg:col-span-1">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Games</h2>
          <div className="space-y-2">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => setActiveGame(game.id)}
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                  activeGame === game.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-200 text-gray-300 hover:bg-dark-300'
                }`}
              >
                <game.icon className="w-5 h-5 mr-3" />
                {game.name}
              </button>
            ))}
          </div>

          {/* Balance */}
          <div className="mt-6 p-4 bg-dark-200 rounded-lg">
            <div className="text-sm text-gray-400">Available Balance</div>
            <div className="text-xl font-semibold">500.00 USDT</div>
          </div>
        </div>
      </div>

      {/* Game Interface */}
      <div className="lg:col-span-2">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {games.find(g => g.id === activeGame)?.name}
            </h2>
            <div className="text-sm text-gray-400">
              House Edge: 1%
            </div>
          </div>

          {/* Game Area */}
          <div className="bg-dark-200 rounded-lg p-8 mb-6">
            {activeGame === 'dice' && <DiceGame />}
            {activeGame === 'crash' && <CrashGame />}
            {activeGame === 'plinko' && <PlinkoGame />}
          </div>

          {/* Betting Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bet Amount (USDT)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="input flex-1"
                  placeholder="Enter bet amount"
                  step="0.01"
                  min="0.01"
                />
                <button
                  onClick={() => setBetAmount('10')}
                  className="btn-secondary px-3"
                >
                  10
                </button>
                <button
                  onClick={() => setBetAmount('50')}
                  className="btn-secondary px-3"
                >
                  50
                </button>
                <button
                  onClick={() => setBetAmount('100')}
                  className="btn-secondary px-3"
                >
                  100
                </button>
              </div>
            </div>

            <button
              onClick={playGame}
              disabled={isPlaying}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                isPlaying
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              {isPlaying ? 'Playing...' : 'Place Bet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Individual game components
function DiceGame() {
  const [result, setResult] = useState<number | null>(null)

  return (
    <div className="text-center">
      <div className="mb-4">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-dark-100 rounded-lg">
          {result ? (
            <span className="text-3xl font-bold">{result}</span>
          ) : (
            <Dice3 className="w-12 h-12 text-gray-400" />
          )}
        </div>
      </div>
      <p className="text-gray-400">Roll above 50 to win 2x your bet!</p>
    </div>
  )
}

function CrashGame() {
  return (
    <div className="text-center">
      <div className="mb-4">
        <div className="text-4xl font-bold text-green-400">1.00x</div>
        <div className="text-sm text-gray-400 mt-2">Multiplier</div>
      </div>
      <p className="text-gray-400">Cash out before the crash!</p>
    </div>
  )
}

function PlinkoGame() {
  return (
    <div className="text-center">
      <div className="mb-4">
        <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto">
          {Array.from({ length: 25 }, (_, i) => (
            <div key={i} className="w-4 h-4 bg-dark-100 rounded-full"></div>
          ))}
        </div>
      </div>
      <p className="text-gray-400">Drop the ball and watch it fall!</p>
    </div>
  )
}
