/**
 * Footer Component
 *
 * Site-wide footer component that appears on all main pages.
 * Provides consistent footer navigation and branding.
 *
 * Features:
 * - Clean, minimal design matching the app's design system
 * - Responsive layout (stacked on mobile, side-by-side on desktop)
 * - Links to Terms of Service (opens modal)
 * - Copyright information
 * - Matches NavBar styling with glass effect
 *
 * @component
 */

import { Link } from 'react-router-dom';
import { BrainCircuitIcon } from './icons';
import TermsLink from './TermsLink';

/**
 * Footer Component
 *
 * Site-wide footer with branding, navigation links, and legal information.
 *
 * @returns {JSX.Element} The footer component
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="border-t border-border bg-background mt-auto"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* =================================================================
              BRAND SECTION
              
              Logo and brand name, links to home page.
              ================================================================= */}
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="AIxU Home"
          >
            {/* Logo icon with gradient background */}
            <div className="w-8 h-8 bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] rounded-lg flex items-center justify-center">
              <BrainCircuitIcon className="h-5 w-5" />
            </div>
            {/* Brand text */}
            <span className="font-bold text-lg text-foreground">AIxU</span>
          </Link>

          {/* =================================================================
              NAVIGATION LINKS
              
              Footer navigation links for common pages.
              ================================================================= */}
          <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Footer navigation">

            <TermsLink className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer">
              Terms & Privacy
            </TermsLink>
          </nav>

          {/* =================================================================
              COPYRIGHT
              
              Copyright notice with current year.
              ================================================================= */}
          <div className="text-sm text-muted-foreground text-center md:text-right">
            © {currentYear} AIxU. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

