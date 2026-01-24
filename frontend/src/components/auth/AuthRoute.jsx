// frontend/src/components/AuthRoute.jsx
/**
 * Auth Route Component
 *
 * Wrapper component for authentication pages (login, register).
 * Redirects authenticated users away from auth pages to prevent
 * accessing login/register when already logged in.
 *
 * Usage:
 * <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * AuthRoute Component
 *
 * Checks if user is authenticated. If authenticated, redirects to community page.
 * If not authenticated, renders the auth page (login/register).
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Component to render if not authenticated
 * @param {string} props.redirectTo - Where to redirect if authenticated (default: '/community')
 *
 * @example
 * // Protect login page
 * <Route
 *   path="/login"
 *   element={
 *     <AuthRoute>
 *       <LoginPage />
 *     </AuthRoute>
 *   }
 * />
 *
 * @example
 * // Redirect to custom page
 * <AuthRoute redirectTo="/dashboard">
 *   <LoginPage />
 * </AuthRoute>
 */
export default function AuthRoute({ children, redirectTo = '/community' }) {
  // Get authentication state from context
  const { isAuthenticated, loading } = useAuth();

  // Still checking auth status - show nothing (loading shown in AuthProvider)
  // This prevents flash of redirect while checking session
  if (loading) {
    return null;
  }

  // User is authenticated - redirect away from auth pages
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // User is not authenticated - render the auth page
  return children;
}

