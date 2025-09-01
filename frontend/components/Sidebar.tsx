import { Home, TrendingUp, Coins, Gamepad2, Wallet, History, Settings } from 'lucide-react'
import { useRouter } from 'next/router'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Trading', href: '/trading', icon: TrendingUp },
  { name: 'Staking', href: '/staking', icon: Coins },
  { name: 'Gambling', href: '/gambling', icon: Gamepad2 },
  { name: 'Wallet', href: '/wallet', icon: Wallet },
  { name: 'History', href: '/history', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const router = useRouter()

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 pt-16">
      <div className="flex-1 flex flex-col min-h-0 bg-dark-100 border-r border-dark-200">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = router.pathname === item.href
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-dark-200 hover:text-white'
                  }`}
                >
                  <item.icon
                    className={`mr-3 flex-shrink-0 h-5 w-5 ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                    }`}
                  />
                  {item.name}
                </a>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}
