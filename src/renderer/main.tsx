import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './i18n'

// Wait for DOM to be ready and electronAPI to be available
const initApp = () => {
  const root = document.getElementById('root')
  if (!root) {
    console.error('Root element not found')
    return
  }

  // Check if electronAPI is available (preload script loaded)
  const maxRetries = 10
  let retries = 0

  const tryRender = () => {
    if (window.electronAPI || retries >= maxRetries) {
      if (!window.electronAPI) {
        console.warn('electronAPI not available after retries, rendering anyway')
      }
      ReactDOM.createRoot(root).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      )
    } else {
      retries++
      console.log(`Waiting for electronAPI... (attempt ${retries}/${maxRetries})`)
      setTimeout(tryRender, 100)
    }
  }

  tryRender()
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}
