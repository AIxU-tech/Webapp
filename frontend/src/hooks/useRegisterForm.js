/**
 * useRegisterForm Hook
 *
 * Encapsulates all registration form logic including:
 * - Form state management
 * - University detection based on .edu email domain
 * - Form validation
 * - Registration submission
 *
 * This hook is shared between RegisterPage and RegisterModal to
 * eliminate code duplication while allowing different UI wrappers.
 *
 * @module hooks/useRegisterForm
 */

import { useState, useCallback, useMemo } from 'react';
import { register } from '../api';
import { useUniversities, useForm } from '../hooks';
import {
  extractEduSubdomain,
  isValidRegistrationEmail,
  isWhitelistedEmail,
} from '../utils/email';

/**
 * useRegisterForm Hook
 *
 * @param {Object} config - Configuration options
 * @param {Function} config.onSuccess - Callback after successful registration
 *   Receives { email, university } object
 * @param {Function} [config.onRequestUniversity] - Callback when user wants to request
 *   a new university. Receives { email, firstName, lastName } object.
 *   If not provided, handleRequestUniversity will set an error.
 * @returns {Object} Form state and handlers
 */
export default function useRegisterForm({ onSuccess, onRequestUniversity }) {
  // Fetch universities with React Query (cached, auto-refetching)
  const { data: universities = [], isLoading: loadingUniversities } = useUniversities();

  // University detection state (updated when email changes)
  const [detectedUniversity, setDetectedUniversity] = useState(null);

  // Map of email domains to university objects for O(1) lookup
  const universityDomainMap = useMemo(() => {
    const map = new Map();
    universities.forEach((uni) => {
      if (uni.emailDomain) {
        map.set(uni.emailDomain.toLowerCase(), uni);
      }
    });
    return map;
  }, [universities]);

  // Find university by email (handles subdomains like cs.mit.edu -> mit)
  const findUniversityByEmail = useCallback((email) => {
    const subdomain = extractEduSubdomain(email);
    if (!subdomain) return null;

    let uni = universityDomainMap.get(subdomain);
    if (uni) return uni;

    // Try base domain for subdomains
    if (subdomain.includes('.')) {
      const baseDomain = subdomain.split('.').pop();
      uni = universityDomainMap.get(baseDomain);
      if (uni) return uni;
    }

    return null;
  }, [universityDomainMap]);

  // Form state management with useForm hook
  const {
    formData,
    error,
    setError,
    loading,
    handleChange,
    handleSubmit,
    reset,
  } = useForm({
    initialValues: { email: '', password: '', firstName: '', lastName: '' },

    // Update university detection when email changes
    onFieldChange: (name, value) => {
      if (name === 'email' && universityDomainMap.size > 0) {
        setDetectedUniversity(findUniversityByEmail(value));
      }
    },

    // Validation before submission
    validate: (data) => {
      if (!isValidRegistrationEmail(data.email)) {
        return 'Please use your university .edu email address';
      }
      const isWhitelisted = isWhitelistedEmail(data.email);
      if (!detectedUniversity && !isWhitelisted) {
        return 'No university found for your email domain. Please contact support if you believe this is an error.';
      }
      if (data.password.length < 6) {
        return 'Password must be at least 6 characters';
      }
      return null;
    },

    // Submit registration
    onSubmit: async (data) => {
      const response = await register({
        email: data.email.trim(),
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      });

      // Call success callback with registration result
      onSuccess({
        email: response.email || data.email,
        university: response.university || detectedUniversity,
      });
    },
  });

  // Handle request to add a new university
  const handleRequestUniversity = useCallback(() => {
    if (!formData.firstName.trim()) {
      setError('Please enter your first name');
      return;
    }
    if (!formData.lastName.trim()) {
      setError('Please enter your last name');
      return;
    }

    if (onRequestUniversity) {
      onRequestUniversity({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
    } else {
      setError('Please contact support to add your university.');
    }
  }, [formData, setError, onRequestUniversity]);

  // Derived state
  const isWhitelistedDomain = isWhitelistedEmail(formData.email);
  const showUniversityStatus = formData.email && isValidRegistrationEmail(formData.email);

  return {
    // Form state
    formData,
    error,
    loading,
    loadingUniversities,

    // University detection
    detectedUniversity,
    isWhitelistedDomain,
    showUniversityStatus,

    // Handlers
    handleChange,
    handleSubmit,
    handleRequestUniversity,
    reset,
    setError,
  };
}

