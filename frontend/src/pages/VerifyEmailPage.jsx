/**
 * VerifyEmailPage Component
 *
 * Email verification page for user registration flow.
 * Uses the shared useEmailVerification hook and EmailVerificationForm component.
 *
 * Flow:
 * 1. User comes from RegisterPage with email in state
 * 2. Verification code was already sent during registration
 * 3. User enters code -> account is created and user is logged in
 * 4. Redirects to profile page
 *
 * @component
 */

import { useAuth } from '../contexts/AuthContext';
import { verifyEmail, resendVerificationCode } from '../api';
import { useEmailVerification } from '../hooks';
import VerificationPageLayout from '../components/VerificationPageLayout';
import EmailVerificationForm from '../components/EmailVerificationForm';

export default function VerifyEmailPage() {
  const { refreshUser } = useAuth();

  const verification = useEmailVerification({
    pageTitle: 'Verify Email',
    requiredFields: ['email'],
    verifyFn: verifyEmail,
    resendFn: resendVerificationCode,
    successDelay: 1500,
    onSuccess: async (response, navigate) => {
      await refreshUser();
      navigate('/profile', { replace: true });
    },
  });

  // Render fallback UI (null for redirect, or loading/error states)
  if (!verification.isReady) {
    return verification.fallback;
  }

  return (
    <VerificationPageLayout>
      <EmailVerificationForm {...verification.formProps} />
    </VerificationPageLayout>
  );
}
