import { createContext, useContext, ReactNode } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

const WebSocketContext = createContext<ReturnType<typeof useWebSocket> | undefined>(undefined)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const websocket = useWebSocket()

  return (
    <WebSocketContext.Provider value={websocket}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider')
  }
  return context
}
