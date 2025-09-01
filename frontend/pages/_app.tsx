import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { RecoilRoot } from 'recoil'
import { AuthProvider } from '../contexts/AuthContext'
import { WebSocketProvider } from '../contexts/WebSocketContext'
import { Toaster } from 'react-hot-toast'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <RecoilRoot>
      <AuthProvider>
        <WebSocketProvider>
          <Component {...pageProps} />
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                background: '#1f2937',
                color: '#fff',
                border: '1px solid #374151'
              }
            }}
          />
        </WebSocketProvider>
      </AuthProvider>
    </RecoilRoot>
  )
}
