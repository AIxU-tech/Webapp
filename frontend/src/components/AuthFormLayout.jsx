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

import PlasmaBackground from './PlasmaBackground';

/**
 * BrainIcon - AIxU brand icon
 */
const BrainIcon = () => (
  <svg
    className="h-6 w-6 text-white"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
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
                  <BrainIcon />
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

          {/* Error message */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
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
