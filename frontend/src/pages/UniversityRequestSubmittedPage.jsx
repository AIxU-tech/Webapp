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
import PlasmaBackground from '../components/PlasmaBackground';

export default function UniversityRequestSubmittedPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get data from previous step
  const { universityName, email } = location.state || {};

  // Redirect if accessed directly without state
  useEffect(() => {
    if (!universityName) {
      navigate('/register', { replace: true });
    }
  }, [universityName, navigate]);

  // Set page title
  useEffect(() => {
    document.title = 'Request Submitted - AIxU';
  }, []);

  if (!universityName) {
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
        <div className="bg-card border border-border rounded-xl shadow-card p-8 text-center">
          {/* Success Icon */}
          <div className="text-5xl mb-4">🎉</div>

          {/* Title */}
          <h1 className="text-2xl font-semibold text-foreground mb-4">
            Request Submitted!
          </h1>

          {/* Description */}
          <div className="text-muted-foreground mb-8 space-y-4">
            <p>
              Your request to add <strong className="text-foreground">{universityName}</strong> has been submitted successfully.
            </p>

            <div className="bg-muted rounded-lg p-4 text-sm">
              <p className="font-medium text-foreground mb-2">What happens next?</p>
              <ol className="text-left space-y-2 list-decimal list-inside">
                <li>An admin will review your request</li>
                <li>Once approved, the university will be added to AIxU</li>
                <li>You'll be able to register with your <strong>{email}</strong> email</li>
              </ol>
            </div>

            <p className="text-sm">
              This usually takes 1-2 business days. You'll receive an email notification when your university is approved.
            </p>
          </div>

          {/* Action Button */}
          <Link
            to="/register"
            className="inline-block w-full bg-gradient-primary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-hover transition-all duration-200"
          >
            Return to Registration
          </Link>

          {/* Secondary Link */}
          <Link
            to="/"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
