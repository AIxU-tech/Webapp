/**
 * UniversityRequestSubmittedPage Component
 *
 * Confirmation page shown after successfully submitting
 * a university request. Informs user that their request
 * is in the admin queue for review.
 *
 * @component
 */

import { useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks';
import { GradientButton, Alert } from '../components/ui';
import VerificationPageLayout from '../components/VerificationPageLayout';

export default function UniversityRequestSubmittedPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get data from previous step
  const { universityName, email } = location.state || {};

  // Set page title
  usePageTitle('Request Submitted');

  // Redirect if accessed directly without state
  useEffect(() => {
    if (!universityName) {
      navigate('/register', { replace: true });
    }
  }, [universityName, navigate]);

  // Don't render until we've confirmed we have required state
  if (!universityName) {
    return null;
  }

  return (
    <VerificationPageLayout>
      <div className="bg-card border border-border rounded-xl shadow-card p-8 text-center">
        {/* Success Icon */}
        <div className="text-5xl mb-4">🎉</div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-foreground mb-4">
          Request Submitted!
        </h1>

        {/* Description */}
        <div className="text-muted-foreground mb-6 space-y-4">
          <p>
            Your request to add <strong className="text-foreground">{universityName}</strong> has been submitted successfully.
          </p>

          {/* Next Steps Info Box */}
          <Alert variant="info" title="What happens next?">
            <ol className="text-left space-y-2 list-decimal list-inside mt-2">
              <li>An admin will review your request</li>
              <li>Once approved, the university will be added to AIxU</li>
              <li>You'll be able to register with your <strong>{email}</strong> email</li>
            </ol>
          </Alert>

          <p className="text-sm">
            This usually takes 1-2 business days. You'll receive an email notification when your university is approved.
          </p>
        </div>

        {/* Action Button */}
        <GradientButton as={Link} to="/" className="w-full">
          Go to Homepage
        </GradientButton>
      </div>
    </VerificationPageLayout>
  );
}
