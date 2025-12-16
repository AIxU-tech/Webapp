/**
 * UniversityRequestDetailsPage Component
 *
 * Form page for entering university and club details
 * after email verification in the university request flow.
 *
 * Flow:
 * 1. User comes from RequestUniversityVerifyPage with verified data
 * 2. User fills out university and club details
 * 3. On submit, request is saved to admin queue
 * 4. Redirects to confirmation page
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { submitUniversityRequest } from '../api';
import PlasmaBackground from '../components/PlasmaBackground';
import CitySearchInput from '../components/CitySearchInput';

export default function UniversityRequestDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get verified data from previous step
  const { email, firstName, lastName, emailDomain } = location.state || {};

  // Form state
  const [formData, setFormData] = useState({
    universityName: '',
    universityLocation: '',
    clubName: '',
    clubDescription: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if required data not provided
  useEffect(() => {
    if (!email || !emailDomain) {
      navigate('/register', { replace: true });
    }
  }, [email, emailDomain, navigate]);

  // Set page title
  useEffect(() => {
    document.title = 'University Details - AIxU';
  }, []);

  /**
   * Handle input changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.universityName.trim()) {
      setError('University name is required');
      return;
    }
    if (!formData.universityLocation.trim()) {
      setError('University location is required');
      return;
    }
    if (!formData.clubName.trim()) {
      setError('Club name is required');
      return;
    }
    if (!formData.clubDescription.trim()) {
      setError('Club description is required');
      return;
    }

    setLoading(true);

    try {
      await submitUniversityRequest({
        universityName: formData.universityName.trim(),
        universityLocation: formData.universityLocation.trim(),
        clubName: formData.clubName.trim(),
        clubDescription: formData.clubDescription.trim(),
        clubTags: []
      });

      // Navigate to confirmation page
      navigate('/request-university/submitted', {
        replace: true,
        state: {
          universityName: formData.universityName.trim(),
          email
        }
      });

    } catch (err) {
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if required data missing
  if (!email || !emailDomain) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden no-scrollbar py-12">
      <PlasmaBackground
        variant="fullscreen"
        radialWhitecast={true}
        cardRadius={0.4}
      />

      <div className="relative z-10 w-full max-w-2xl px-6">
        <div className="bg-card border border-border rounded-xl shadow-card p-8">
          {/* Header */}
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

          {/* Error Message */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg text-sm bg-red-100 text-red-800">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* University Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
                University Information
              </h2>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  University Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="universityName"
                  value={formData.universityName}
                  onChange={handleChange}
                  placeholder="e.g., University of Oregon"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder-muted-foreground disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Location <span className="text-red-500">*</span>
                </label>
                <CitySearchInput
                  name="universityLocation"
                  value={formData.universityLocation}
                  onChange={(value) => setFormData(prev => ({ ...prev, universityLocation: value }))}
                  placeholder="Search for a city..."
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Club Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
                AI Club Information
              </h2>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Club Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="clubName"
                  value={formData.clubName}
                  onChange={handleChange}
                  placeholder="e.g., UO Artificial Intelligence Club"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder-muted-foreground disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Club Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="clubDescription"
                  value={formData.clubDescription}
                  onChange={handleChange}
                  placeholder="Describe your AI club, its mission, activities, and what makes it unique..."
                  rows={4}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder-muted-foreground disabled:opacity-50 resize-none"
                  required
                />
              </div>

            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-primary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting Request...' : 'Submit Request'}
            </button>
          </form>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <Link
              to="/register"
              className="text-sm text-primary hover:underline"
            >
              ← Cancel and return to Registration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
