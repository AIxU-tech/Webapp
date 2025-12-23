/**
 * UniversityRequestDetailsPage Component
 *
 * Form page for entering university and club details after email verification
 * in the university request flow.
 *
 * Flow:
 * 1. User arrives from RequestUniversityVerifyPage with verified data
 * 2. User fills out university and club details
 * 3. On submit, request is saved to admin queue
 * 4. Redirects to confirmation page
 */

import { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { submitUniversityRequest } from '../api';
import { usePageTitle, useForm } from '../hooks';
import { Alert } from '../components/ui';
import VerificationPageLayout from '../components/VerificationPageLayout';
import FormInput from '../components/FormInput';
import FormTextarea from '../components/FormTextarea';
import FormLabel from '../components/FormLabel';
import FormSection from '../components/FormSection';
import FormButton from '../components/FormButton';
import CitySearchInput from '../components/CitySearchInput';

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Page header with emoji icon and title/subtitle
 */
function PageHeader({ emailDomain }) {
  return (
    <div className="text-center mb-8">
      <div className="text-4xl mb-4">🏫</div>
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        Tell Us About Your University
      </h1>
      <p className="text-muted-foreground">
        Fill out the details below to request adding your university to AIxU
        <br />
        <span className="text-sm">
          Email domain: <strong>@{emailDomain}.edu</strong>
        </span>
      </p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function UniversityRequestDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, emailDomain } = location.state || {};

  usePageTitle('University Details');

  const { formData, error, loading, handleChange, setFieldValue, handleSubmit } = useForm({
    initialValues: {
      universityName: '',
      universityLocation: '',
      clubName: '',
      clubDescription: '',
    },

    onSubmit: async (data) => {
      await submitUniversityRequest({
        universityName: data.universityName.trim(),
        universityLocation: data.universityLocation.trim(),
        clubName: data.clubName.trim(),
        clubDescription: data.clubDescription.trim(),
        clubTags: [],
      });

      navigate('/request-university/submitted', {
        replace: true,
        state: {
          universityName: data.universityName.trim(),
          email,
        },
      });
    },
  });

  // Redirect if required data not provided
  useEffect(() => {
    if (!email || !emailDomain) {
      navigate('/register', { replace: true });
    }
  }, [email, emailDomain, navigate]);

  // Handle location change from CitySearchInput (uses setFieldValue since it doesn't pass an event)
  const handleLocationChange = (value) => {
    setFieldValue('universityLocation', value);
  };

  // Don't render if required data missing (redirect in progress)
  if (!email || !emailDomain) {
    return null;
  }

  return (
    <VerificationPageLayout maxWidth="max-w-2xl" cardRadius={0.4}>
      <div className="bg-card border border-border rounded-xl shadow-card p-8">
        <PageHeader emailDomain={emailDomain} />

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* University Information Section */}
          <FormSection title="University Information">
            <div>
              <FormLabel required>University Name</FormLabel>
              <FormInput
                name="universityName"
                value={formData.universityName}
                onChange={handleChange}
                placeholder="e.g., University of Oregon"
                disabled={loading}
                required
              />
            </div>

            <div>
              <FormLabel required>Location</FormLabel>
              <CitySearchInput
                name="universityLocation"
                value={formData.universityLocation}
                onChange={handleLocationChange}
                placeholder="Search for a city..."
                disabled={loading}
                required
              />
            </div>
          </FormSection>

          {/* AI Club Information Section */}
          <FormSection title="AI Club Information">
            <div>
              <FormLabel required>Club Name</FormLabel>
              <FormInput
                name="clubName"
                value={formData.clubName}
                onChange={handleChange}
                placeholder="e.g., UO Artificial Intelligence Club"
                disabled={loading}
                required
              />
            </div>

            <div>
              <FormLabel required>Club Description</FormLabel>
              <FormTextarea
                name="clubDescription"
                value={formData.clubDescription}
                onChange={handleChange}
                placeholder="Describe your AI club, its mission, activities, and what makes it unique..."
                rows={4}
                disabled={loading}
                required
              />
            </div>
          </FormSection>

          <FormButton
            type="submit"
            loading={loading}
            loadingText="Submitting Request..."
          >
            Submit Request
          </FormButton>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/register"
            className="text-sm text-primary hover:underline"
          >
            ← Cancel and return to Registration
          </Link>
        </div>
      </div>
    </VerificationPageLayout>
  );
}
