import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import { Bell, User, Settings, LogOut } from 'lucide-react'

export default function Header() {
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  return (
    <header className="bg-dark-100 border-b border-dark-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-primary-400">CEX Platform</h1>
          <div className="hidden md:flex space-x-6">
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Markets</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Trading</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Staking</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Gambling</a>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-white hover:bg-dark-200 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 text-gray-300 hover:text-white hover:bg-dark-200 rounded-lg transition-colors"
              >
                <User className="w-5 h-5" />
                <span>{user.username}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-dark-100 border border-dark-200 rounded-lg shadow-lg py-2">
                  <a href="#" className="flex items-center px-4 py-2 text-gray-300 hover:bg-dark-200">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </a>
                  <button
                    onClick={logout}
                    className="flex items-center w-full px-4 py-2 text-gray-300 hover:bg-dark-200"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-x-2">
              <button className="btn-secondary">Login</button>
              <button className="btn-primary">Sign Up</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
