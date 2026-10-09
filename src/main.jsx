import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AppUpdates from './AppUpdates.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <AppUpdates />
  </StrictMode>,
)
