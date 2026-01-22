/**
 * useLoginForm Hook
 *
 * Encapsulates all login form logic including:
 * - Form state management
 * - Login submission
 * - Auth context integration
 *
 * This hook is shared between LoginPage and LoginModal to
 * eliminate code duplication while allowing different UI wrappers.
 *
 * @module hooks/useLoginForm
 */

import { useAuth } from '../contexts/AuthContext';
import { login } from '../api/auth';
import { useForm } from '../hooks';

/**
 * useLoginForm Hook
 *
 * @param {Object} config - Configuration options
 * @param {Function} config.onSuccess - Callback after successful login
 *   Called with no arguments after user is logged in
 * @returns {Object} Form state and handlers
 */
export default function useLoginForm({ onSuccess }) {
  const { loginUser } = useAuth();

  const {
    formData,
    error,
    loading,
    handleChange,
    handleSubmit,
    reset,
  } = useForm({
    initialValues: { email: '', password: '' },

    onSubmit: async (data) => {
      const response = await login(data.email.trim(), data.password.trim());
      loginUser(response.user);
      onSuccess();
    },
  });

  return {
    formData,
    error,
    loading,
    handleChange,
    handleSubmit,
    reset,
  };
}

