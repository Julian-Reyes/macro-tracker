import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Register service worker for PWA (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(
      import.meta.env.BASE_URL + 'sw.js'
    ).catch(() => {});
  });
} else if ('serviceWorker' in navigator) {
  // Unregister any existing SW in dev so it doesn't serve stale cache
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const r of regs) r.unregister();
  });
}
