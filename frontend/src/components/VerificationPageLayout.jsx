/**
 * VerificationPageLayout Component
 *
 * A minimal layout wrapper for verification-style pages that use
 * EmailVerificationForm or similar card-based content.
 *
 * Unlike AuthFormLayout (which includes logo, title, and card styling),
 * this component only provides the background and centering wrapper,
 * allowing child components to define their own card structure.
 *
 * Used by:
 * - RequestUniversityVerifyPage
 * - VerifyEmailPage
 *
 * @component
 *
 * @example
 * <VerificationPageLayout>
 *   <EmailVerificationForm {...props} />
 * </VerificationPageLayout>
 */

import PlasmaBackground from './PlasmaBackground';

/**
 * VerificationPageLayout
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render (typically EmailVerificationForm or a card)
 * @param {string} [props.maxWidth='max-w-lg'] - Max width class for the content container
 * @param {number} [props.cardRadius=0.35] - PlasmaBackground card radius parameter
 * @returns {JSX.Element}
 */
export default function VerificationPageLayout({
  children,
  maxWidth = 'max-w-lg',
  cardRadius = 0.35,
}) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden no-scrollbar">
      {/* Animated plasma background */}
      <PlasmaBackground
        variant="fullscreen"
        radialWhitecast={true}
        cardRadius={cardRadius}
      />

      {/* Centered content container */}
      <div className={`relative z-10 w-full ${maxWidth} px-6 py-12`}>
        {children}
      </div>
    </div>
  );
}
