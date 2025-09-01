import { useEffect, useRef } from 'react'

interface TradingChartProps {
  pair: string
}

export default function TradingChart({ pair }: TradingChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // This would integrate with a real charting library like TradingView or Chart.js
    // For demo purposes, we'll show a placeholder
    if (chartRef.current) {
      chartRef.current.innerHTML = `
        <div class="flex items-center justify-center h-full bg-dark-200 rounded-lg">
          <div class="text-center">
            <div class="text-lg font-medium text-gray-300 mb-2">${pair} Chart</div>
            <div class="text-sm text-gray-500">TradingView Integration Placeholder</div>
            <div class="mt-4 text-xs text-gray-400">
              Integrate with TradingView widget or Chart.js library
            </div>
          </div>
        </div>
      `
    }
  }, [pair])

  return (
    <div className="h-96 w-full">
      <div ref={chartRef} className="h-full w-full" />
    </div>
  )
}
