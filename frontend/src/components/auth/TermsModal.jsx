/**
 * TermsModal Component
 *
 * Reusable modal displaying Terms of Service and Privacy Policy.
 * Used across all auth pages (Login, Register, CompleteAccount).
 *
 * Features:
 * - Scrollable content for long legal text
 * - ESC key to close
 * - Click outside to close
 * - Prevents body scroll when open
 * - Restores parent modal (login/register) when closed if opened from one
 * - Higher z-index (60) to stack over auth modals
 *
 * @component
 */

import { FormButton, BaseModal } from '../ui';
import { useAuthModal } from '../../contexts/AuthModalContext';

/**
 * TermsModal Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {string|null} props.parentModalType - 'login' | 'register' | null - Which modal opened Terms
 */
export default function TermsModal({ isOpen, onClose, parentModalType = null }) {
  const { openAuthModal } = useAuthModal();

  /**
   * Handle closing the Terms modal
   * If there's a parent modal, restore it after closing Terms
   */
  const handleClose = () => {
    onClose();
    // Restore parent modal after a brief delay to allow Terms modal to close
    if (parentModalType) {
      setTimeout(() => {
        openAuthModal(parentModalType);
      }, 100);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Terms and Conditions"
      size="2xl"
      zIndex={60}
    >
      {/* Modal Content (Scrollable) */}
      <div className="p-6">
        <div className="space-y-4 text-sm text-foreground">
          <div className="mb-4">
            <p className="text-xs text-muted-foreground">
              Last updated: October 12, 2025
            </p>
            <p className="text-muted-foreground mt-2">
              Welcome to AIxU Community ("we," "our," "us," or "AIxU"). By accessing
              or using the Community site at https://aixu.tech/community (the "Site"),
              you acknowledge that you have read, understood, and agree to be bound by
              these Terms. If you do not agree to these Terms, you may not access or use
              the Site or its services.
            </p>
          </div>

          <h3 className="text-lg font-semibold">1. Eligibility & Registration</h3>
          <p className="text-muted-foreground">
            <strong>1.1 Eligibility.</strong>
          </p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>
              You must be at least 18 years old (or of legal age in your jurisdiction)
              and capable of entering into a binding agreement.
            </li>
            <li>
              You must represent a recognized AI club or organization (e.g. at a
              university) to register as an organizational member (if applicable).
              Individual users may also participate under the rules described herein.
            </li>
          </ul>
          <p className="text-muted-foreground mt-2">
            <strong>1.2 Account Creation.</strong>
          </p>
          <p className="text-muted-foreground">
            To access certain features (sharing, posting, messaging), you must create an
            account. You agree to provide accurate, current, and complete information. You
            are responsible for maintaining confidentiality of your credentials and all
            activity under your account.
          </p>

          <h3 className="text-lg font-semibold mt-4">2. Content & Posting</h3>
          <p className="text-muted-foreground">
            You may submit, post, upload, or otherwise make available content (notes,
            tutorials, code, resources, messages). You grant AIxU a nonexclusive,
            royalty-free, perpetual, worldwide license to use, copy, display, distribute,
            adapt, and sublicense that content as needed to operate and promote the Site
            and community.
          </p>

          <h3 className="text-lg font-semibold mt-4">3. Acceptable Use</h3>
          <p className="text-muted-foreground">
            You agree not to use the Site to violate any laws, reverse engineer the
            software, submit harmful content, or engage in unauthorized commercial
            activity.
          </p>

          <h3 className="text-lg font-semibold mt-4">4. Intellectual Property</h3>
          <p className="text-muted-foreground">
            All rights, title, and interest in the Site are the exclusive property of
            AIxU or its licensors. "AIxU" and any logos are trademarks of AIxU.
          </p>

          <h3 className="text-lg font-semibold mt-4">5. Privacy & Data</h3>
          <p className="text-muted-foreground">
            Your use of the Site is governed by our Privacy Policy. We may collect
            personal information (name, email, institution) as necessary for registration
            and operation.
          </p>

          <h3 className="text-lg font-semibold mt-4">
            6. Disclaimers & Limitations of Liability
          </h3>
          <p className="text-muted-foreground">
            The Site is provided "as is" and "as available," without warranties of any
            kind. AIxU and its affiliates will not be liable for indirect, incidental,
            special, punitive, or consequential damages.
          </p>

          <h3 className="text-lg font-semibold mt-4">7. Termination</h3>
          <p className="text-muted-foreground">
            We may suspend or terminate your access at any time for violation of these
            Terms or for any other reason in our discretion.
          </p>
        </div>
      </div>

      {/* Modal Footer */}
      <div className="p-6 border-t border-border">
        <FormButton
          type="button"
          onClick={handleClose}
          fullWidth={true}
        >
          Close
        </FormButton>
      </div>
    </BaseModal>
  );
}
