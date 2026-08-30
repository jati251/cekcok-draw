import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import '../index.css';

if (!import.meta.env.DEV) {
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
