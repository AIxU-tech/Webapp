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

import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { login } from '../api/auth';
import { useForm } from '../hooks';
import { BaseModal } from './ui';
import FormInput from './FormInput';
import FormButton from './FormButton';
import TermsLink from './TermsLink';
import { Alert } from './ui';
import { BrainCircuitIcon } from './icons';

/**
 * LoginModal Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Function} props.onSwitchToRegister - Function to switch to register modal
 */
export default function LoginModal({ isOpen, onClose, onSwitchToRegister }) {
  const { loginUser } = useAuth();

  const {
    formData,
    error,
    loading,
    handleChange,
    handleSubmit,
  } = useForm({
    initialValues: { email: '', password: '' },
    onSubmit: async (data) => {
      const response = await login(data.email.trim(), data.password.trim());
      loginUser(response.user);
      onClose(); // Close modal on successful login
    },
  });

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={true}
    >
      <div className="p-8">
        {/* Logo and header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] rounded-xl flex items-center justify-center mr-3">
              <BrainCircuitIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">AIxU</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2">
            Welcome back
          </h2>
          <p className="text-muted-foreground text-sm">
            Sign in to continue
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormInput
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            required
          />

          <FormInput
            type="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
            required
          />

          <FormButton
            type="submit"
            loading={loading}
            loadingText="Logging in..."
            className="w-full"
          >
            Log in
          </FormButton>
        </form>

        {/* Footer links */}
        <div className="mt-6 space-y-3">
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
            By continuing, you agree to AIxU's <TermsLink />.
          </p>
        </div>
      </div>
    </BaseModal>
  );
}

