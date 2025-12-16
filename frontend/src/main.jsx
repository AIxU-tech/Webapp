// frontend/src/main.jsx
/**
 * Application Entry Point
 *
 * Renders the React app and sets up global providers in the following order:
 *
 * 1. QueryProvider: Centralized data caching with React Query
 *    - Must wrap all data-fetching components
 *    - Provides cache sharing across the app
 *
 * 2. BrowserRouter: Client-side routing (basename="/app" matches Flask route)
 *    - Enables navigation without page reloads
 *
 * 3. AuthProvider: Global authentication state
 *    - Checks login status on app load
 *    - Provides user data to all components
 *
 * 4. SocketProvider: Real-time WebSocket connection
 *    - Connects when user is authenticated
 *    - Enables instant message delivery and notifications
 *
 * Provider Order Matters:
 * - QueryProvider is outermost so all providers can use cached data
 * - SocketProvider is inside AuthProvider because it needs user state
 *
 * Development Features:
 * - StrictMode: Enables additional checks and warnings
 * - React Query Devtools: Inspect cache state (bottom-left button)
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './contexts/QueryProvider';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { TermsProvider } from './contexts/TermsContext';
import AppPrefetcher from './components/AppPrefetcher';
import App from './App';
import './styles.css';

// Render app to #root div in index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* QueryProvider enables centralized data caching */}
    {/* All useQuery/useMutation hooks share this cache */}
    <QueryProvider>
      {/* BrowserRouter enables client-side routing */}
      {/* basename="/app" means all routes are under /app/ path */}
      <BrowserRouter basename="/app">
        {/* TermsProvider enables Terms modal to be opened from any page */}
        <TermsProvider>
          {/* AuthProvider checks login status and provides user state */}
          <AuthProvider>
            {/* AppPrefetcher loads all main page data in the background */}
            {/* Runs once after auth check, doesn't block initial render */}
            <AppPrefetcher />

            {/* SocketProvider manages WebSocket connection for real-time features */}
            {/* Must be inside AuthProvider to access user state */}
            <SocketProvider>
              <App />
            </SocketProvider>
          </AuthProvider>
        </TermsProvider>
      </BrowserRouter>
    </QueryProvider>
  </React.StrictMode>
);