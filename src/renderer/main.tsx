import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initWebBridgeIfNeeded } from './mock-bridge';

// Ensure web-adapter fallback bridge is initialized when viewed in external browser
initWebBridgeIfNeeded();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
