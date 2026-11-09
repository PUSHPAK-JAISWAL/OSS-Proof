import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { bootAuth } from './lib/auth'
import './index.css'

// Finish or restore a GitHub sign-in before the first paint (at most a few seconds), then show the app.
const boot = Promise.race([bootAuth().catch(() => {}), new Promise((r) => setTimeout(r, 4000))])
boot.then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
