// frontend/src/contexts/AuthContext.jsx
/**
 * Authentication Context
 *
 * Provides global authentication state to the entire React application.
 *
 * Features:
 * - Checks user authentication status on app load
 * - Provides current user data to all components
 * - Handles login/logout state updates
 * - Manages loading state during authentication check
 *
 * Usage:
 * 1. Wrap app with <AuthProvider>
 * 2. Access auth state with useAuth() hook in any component
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser } from '../api/auth';

/**
 * Authentication context
 * Contains: { user, setUser, loading, refreshUser }
 */
const AuthContext = createContext(null);

/**
 * Authentication Provider Component
 *
 * Wraps the app and provides authentication state to all children.
 * Automatically checks if user is logged in when app loads.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Child components
 */
export function AuthProvider({ children }) {
  // User object (null if not logged in)
  const [user, setUser] = useState(null);

  // Loading state (true during initial auth check)
  const [loading, setLoading] = useState(true);

  /**
   * Check authentication status on mount
   *
   * Calls /api/user/profile to:
   * - Get current user data if logged in (via Flask-Login session cookie)
   * - Receive 401 error if not logged in
   */
  useEffect(() => {
    checkAuthStatus();
  }, []); // Run once on mount

  /**
   * Check current authentication status
   *
   * Called on app load and can be called manually to refresh user data.
   */
  async function checkAuthStatus() {
    try {
      // Try to get current user from Flask backend
      const userData = await getCurrentUser();

      // User is logged in - save their data
      setUser(userData);
    } catch (error) {
      // Not logged in or session expired
      // This is expected behavior - not an error to show user
      setUser(null);
    } finally {
      // Done checking - hide loading spinner
      setLoading(false);
    }
  }

  /**
   * Refresh user data
   *
   * Useful after profile updates to get latest data.
   */
  async function refreshUser() {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      // Session might have expired
      setUser(null);
    }
  }

  /**
   * Login helper
   *
   * Call this after successful login to update context state.
   * Pass the user object returned from login API.
   *
   * @param {object} userData - User object from login response
   */
  function loginUser(userData) {
    setUser(userData);
  }

  /**
   * Logout helper
   *
   * Call this after logout API call to clear user state.
   */
  function logoutUser() {
    setUser(null);
  }

  // Context value provided to all children
  const value = {
    // Current user object (null if not logged in)
    user,

    // Is user currently logged in?
    isAuthenticated: user !== null,

    // Is initial auth check still in progress?
    loading,

    // Manual setters (use loginUser/logoutUser instead when possible)
    setUser,

    // Helper functions
    loginUser,   // Call after successful login
    logoutUser,  // Call after logout
    refreshUser, // Refresh user data from server
  };

  // Show loading spinner during initial auth check
  // This prevents flash of login screen if user is already logged in
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Render app with auth context
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth Hook
 *
 * Custom hook to access authentication context in any component.
 *
 * @returns {object} Auth context value
 * @throws {Error} If used outside AuthProvider
 *
 * @example
 * function MyComponent() {
 *   const { user, isAuthenticated, loginUser, logoutUser } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <p>Please log in</p>;
 *   }
 *
 *   return <p>Welcome, {user.full_name || user.email}!</p>;
 * }
 */
export function useAuth() {
  const context = useContext(AuthContext);

  // Make sure hook is used inside AuthProvider
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
