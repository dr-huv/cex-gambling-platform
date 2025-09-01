import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import axios from 'axios'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'

interface User {
  id: string
  username: string
  email: string
  verified: boolean
  balance: {
    [token: string]: number
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateBalance: (token: string, amount: number) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  useEffect(() => {
    const token = Cookies.get('auth_token')
    if (token) {
      // Verify token and get user data
      fetchUser(token)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async (token: string) => {
    try {
      const response = await axios.get(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser(response.data.user)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      Cookies.remove('auth_token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${apiUrl}/api/auth/login`, {
        email,
        password
      })

      const { token, user: userData } = response.data

      Cookies.set('auth_token', token, { expires: 7 })
      setUser(userData)
      toast.success('Login successful!')
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      throw error
    }
  }

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await axios.post(`${apiUrl}/api/auth/register`, {
        username,
        email,
        password
      })

      const { token, user: userData } = response.data

      Cookies.set('auth_token', token, { expires: 7 })
      setUser(userData)
      toast.success('Registration successful!')
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed'
      toast.error(message)
      throw error
    }
  }

  const logout = () => {
    Cookies.remove('auth_token')
    setUser(null)
    toast.success('Logged out successfully')
  }

  const updateBalance = (token: string, amount: number) => {
    if (user) {
      setUser({
        ...user,
        balance: {
          ...user.balance,
          [token]: amount
        }
      })
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateBalance
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
