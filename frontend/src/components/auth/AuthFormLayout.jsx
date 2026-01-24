/**
 * AuthFormLayout Component
 *
 * A shared layout wrapper for authentication-style pages (login, register,
 * add university, etc.). Provides consistent structure and styling.
 *
 * Features:
 * - Animated plasma background
 * - Centered card container
 * - Logo and branding section
 * - Configurable title and subtitle
 * - Error message display
 * - Footer section for navigation links
 *
 * @component
 */

import { PlasmaBackground } from '../layout';
import { BrainCircuitIcon } from '../icons';
import { Alert } from '../ui';

/**
 * AuthFormLayout Component
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Main heading text
 * @param {string} [props.subtitle] - Subheading text
 * @param {string} [props.error] - Error message to display
 * @param {React.ReactNode} props.children - Form content
 * @param {React.ReactNode} [props.footer] - Footer content (navigation links, etc.)
 * @param {number} [props.cardRadius=0.35] - PlasmaBackground card radius
 * @param {string} [props.maxWidth='max-w-md'] - Container max-width class
 * @param {boolean} [props.showLogo=true] - Whether to show the logo section
 * @param {string} [props.className] - Additional container padding class
 * @returns {JSX.Element}
 */
export default function AuthFormLayout({
  title,
  subtitle,
  error,
  children,
  footer,
  cardRadius = 0.35,
  maxWidth = 'max-w-md',
  showLogo = true,
  className = 'py-12',
}) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden no-scrollbar">
      {/* Animated plasma background */}
      <PlasmaBackground
        variant="fullscreen"
        radialWhitecast={true}
        cardRadius={cardRadius}
      />

      {/* Form container */}
      <div className={`relative z-10 w-full ${maxWidth} px-6 ${className}`}>
        {/* Card */}
        <div className="bg-card border border-border rounded-xl shadow-card p-8">
          {/* Logo and header section */}
          {showLogo && (
            <div className="text-center mb-8">
              {/* Logo */}
              <div className="flex items-center justify-center mb-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mr-3">
                  <BrainCircuitIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-foreground">AIxU</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-foreground mb-3">
                {title}
              </h1>

              {/* Subtitle */}
              {subtitle && (
                <p className="text-muted-foreground text-lg">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Error message - uses Alert component for consistent styling and accessibility */}
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          {/* Form content */}
          {children}

          {/* Footer section */}
          {footer && (
            <div className="mt-6">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
