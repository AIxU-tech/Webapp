/**
 * TermsLink Component
 *
 * Clickable inline text that opens the Terms of Service modal.
 * Styled as an inline link but implemented as a button for accessibility.
 *
 * Usage:
 * <p>By continuing, you agree to AIxU's <TermsLink />.</p>
 * <p>By continuing, you agree to AIxU's <TermsLink parentModalType="login" />.</p>
 *
 * Props:
 * - children: Custom link text (default: "Terms of Service and Privacy Policy")
 * - className: Optional className to override default styling
 * - parentModalType: Optional 'login' | 'register' to track which modal opened Terms
 *
 * @component
 */

import { useTerms } from '../../contexts/TermsContext';

export default function TermsLink({ children, className, parentModalType = null }) {
  const { openTermsModal } = useTerms();

  const handleClick = () => {
    openTermsModal(parentModalType);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className || "text-primary hover:underline font-medium cursor-pointer"}
    >
      {children || 'Terms of Service and Privacy Policy'}
    </button>
  );
}
