/**
 * ForgotPasswordPage Component
 *
 * Allows users to request a password reset by entering their email address.
 * Sends a password reset link to the user's email if an account exists.
 *
 * Features:
 * - Email input form
 * - Success message (same message regardless of email existence for security)
 * - Link back to login page
 * - Consistent styling with other auth pages
 *
 * @component
 */

import { Link } from 'react-router-dom';
import { useState } from 'react';
import { forgotPassword } from '../api/auth';
import { usePageTitle, useForm } from '../hooks';
import AuthFormLayout from '../components/AuthFormLayout';
import FormInput from '../components/FormInput';
import FormButton from '../components/FormButton';

export default function ForgotPasswordPage() {
  usePageTitle('Forgot Password');
  const [success, setSuccess] = useState(false);

  const { formData, error, loading, handleChange, handleSubmit } = useForm({
    initialValues: { email: '' },

    onSubmit: async (data) => {
      await forgotPassword(data.email.trim());
      setSuccess(true);
    },
  });

  // Footer content with navigation link
  const footer = (
    <div className="text-center">
      <p className="text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link to="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );

  // Show success message after submission
  if (success) {
    return (
      <AuthFormLayout
        title="Check your email"
        subtitle={<>We've sent a reset link to <span className="font-medium text-foreground">{formData.email}</span></>}
        footer={footer}
        cardRadius={0.35}
      >
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Didn't receive it? Check your spam folder or try again.
          </p>
          <FormButton
            type="button"
            onClick={() => setSuccess(false)}
            loading={false}
          >
            Send another email
          </FormButton>
        </div>
      </AuthFormLayout>
    );
  }

  return (
    <AuthFormLayout
      title="Reset your password"
      subtitle="Enter your email address and we'll send you a link to reset your password"
      error={error}
      footer={footer}
      cardRadius={0.35}
    >
      {/* Forgot Password Form */}
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Email Input */}
        <FormInput
          type="email"
          name="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          disabled={loading}
          required
          autoComplete="email"
        />

        {/* Submit Button */}
        <FormButton
          type="submit"
          loading={loading}
          loadingText="Sending reset link..."
        >
          Send reset link
        </FormButton>
      </form>
    </AuthFormLayout>
  );
}

