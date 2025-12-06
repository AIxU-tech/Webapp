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
// ICON COMPONENTS
// =============================================================================

/**
 * BrainCircuitIcon
 *
 * The AIxU brand logo icon - a stylized brain/lightbulb symbol
 * representing AI and innovation. Displayed in the navbar brand section.
 */
const BrainCircuitIcon = () => (
  <svg
    className="h-8 w-8 text-white"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);

/**
 * CommunityIcon
 *
 * Icon representing the Community section - shows multiple users
 * to indicate social/networking features.
 */
const CommunityIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

/**
 * UniversitiesIcon
 *
 * Icon representing the Universities section - shows a graduation cap
 * to indicate academic/educational content.
 */
const UniversitiesIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c0 1 2 2 6 2s6-1 6-2v-5" />
  </svg>
);

/**
 * MessagesIcon
 *
 * Icon representing the Messages section - shows a chat bubble
 * to indicate messaging/communication features.
 */
const MessagesIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

/**
 * NewsIcon
 *
 * Icon representing the News section - shows a newspaper/document
 * to indicate AI news and research content.
 */
const NewsIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
    <path d="M9 9h1" />
    <path d="M9 13h6" />
    <path d="M9 17h6" />
  </svg>
);

/**
 * ProfileIcon
 *
 * Icon representing the Profile section - shows a single user
 * to indicate personal account/profile features.
 */
const ProfileIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

/**
 * AdminIcon
 *
 * Icon representing admin features - shows a shield with checkmark
 * to indicate administrative/moderation features.
 */
const AdminIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

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
        {isAuthenticated && (
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-1">
            <NavLink to="/community" currentPath={currentPath}>
              <CommunityIcon />
              <span>Community</span>
            </NavLink>

            <NavLink to="/universities" currentPath={currentPath}>
              <UniversitiesIcon />
              <span>Universities</span>
            </NavLink>

            <NavLink to="/messages" currentPath={currentPath}>
              <MessagesIcon />
              <span>Messages</span>
            </NavLink>

            <NavLink to="/news" currentPath={currentPath}>
              <NewsIcon />
              <span>News</span>
            </NavLink>
          </div>
        )}

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
          // Join button for unauthenticated users
          <Link
            to="/register"
            className="bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-[hsl(220,85%,60%)]/30 transition-all duration-200 transform hover:-translate-y-0.5"
          >
            Join AIxU
          </Link>
        )}
      </div>
    </nav>
  );
}
