/**
 * RegisterPage Component
 *
 * User registration page with animated plasma background and automatic
 * university enrollment based on .edu email domain.
 *
 * Auto-Enrollment:
 * Users are automatically enrolled in a university based on their .edu email
 * domain. For example, a user with "student@uoregon.edu" will be automatically
 * enrolled in the University of Oregon.
 *
 * @component
 */

import { useNavigate, Link } from 'react-router-dom';
import { usePageTitle, useRegisterForm } from '../hooks';
import { AuthFormLayout, RegisterFormContent, TermsLink } from '../components/auth';
import { Alert, Divider } from '../components/ui';

export default function RegisterPage() {
  const navigate = useNavigate();
  usePageTitle('Sign Up');

  // Use shared register form hook
  const registerForm = useRegisterForm({
    onSuccess: ({ email, university }) => {
      navigate('/verify-email', {
        replace: true,
        state: { email, university },
      });
    },
    onRequestUniversity: ({ email, firstName, lastName }) => {
      navigate('/request-university', {
        state: { email, firstName, lastName },
      });
    },
  });

  // Footer content
  const footer = (
    <>
      {/* Auto-enrollment info note */}
      <Alert variant="info">
        Your university is automatically determined by your .edu email domain
      </Alert>

      {/* Divider */}
      <Divider className="my-6">or</Divider>

      {/* Login link - navigates to login PAGE */}
      <div className="text-center">
        <p className="text-muted-foreground text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>

      {/* Legal text */}
      <p className="text-xs text-muted-foreground mt-6 text-center leading-relaxed">
        By creating an account, you agree to AIxU's <TermsLink />.
      </p>
    </>
  );

  return (
    <AuthFormLayout
      title="Join our community"
      subtitle="Create your account and start connecting with AI enthusiasts from across the country"
      error={registerForm.error}
      footer={footer}
      maxWidth="max-w-lg"
      cardRadius={0.4}
    >
      <RegisterFormContent {...registerForm} />
    </AuthFormLayout>
  );
}
