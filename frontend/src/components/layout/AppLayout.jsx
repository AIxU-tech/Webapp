/**
 * AppLayout Component
 *
 * Layout wrapper for authenticated pages in the application.
 * Provides consistent structure with:
 * - Unified navigation bar (via NavBar component)
 * - Spacer to account for fixed navbar
 * - Main content area that renders child routes
 *
 * This component is used as a parent route in React Router,
 * with child routes rendered via the Outlet component.
 *
 * @component
 */

import { Outlet, useLocation } from 'react-router-dom';
import NavBar from './NavBar';
import Footer from './Footer';
import { Toast } from '../ui';
import { useResumeParseSocket } from '../../hooks/useResume';

const FULL_SCREEN_ROUTES = ['/messages'];

/**
 * AppLayout
 *
 * The main layout component for the authenticated application.
 * Wraps all authenticated pages with consistent navigation and styling.
 *
 * @returns {JSX.Element} The layout wrapper with navbar and content area
 */
function AppLayout() {
  const { pathname } = useLocation();
  const hideFooter = FULL_SCREEN_ROUTES.some((r) => pathname.startsWith(r));
  const { toast: parseToast, dismissToast } = useResumeParseSocket();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* =================================================================
          NAVIGATION BAR

          The unified NavBar component handles all navigation rendering.
          It automatically adapts based on authentication state.
          ================================================================= */}
      <NavBar />

      {/* =================================================================
          NAVBAR SPACER

          Since the navbar is fixed positioned, we need a spacer element
          to prevent content from being hidden behind it.
          Height matches the navbar height (h-16 = 4rem = 64px).
          ================================================================= */}
      <div className="h-16" aria-hidden="true" />

      {/* =================================================================
          MAIN CONTENT AREA

          Renders the matched child route via React Router's Outlet.
          All authenticated page components are rendered here.
          Uses flex-1 to grow and push footer to bottom.
          ================================================================= */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* =================================================================
          FOOTER

          Site-wide footer with branding, navigation links, and legal info.
          Positioned at the bottom via flexbox layout.
          ================================================================= */}
      {!hideFooter && (
        <>
          <Footer />

          {/* Bottom nav spacer (mobile) — matches fixed bottom nav + labels */}
          <div className="h-16 xl:hidden" aria-hidden="true" />
        </>
      )}

      <Toast
        message={parseToast?.message}
        isVisible={!!parseToast}
        onDismiss={dismissToast}
        variant={parseToast?.variant}
      />
    </div>
  );
}

export default AppLayout;
