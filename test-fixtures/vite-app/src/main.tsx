/**
 * Main entry point for Vite fixture app
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Code splitting example - lazy load component
const LazyComponent = React.lazy(() => import('./components/LazyComponent'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <React.Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </React.Suspense>
  </React.StrictMode>,
);
