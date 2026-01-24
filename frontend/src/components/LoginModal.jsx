/**
 * LoginModal Component
 *
 * Modal dialog for user login authentication.
 * Displays login form with email and password fields.
 *
 * Features:
 * - Email and password inputs
 * - Form validation and error handling
 * - Links to register modal and forgot password
 * - Closes modal on successful authentication
 * - Uses BaseModal for backdrop blur and standard modal behaviors
 *
 * @component
 */

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLoginForm } from '../hooks';
import { BaseModal } from './ui';
import LoginFormContent from './LoginFormContent';
import TermsLink from './TermsLink';
import { Alert } from './ui';
import { BrainCircuitIcon, XIcon } from './icons';

/**
 * LoginModal Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Function} props.onSwitchToRegister - Function to switch to register modal
 */
export default function LoginModal({ isOpen, onClose, onSwitchToRegister }) {
  // Use shared login form hook
  const loginForm = useLoginForm({
    onSuccess: () => {
      onClose();
    },
  });

  // Track previous open state to reset only when modal transitions from closed to open
  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      loginForm.reset();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, loginForm]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={false}
    >
      <div className="p-8 relative">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-accent rounded-md transition-colors z-10"
          aria-label="Close modal"
        >
          <XIcon className="h-5 w-5 text-muted-foreground hover:text-foreground" />
        </button>

        {/* Logo and header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] rounded-xl flex items-center justify-center mr-3">
              <BrainCircuitIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">AIxU</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2">
            Your ideas, amplified
          </h2>
          <p className="text-muted-foreground text-md">
            Sign in to continue
          </p>
        </div>

        {loginForm.error && (
          <Alert variant="error" className="mb-4">
            {loginForm.error}
          </Alert>
        )}

        <LoginFormContent {...loginForm} />

        {/* Footer links */}
        <div className="mt-6 space-y-3">
          {/* Switch to register MODAL */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </button>
            </p>
          </div>

          <div className="text-center">
            <Link
              to="/forgot-password"
              onClick={onClose}
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            By continuing, you agree to AIxU's <TermsLink parentModalType="login" />.
          </p>
        </div>
      </div>
    </BaseModal>
  );
}
