import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './lib/pwa'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registramos el service worker solo en producción (en dev interfiere con Vite/HMR).
if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    registerServiceWorker()
  })
}
