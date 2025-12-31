/**
 * NavBar Component
 *
 * A unified navigation bar component used across the entire application.
 * Renders different navigation elements based on authentication state:
 *
 * - Authenticated users: Shows logo, centered navigation links (Community,
 *   Universities, Messages), and Profile link on the right
 * - Unauthenticated users: Shows logo and "Join AIxU" call-to-action button
 *
 * Design Features:
 * - Fixed positioning at the top of the viewport
 * - Glassomorphic styling with backdrop blur
 * - Responsive layout with centered navigation
 * - Hover effects with grey background on nav items
 * - Active state highlighting for current route
 *
 * @component
 */

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import {
  BrainCircuitIcon,
  CommunityIcon,
  UniversitiesIcon,
  OpportunitiesIcon,
  MessagesIcon,
  NewsIcon,
  ProfileIcon,
  AdminIcon,
} from './icons';

// =============================================================================
// NAVIGATION LINK COMPONENT
// =============================================================================

/**
 * NavLink Component
 *
 * A styled navigation link with active state detection.
 * Highlights the current route and provides hover feedback.
 *
 * @param {Object} props - Component props
 * @param {string} props.to - The route path to navigate to
 * @param {React.ReactNode} props.children - The link content (icon + text)
 * @param {string} props.currentPath - The current route path for active detection
 * @returns {JSX.Element} A styled Link component
 */
function NavLink({ to, children, currentPath }) {
  // Determine if this link matches the current route
  // Handles both exact matches and nested routes (e.g., /community/123)
  const isActive = currentPath === to ||
    (to !== '/' && currentPath.startsWith(to));

  return (
    <Link
      to={to}
      className={`
        px-3 py-2 rounded-md text-sm font-medium
        flex items-center gap-2
        transition-all duration-150
        ${isActive
          ? 'text-primary bg-gray-100'
          : 'text-gray-700 hover:text-foreground hover:bg-gray-100'
        }
      `}
    >
      {children}
    </Link>
  );
}

// =============================================================================
// MAIN NAVBAR COMPONENT
// =============================================================================

/**
 * NavBar Component
 *
 * The main navigation bar component that adapts based on authentication state.
 * Uses a three-column layout:
 * - Left: Brand logo with icon
 * - Center: Navigation links (authenticated only)
 * - Right: Profile link (authenticated) or Join button (unauthenticated)
 *
 * @returns {JSX.Element} The navigation bar
 */
// Permission level constant for admin check
const ADMIN_PERMISSION_LEVEL = 1;

export default function NavBar() {
  // Get current route for active link highlighting
  const location = useLocation();
  const currentPath = location.pathname;

  // Get authentication state and user from context
  const { isAuthenticated, user } = useAuth();
  const { openAuthModal } = useAuthModal();

  // Check if user is an admin (permission level >= 1)
  const isAdmin = user && user.permissionLevel >= ADMIN_PERMISSION_LEVEL;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 glass-navbar px-6 py-3"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-between">
        {/* =================================================================
            BRAND SECTION (Left)

            Contains the AIxU logo icon and brand name.
            Links to home page (/) for all users.
            ================================================================= */}
        <Link
          to="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {/* Logo icon with gradient background */}
          <div className="w-10 h-10 bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] rounded-lg flex items-center justify-center">
            <BrainCircuitIcon />
          </div>
          {/* Brand text */}
          <span className="font-bold text-xl text-foreground">AIxU</span>
        </Link>

        {/* =================================================================
            NAVIGATION SECTION (Center) - Authenticated Users Only

            Centered navigation links for main app sections.
            Uses absolute positioning to achieve true center alignment
            regardless of the widths of left/right sections.
            ================================================================= */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-1">
          <NavLink to="/community" currentPath={currentPath}>
            <CommunityIcon />
            <span>Community</span>
          </NavLink>

          <NavLink to="/universities" currentPath={currentPath}>
            <UniversitiesIcon />
            <span>Universities</span>
          </NavLink>

          <NavLink to="/opportunities" currentPath={currentPath}>
            <OpportunitiesIcon />
            <span>Opportunities</span>
          </NavLink>

          {isAuthenticated ? (
            <NavLink to="/messages" currentPath={currentPath}>
              <MessagesIcon />
              <span>Messages</span>
            </NavLink>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                openAuthModal();
              }}
              className={`
                px-3 py-2 rounded-md text-sm font-medium
                flex items-center gap-2
                transition-all duration-150
                text-gray-700 hover:text-foreground hover:bg-gray-100
              `}
            >
              <MessagesIcon />
              <span>Messages</span>
            </button>
          )}

          <NavLink to="/news" currentPath={currentPath}>
            <NewsIcon />
            <span>News</span>
          </NavLink>
        </div>


        {/* =================================================================
            ACTION SECTION (Right)

            Shows different content based on authentication:
            - Authenticated: Admin link (if admin) + Profile navigation link
            - Unauthenticated: "Join AIxU" call-to-action button
            ================================================================= */}
        {isAuthenticated ? (
          // Links for authenticated users
          <div className="flex items-center gap-1">
            {/* Admin link - only visible to admins */}
            {isAdmin && (
              <NavLink to="/admin/university-requests" currentPath={currentPath}>
                <AdminIcon />
                <span>Admin</span>
              </NavLink>
            )}

            {/* Profile link for all authenticated users */}
            <NavLink to="/profile" currentPath={currentPath}>
              <ProfileIcon />
              <span>Profile</span>
            </NavLink>
          </div>
        ) : (
          // Links for unauthenticated users
          <div className="flex items-center gap-4">
            {/* Add Your School link */}
            <Link
              to="/add-university"
              className="text-sm font-medium text-gray-700 hover:text-foreground transition-colors duration-150"
            >
              Add Your School
            </Link>

            {/* Join button */}
            <Link
              to="/register"
              className="bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-[hsl(220,85%,60%)]/30 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              Join AIxU
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
