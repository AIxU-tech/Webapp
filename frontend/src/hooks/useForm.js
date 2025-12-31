/**
 * useForm Hook
 *
 * Manages form state, validation, and submission with built-in error handling.
 *
 * @example
 * const { formData, error, loading, handleChange, handleSubmit } = useForm({
 *   initialValues: { email: '', password: '' },
 *   validate: (data) => data.password.length < 6 ? 'Password too short' : null,
 *   onSubmit: async (data) => {
 *     await login(data);
 *     navigate('/dashboard');
 *   },
 * });
 */

import { useState, useCallback } from 'react';

export function useForm({
  initialValues,
  onSubmit,
  validate,
  onFieldChange,
  defaultErrorMessage = 'An error occurred. Please try again.',
}) {
  const [formData, setFormData] = useState(initialValues);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle standard input changes (expects e.target.name and e.target.value)
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;

      setFormData((prev) => {
        const updated = { ...prev, [name]: value };
        onFieldChange?.(name, value, updated);
        return updated;
      });
    },
    [onFieldChange]
  );

  // Set a single field programmatically (for custom inputs)
  const setFieldValue = useCallback(
    (name, value) => {
      setFormData((prev) => {
        const updated = { ...prev, [name]: value };
        onFieldChange?.(name, value, updated);
        return updated;
      });
    },
    [onFieldChange]
  );

  // Handle form submission with validation and error handling
  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      setError('');

      // Run validation if provided
      if (validate) {
        const validationError = validate(formData);
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      setLoading(true);
      try {
        await onSubmit(formData);
      } catch (err) {
        setError(err.message || defaultErrorMessage);
      } finally {
        setLoading(false);
      }
    },
    [formData, validate, onSubmit, defaultErrorMessage]
  );

  // Reset form to initial state
  const reset = useCallback(() => {
    setFormData(initialValues);
    setError('');
    setLoading(false);
  }, [initialValues]);

  return {
    formData,
    setFormData,
    error,
    setError,
    loading,
    setLoading,
    handleChange,
    handleSubmit,
    reset,
    setFieldValue,
  };
}
