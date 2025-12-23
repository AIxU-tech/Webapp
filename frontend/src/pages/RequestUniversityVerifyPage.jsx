/**
 * RequestUniversityVerifyPage Component
 *
 * Email verification page for university request flow.
 * Uses the shared useEmailVerification hook and EmailVerificationForm component.
 *
 * Flow:
 * 1. User comes from RegisterPage with email/firstName/lastName in state
 * 2. On mount, calls /start endpoint to send verification code
 * 3. User enters code -> email ownership is verified
 * 4. Redirects to university details form
 *
 * @component
 */

import {
  startUniversityRequest,
  verifyUniversityRequest,
  resendUniversityRequestCode,
} from '../api';
import { useEmailVerification } from '../hooks';
import VerificationPageLayout from '../components/VerificationPageLayout';
import EmailVerificationForm from '../components/EmailVerificationForm';

export default function RequestUniversityVerifyPage() {
  const verification = useEmailVerification({
    pageTitle: 'Verify Email - Request University',
    requiredFields: ['email', 'firstName', 'lastName'],
    // Send verification code on mount (unlike registration where it's already sent)
    initFn: (state) => startUniversityRequest({
      email: state.email,
      firstName: state.firstName,
      lastName: state.lastName,
    }),
    verifyFn: verifyUniversityRequest,
    resendFn: resendUniversityRequestCode,
    onSuccess: (response, navigate) => {
      navigate('/request-university/details', {
        replace: true,
        state: {
          email: response.email,
          firstName: response.firstName,
          lastName: response.lastName,
          emailDomain: response.emailDomain,
        },
      });
    },
  });

  // Render fallback UI (null for redirect, loading, or error states)
  if (!verification.isReady) {
    return verification.fallback;
  }

  return (
    <VerificationPageLayout>
      <EmailVerificationForm {...verification.formProps} />
    </VerificationPageLayout>
  );
}
