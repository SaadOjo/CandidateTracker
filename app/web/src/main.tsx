import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './tailwind.css'
import { App } from './app/App.tsx'
import { queryClient } from './app/queryClient.ts'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { AppErrorBoundary } from './app/AppErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
