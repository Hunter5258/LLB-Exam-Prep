import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from '@/app/router'
import { AppDataProvider } from '@/hooks/useAppData'
import { Toasts } from '@/components/ui/UI'
import '@/styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppDataProvider>
        <AppRoutes />
        <Toasts />
      </AppDataProvider>
    </BrowserRouter>
  </StrictMode>,
)
