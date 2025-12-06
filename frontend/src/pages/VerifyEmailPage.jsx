/**
 * VerifyEmailPage Component
 *
 * Email verification page for user registration flow.
 * Uses the shared EmailVerificationForm component.
 *
 * Flow:
 * 1. User comes from RegisterPage with email in state
 * 2. Verification code was already sent during registration
 * 3. User enters code → account is created and user is logged in
 * 4. Redirects to profile page
 *
 * @component
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { verifyEmail, resendVerificationCode } from '../api';
import PlasmaBackground from '../components/PlasmaBackground';
import EmailVerificationForm from '../components/EmailVerificationForm';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();

  // Get email from navigation state (passed from RegisterPage)
  const email = location.state?.email;

  // Redirect if no email provided
  useEffect(() => {
    if (!email) {
      navigate('/register', { replace: true });
    }
  }, [email, navigate]);

  // Set page title
  useEffect(() => {
    document.title = 'Verify Email - AIxU';
  }, []);

  /**
   * Handle verification API call
   */
  const handleVerify = async (code) => {
    return verifyEmail(code);
  };

  /**
   * Handle resend API call
   */
  const handleResend = async () => {
    return resendVerificationCode();
  };

  /**
   * Handle successful verification
   * - Refresh auth context to update user state
   * - Redirect to profile page
   */
  const handleSuccess = async () => {
    await refreshUser();
    setTimeout(() => {
      navigate('/profile', { replace: true });
    }, 1500);
  };

  // Don't render if no email (redirect in progress)
  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden no-scrollbar">
      <PlasmaBackground
        variant="fullscreen"
        radialWhitecast={true}
        cardRadius={0.35}
      />

      <div className="relative z-10 w-full max-w-lg px-6 py-12">
        <EmailVerificationForm
          email={email}
          onVerify={handleVerify}
          onResend={handleResend}
          onSuccess={handleSuccess}
          backLink="/register"
          backLinkText="← Back to Registration"
        />
      </div>
    </div>
  );
}
