import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

interface OrderFormProps {
  type: 'buy' | 'sell'
  pair: string
}

interface OrderFormData {
  orderType: 'market' | 'limit'
  price?: number
  amount: number
  total?: number
}

export default function OrderForm({ type, pair }: OrderFormProps) {
  const [orderMethod, setOrderMethod] = useState<'market' | 'limit'>('limit')
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<OrderFormData>()

  const watchedAmount = watch('amount', 0)
  const watchedPrice = watch('price', 0)

  const onSubmit = async (data: OrderFormData) => {
    try {
      // This would connect to your order matching engine
      toast.success(`${type.toUpperCase()} order placed successfully`)
      console.log('Order data:', { ...data, type, pair })
    } catch (error) {
      toast.error('Failed to place order')
    }
  }

  const calculateTotal = () => {
    if (orderMethod === 'market') return 0
    return watchedAmount * watchedPrice
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Order Type Selection */}
      <div className="flex bg-dark-200 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setOrderMethod('market')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded transition-colors ${
            orderMethod === 'market'
              ? 'bg-dark-100 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Market
        </button>
        <button
          type="button"
          onClick={() => setOrderMethod('limit')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded transition-colors ${
            orderMethod === 'limit'
              ? 'bg-dark-100 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Limit
        </button>
      </div>

      {/* Price Input (only for limit orders) */}
      {orderMethod === 'limit' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Price (USDT)
          </label>
          <input
            type="number"
            step="0.01"
            className="input w-full"
            placeholder="0.00"
            {...register('price', { 
              required: orderMethod === 'limit',
              min: { value: 0.01, message: 'Price must be greater than 0' }
            })}
          />
          {errors.price && (
            <span className="text-red-400 text-xs mt-1">{errors.price.message}</span>
          )}
        </div>
      )}

      {/* Amount Input */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Amount ({pair.split('/')[0]})
        </label>
        <input
          type="number"
          step="0.00001"
          className="input w-full"
          placeholder="0.00000"
          {...register('amount', {
            required: 'Amount is required',
            min: { value: 0.00001, message: 'Amount must be greater than 0' }
          })}
        />
        {errors.amount && (
          <span className="text-red-400 text-xs mt-1">{errors.amount.message}</span>
        )}
      </div>

      {/* Total (calculated for limit orders) */}
      {orderMethod === 'limit' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Total (USDT)
          </label>
          <input
            type="number"
            className="input w-full bg-dark-300"
            value={calculateTotal().toFixed(2)}
            readOnly
          />
        </div>
      )}

      {/* Balance Info */}
      <div className="text-sm text-gray-400">
        Available: {type === 'buy' ? '1,000.00 USDT' : '0.5000 BTC'}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          type === 'buy'
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-red-600 hover:bg-red-700 text-white'
        }`}
      >
        {type.toUpperCase()} {pair.split('/')[0]}
      </button>

      {/* Order Summary */}
      <div className="text-xs text-gray-400 space-y-1">
        <div className="flex justify-between">
          <span>Fee (0.1%):</span>
          <span>${(calculateTotal() * 0.001).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Total:</span>
          <span>${(calculateTotal() * 1.001).toFixed(2)}</span>
        </div>
      </div>
    </form>
  )
}
