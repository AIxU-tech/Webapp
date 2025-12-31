/**
 * AddUniversityEntryPage Component
 *
 * Entry point for requesting to add a new university to AIxU.
 * Collects user's basic information (name, email) before starting
 * the verification process.
 *
 * Flow:
 * 1. User enters first name, last name, and .edu email
 * 2. On submit, navigates to /request-university with state
 * 3. Verification flow continues from there
 *
 * @component
 */

import { useNavigate, Link } from 'react-router-dom';
import { usePageTitle, useForm } from '../hooks';
import { Alert, Divider } from '../components/ui';
import AuthFormLayout from '../components/AuthFormLayout';
import FormInput from '../components/FormInput';
import FormButton from '../components/FormButton';
import NameInputPair from '../components/NameInputPair';
import { isEduEmail } from '../utils/email';

export default function AddUniversityEntryPage() {
  const navigate = useNavigate();
  usePageTitle('Add Your University');

  const { formData, error, loading, handleChange, handleSubmit } = useForm({
    initialValues: { firstName: '', lastName: '', email: '' },

    validate: (data) => {
      if (!isEduEmail(data.email)) {
        return 'Please use your university .edu email address';
      }
      return null;
    },

    onSubmit: async (data) => {
      navigate('/request-university', {
        state: {
          email: data.email.trim().toLowerCase(),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
        },
      });
    },
  });

  // Footer with navigation links
  const footer = (
    <>
      <Divider>or</Divider>

      {/* Registration link */}
      <div className="text-center">
        <p className="text-muted-foreground text-sm">
          Your university is already on AIxU?{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </>
  );

  return (
    <AuthFormLayout
      title="Add Your University"
      subtitle="Help us grow the AIxU community by adding your school"
      error={error}
      footer={footer}
      cardRadius={0.38}
      maxWidth="max-w-lg"
    >
      {/* President requirement notice */}
      <Alert variant="warning" className="mb-6 text-center">
        You must be the president of your AI club to create a university page
      </Alert>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Name inputs (side by side) */}
        <NameInputPair
          firstName={formData.firstName}
          lastName={formData.lastName}
          onChange={handleChange}
          disabled={loading}
        />

        {/* Email input */}
        <FormInput
          type="email"
          name="email"
          placeholder="Your university .edu email *"
          value={formData.email}
          onChange={handleChange}
          disabled={loading}
          required
        />

        {/* Email verification info */}
        <Alert variant="info" className="text-center">
          We'll verify your email to confirm your university affiliation
        </Alert>

        {/* Submit button */}
        <FormButton
          type="submit"
          loading={loading}
          loadingText="Continuing..."
          className="mt-6"
        >
          Continue
        </FormButton>
      </form>
    </AuthFormLayout>
  );
}
