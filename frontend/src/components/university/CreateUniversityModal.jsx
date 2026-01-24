/**
 * CreateUniversityModal Component
 *
 * Modal for site admins to pre-create university pages.
 * Reuses form components from UniversityRequestDetailsPage for
 * consistent UX and maximum code reuse.
 *
 * Universities are created without a president - admin can promote
 * a member to president later via the Members tab after they register.
 *
 * @component
 */

import { BaseModal, Alert, FormInput, FormTextarea, FormLabel, FormSection, FormButton, CitySearchInput, SocialLinksInput } from '../ui';
import { useForm, useCreateUniversity } from '../../hooks';

/**
 * CreateUniversityModal
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {function} props.onClose - Callback when modal closes
 * @returns {JSX.Element}
 */
export default function CreateUniversityModal({ isOpen, onClose }) {
  const createMutation = useCreateUniversity();

  const { formData, error, loading, handleChange, setFieldValue, handleSubmit, reset, setError } = useForm({
    initialValues: {
      name: '',
      clubName: '',
      emailDomain: '',
      location: '',
      description: '',
      socialLinks: [],
    },

    validate: (data) => {
      if (!data.name.trim()) return 'University name is required';
      if (!data.clubName.trim()) return 'Club name is required';
      if (!data.emailDomain.trim()) return 'Email domain is required';
      return null;
    },

    onSubmit: async (data) => {

      try {
        await createMutation.mutateAsync({
          name: data.name.trim(),
          clubName: data.clubName.trim(),
          emailDomain: data.emailDomain.trim().toLowerCase(),
          location: data.location.trim() || undefined,
          description: data.description.trim() || undefined,
          socialLinks: data.socialLinks.length > 0 ? data.socialLinks : undefined,
        });
        handleClose();
      } catch (err) {
        // Display server error (e.g., duplicate email domain)
        setError(err.message || 'Failed to create university. Please try again.');
      }
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  // Handle location from CitySearchInput (doesn't pass event)
  const handleLocationChange = (value) => {
    setFieldValue('location', value);
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Create University" size="2xl">
      <div className="p-6">
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
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., University of Oregon"
                disabled={loading}
                required
              />
            </div>

            <div>
              <FormLabel required>Email Domain</FormLabel>
              <div className="flex items-center gap-2">
                <FormInput
                  name="emailDomain"
                  value={formData.emailDomain}
                  onChange={handleChange}
                  placeholder="e.g., uoregon"
                  disabled={loading}
                  required
                  className="flex-1"
                />
                <span className="text-muted-foreground">.edu</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Users with @{formData.emailDomain || 'domain'}.edu emails will auto-enroll
              </p>
            </div>

            <div>
              <FormLabel>Location</FormLabel>
              <CitySearchInput
                name="location"
                value={formData.location}
                onChange={handleLocationChange}
                placeholder="Search for a city..."
                disabled={loading}
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
              <FormLabel>Club Description</FormLabel>
              <FormTextarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the AI club, its mission, activities..."
                rows={4}
                disabled={loading}
              />
            </div>

            <div>
              <FormLabel>Social Links</FormLabel>
              <SocialLinksInput
                value={formData.socialLinks}
                onChange={(links) => setFieldValue('socialLinks', links)}
                disabled={loading}
              />
            </div>
          </FormSection>

          <FormButton
            type="submit"
            loading={loading}
            loadingText="Creating University..."
            disabled={loading}
          >
            Create University
          </FormButton>
        </form>
      </div>
    </BaseModal>
  );
}
