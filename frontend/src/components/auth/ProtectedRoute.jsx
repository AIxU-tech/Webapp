// frontend/src/components/ProtectedRoute.jsx
/**
 * Protected Route Component
 *
 * Wrapper component that protects routes requiring authentication.
 * Redirects to login page if user is not logged in.
 *
 * Usage:
 * <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * ProtectedRoute Component
 *
 * Checks if user is authenticated before rendering children.
 * If not authenticated, redirects to login page (or home page).
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Component to render if authenticated
 * @param {string} props.redirectTo - Where to redirect if not authenticated (default: '/')
 *
 * @example
 * // Protect a single route
 * <Route
 *   path="/profile"
 *   element={
 *     <ProtectedRoute>
 *       <ProfilePage />
 *     </ProtectedRoute>
 *   }
 * />
 *
 * @example
 * // Redirect to custom page
 * <ProtectedRoute redirectTo="/login">
 *   <ProfilePage />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({ children, redirectTo = '/' }) {
  // Get authentication state from context
  const { isAuthenticated, loading } = useAuth();

  // Still checking auth status - show nothing (loading shown in AuthProvider)
  // This prevents flash of redirect while checking session
  if (loading) {
    return null;
  }

  // Not authenticated - redirect to specified page
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // User is authenticated - render the protected component
  return children;
}
