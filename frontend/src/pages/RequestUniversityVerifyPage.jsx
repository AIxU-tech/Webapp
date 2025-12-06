/**
 * RequestUniversityVerifyPage Component
 *
 * Email verification page for university request flow.
 * Uses the shared EmailVerificationForm component.
 *
 * Flow:
 * 1. User comes from RegisterPage with email/firstName/lastName in state
 * 2. On mount, calls /start endpoint to send verification code
 * 3. User enters code → email ownership is verified
 * 4. Redirects to university details form
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  startUniversityRequest,
  verifyUniversityRequest,
  resendUniversityRequestCode
} from '../api';
import PlasmaBackground from '../components/PlasmaBackground';
import EmailVerificationForm from '../components/EmailVerificationForm';

export default function RequestUniversityVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get data passed from RegisterPage
  const { email, firstName, lastName } = location.state || {};

  // Initialization state
  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState('');

  // Redirect if required data not provided
  useEffect(() => {
    if (!email || !firstName || !lastName) {
      navigate('/register', { replace: true });
    }
  }, [email, firstName, lastName, navigate]);

  // Set page title
  useEffect(() => {
    document.title = 'Verify Email - Request University - AIxU';
  }, []);

  /**
   * Send verification code on mount
   *
   * Unlike registration (which sends code during form submit),
   * university request needs to call /start here to send the code.
   */
  useEffect(() => {
    if (!email || !firstName || !lastName) return;

    async function sendCode() {
      try {
        await startUniversityRequest({ email, firstName, lastName });
        setInitializing(false);
      } catch (err) {
        setInitError(err.message || 'Failed to send verification code');
        setInitializing(false);
      }
    }

    sendCode();
  }, [email, firstName, lastName]);

  /**
   * Handle verification API call
   */
  const handleVerify = async (code) => {
    return verifyUniversityRequest(code);
  };

  /**
   * Handle resend API call
   */
  const handleResend = async () => {
    return resendUniversityRequestCode();
  };

  /**
   * Handle successful verification
   * Navigate to university details form with verified data
   */
  const handleSuccess = (response) => {
    setTimeout(() => {
      navigate('/request-university/details', {
        replace: true,
        state: {
          email: response.email,
          firstName: response.firstName,
          lastName: response.lastName,
          emailDomain: response.emailDomain
        }
      });
    }, 1000);
  };

  // Don't render if required data missing (redirect in progress)
  if (!email || !firstName || !lastName) {
    return null;
  }

  // Show initialization error
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden no-scrollbar">
        <PlasmaBackground variant="fullscreen" radialWhitecast={true} cardRadius={0.35} />
        <div className="relative z-10 w-full max-w-lg px-6 py-12">
          <div className="bg-card border border-border rounded-xl shadow-card p-8 text-center">
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-2xl font-semibold text-foreground mb-4">
              Unable to Start Request
            </h1>
            <p className="text-red-600 mb-6">{initError}</p>
            <Link
              to="/register"
              className="inline-block bg-gradient-primary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-hover transition-all"
            >
              Back to Registration
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while sending initial code
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden no-scrollbar">
        <PlasmaBackground variant="fullscreen" radialWhitecast={true} cardRadius={0.35} />
        <div className="relative z-10 w-full max-w-lg px-6 py-12">
          <div className="bg-card border border-border rounded-xl shadow-card p-8 text-center">
            <div className="text-4xl mb-4">✉️</div>
            <h1 className="text-2xl font-semibold text-foreground mb-4">
              Sending Verification Code
            </h1>
            <p className="text-muted-foreground">
              Please wait while we send a code to {email}...
            </p>
          </div>
        </div>
      </div>
    );
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
          title="Verify Your Email"
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
