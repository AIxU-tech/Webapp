/**
 * TermsLink Component
 *
 * Clickable inline text that opens the Terms of Service modal.
 * Styled as an inline link but implemented as a button for accessibility.
 *
 * Usage:
 * <p>By continuing, you agree to AIxU's <TermsLink />.</p>
 *
 * Props:
 * - children: Custom link text (default: "Terms of Service and Privacy Policy")
 *
 * @component
 */

import { useTerms } from '../contexts/TermsContext';

export default function TermsLink({ children }) {
  const { openTermsModal } = useTerms();

  return (
    <button
      type="button"
      onClick={openTermsModal}
      className="text-primary hover:underline font-medium cursor-pointer"
    >
      {children || 'Terms of Service and Privacy Policy'}
    </button>
  );
}
