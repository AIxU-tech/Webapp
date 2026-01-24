/**
 * RegisterModal Component
 *
 * Modal dialog for user registration.
 * Displays registration form with name, email, and password fields.
 *
 * Features:
 * - First name, last name, email, and password inputs
 * - University detection based on .edu email domain
 * - Form validation and error handling
 * - Link to login modal
 * - Navigates to email verification page after successful registration
 * - Uses BaseModal for backdrop blur and standard modal behaviors
 *
 * @component
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegisterForm } from '../hooks';
import { BaseModal } from './ui';
import RegisterFormContent from './RegisterFormContent';
import TermsLink from './TermsLink';
import { Alert, Divider } from './ui';
import { BrainCircuitIcon, XIcon } from './icons';

/**
 * RegisterModal Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Function} props.onSwitchToLogin - Function to switch to login modal
 */
export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }) {
  const navigate = useNavigate();

  // Use shared register form hook
  const registerForm = useRegisterForm({
    onSuccess: ({ email, university }) => {
      onClose();
      navigate('/verify-email', {
        replace: true,
        state: { email, university },
      });
    },
    onRequestUniversity: ({ email, firstName, lastName }) => {
      onClose();
      navigate('/request-university', {
        state: { email, firstName, lastName },
      });
    },
  });

  // Track previous open state to reset only when modal transitions from closed to open
  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      registerForm.reset();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, registerForm]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
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
            Join our community
          </h2>
          <p className="text-muted-foreground text-md">
            Create your account and start connecting
          </p>
        </div>

        {registerForm.error && (
          <Alert variant="error" className="mb-4">
            {registerForm.error}
          </Alert>
        )}

        <RegisterFormContent {...registerForm} />

        {/* Footer links */}
        <div className="mt-6 space-y-4">
          <Alert variant="info">
            Your university is automatically determined by your .edu email domain
          </Alert>

          <Divider>or</Divider>

          {/* Switch to login MODAL */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            By creating an account, you agree to AIxU's <TermsLink parentModalType="register" />.
          </p>
        </div>
      </div>
    </BaseModal>
  );
}
