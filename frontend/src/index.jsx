/**
 * index.jsx - Entry point for the React application
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root')
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for PWA support (production only).
// In development it can cache stale bundles and hide fresh code changes.
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(function(registration) {
      // Check for updates
      registration.addEventListener('updatefound', function() {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              if (window.confirm('New version available! Reload to update?')) {
                window.location.reload();
              }
            }
          });
        }
      });
      
      // Periodic update check (every hour)
      setInterval(function() {
        registration.update();
      }, 3600000);
    })
    .catch(function(error) {
      console.error('[PWA] Service Worker registration failed:', error);
    });
  
  // Handle service worker updates
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// Ensure stale service workers are removed in development.
if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'production') {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    Promise.all(registrations.map(function(registration) {
      return registration.unregister();
    })).then(function(results) {
      const hadRegistrations = results.some(Boolean);
      if (hadRegistrations && !sessionStorage.getItem('sw-dev-cleaned')) {
        sessionStorage.setItem('sw-dev-cleaned', '1');
        window.location.reload();
      }
    });
  });
}
