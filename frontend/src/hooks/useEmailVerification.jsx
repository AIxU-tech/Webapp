/**
 * useEmailVerification Hook
 *
 * Encapsulates common email verification page logic, reducing duplication
 * between VerifyEmailPage and RequestUniversityVerifyPage.
 *
 * Handles:
 * - Location state extraction and validation
 * - Redirect when required fields are missing
 * - Page title management
 * - Optional initialization (e.g., sending verification code on mount)
 * - Loading and error states during initialization
 * - Pre-configured handlers for EmailVerificationForm
 *
 * @module hooks/useEmailVerification
 *
 * @example
 * // Basic usage (no initialization needed)
 * const verification = useEmailVerification({
 *   pageTitle: 'Verify Email',
 *   requiredFields: ['email'],
 *   verifyFn: verifyEmail,
 *   resendFn: resendVerificationCode,
 *   onSuccess: async (response, navigate) => {
 *     await refreshUser();
 *     navigate('/profile', { replace: true });
 *   },
 * });
 *
 * @example
 * // With initialization (send code on mount)
 * const verification = useEmailVerification({
 *   pageTitle: 'Verify Email - Request University',
 *   requiredFields: ['email', 'firstName', 'lastName'],
 *   initFn: (state) => startUniversityRequest(state),
 *   verifyFn: verifyUniversityRequest,
 *   resendFn: resendUniversityRequestCode,
 *   onSuccess: (response, navigate) => {
 *     navigate('/request-university/details', { replace: true, state: response });
 *   },
 * });
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePageTitle } from './useUI';
import { LoadingState, ErrorState } from '../components/ui';
import VerificationPageLayout from '../components/VerificationPageLayout';

/**
 * Default configuration values
 */
const DEFAULTS = {
  redirectTo: '/register',
  backLink: '/register',
  backLinkText: 'Back to Registration',
  formTitle: 'Verify Your Email',
  successDelay: 1000,
};

/**
 * useEmailVerification Hook
 *
 * @param {Object} config - Configuration object
 * @param {string} config.pageTitle - Browser tab title (without "- AIxU" suffix)
 * @param {string[]} config.requiredFields - Fields required from location.state (e.g., ['email'])
 * @param {Function} config.verifyFn - API function to verify code: (code) => Promise<response>
 * @param {Function} config.resendFn - API function to resend code: () => Promise<response>
 * @param {Function} config.onSuccess - Success callback: (response, navigate) => void
 * @param {Function} [config.initFn] - Optional initialization function: (stateData) => Promise
 * @param {string} [config.redirectTo='/register'] - Redirect path when required fields missing
 * @param {string} [config.backLink='/register'] - Back link URL for form
 * @param {string} [config.backLinkText='Back to Registration'] - Back link text
 * @param {string} [config.formTitle='Verify Your Email'] - Form title
 * @param {number} [config.successDelay=1000] - Delay before calling onSuccess (ms)
 *
 * @returns {Object} Verification state and utilities
 * @returns {boolean} returns.isReady - Whether the form is ready to render
 * @returns {Object|null} returns.stateData - Extracted location.state data
 * @returns {string} returns.email - Email address from state (convenience accessor)
 * @returns {JSX.Element|null} returns.fallback - UI to render when not ready (loading/error/redirect)
 * @returns {Object} returns.formProps - Props to spread on EmailVerificationForm
 */
export function useEmailVerification(config) {
  const {
    pageTitle,
    requiredFields,
    verifyFn,
    resendFn,
    onSuccess,
    initFn,
    redirectTo = DEFAULTS.redirectTo,
    backLink = DEFAULTS.backLink,
    backLinkText = DEFAULTS.backLinkText,
    formTitle = DEFAULTS.formTitle,
    successDelay = DEFAULTS.successDelay,
  } = config;

  const navigate = useNavigate();
  const location = useLocation();

  // Extract state data from navigation
  const stateData = location.state || {};

  // Check if all required fields are present
  const hasRequiredFields = useMemo(() => {
    return requiredFields.every((field) => Boolean(stateData[field]));
  }, [requiredFields, stateData]);

  // Initialization state (only used when initFn is provided)
  const [initializing, setInitializing] = useState(Boolean(initFn));
  const [initError, setInitError] = useState('');

  // Set browser tab title
  usePageTitle(pageTitle);

  // Redirect if required fields are missing
  useEffect(() => {
    if (!hasRequiredFields) {
      navigate(redirectTo, { replace: true });
    }
  }, [hasRequiredFields, navigate, redirectTo]);

  // Run initialization function on mount (if provided)
  useEffect(() => {
    if (!initFn || !hasRequiredFields) return;

    let cancelled = false;

    async function initialize() {
      try {
        await initFn(stateData);
        if (!cancelled) {
          setInitializing(false);
        }
      } catch (err) {
        if (!cancelled) {
          setInitError(err.message || 'Failed to send verification code');
          setInitializing(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [initFn, hasRequiredFields, stateData]);

  /**
   * Handle verification form submission
   */
  const handleVerify = useCallback(
    async (code) => {
      return verifyFn(code);
    },
    [verifyFn]
  );

  /**
   * Handle resend code request
   */
  const handleResend = useCallback(async () => {
    return resendFn();
  }, [resendFn]);

  /**
   * Handle successful verification
   */
  const handleSuccess = useCallback(
    (response) => {
      setTimeout(() => {
        onSuccess(response, navigate);
      }, successDelay);
    },
    [onSuccess, navigate, successDelay]
  );

  // Build form props object
  const formProps = useMemo(
    () => ({
      email: stateData.email || '',
      title: formTitle,
      onVerify: handleVerify,
      onResend: handleResend,
      onSuccess: handleSuccess,
      backLink,
      backLinkText,
    }),
    [stateData.email, formTitle, handleVerify, handleResend, handleSuccess, backLink, backLinkText]
  );

  // Determine fallback UI to render when not ready
  const fallback = useMemo(() => {
    // Redirect in progress (missing required fields)
    if (!hasRequiredFields) {
      return null;
    }

    // Show loading while initializing
    if (initializing) {
      return (
        <VerificationPageLayout>
          <div className="bg-card border border-border rounded-xl shadow-card p-8">
            <LoadingState
              size="lg"
              text={`Sending verification code to ${stateData.email}...`}
              className="py-8"
            />
          </div>
        </VerificationPageLayout>
      );
    }

    // Show error if initialization failed
    if (initError) {
      return (
        <VerificationPageLayout>
          <div className="bg-card border border-border rounded-xl shadow-card p-8">
            <ErrorState
              message={initError}
              backLink={{ to: redirectTo, label: backLinkText }}
            />
          </div>
        </VerificationPageLayout>
      );
    }

    return null;
  }, [hasRequiredFields, initializing, initError, stateData.email, redirectTo, backLinkText]);

  // Determine if the form is ready to render
  const isReady = hasRequiredFields && !initializing && !initError;

  return {
    isReady,
    stateData,
    email: stateData.email || '',
    fallback,
    formProps,
  };
}
