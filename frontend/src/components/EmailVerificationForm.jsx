/**
 * EmailVerificationForm Component
 *
 * Reusable 6-digit email verification form component.
 * Handles the UI and timer logic, while parent components
 * provide the specific API calls and success handlers.
 *
 * Features:
 * - 6-digit code input with auto-submit
 * - Countdown timer (configurable duration)
 * - Resend code functionality
 * - Loading and error states
 * - Auto-focus on mount
 *
 * @component
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MailIcon, ClockIcon } from './icons';

// Default verification time (3 minutes)
const DEFAULT_EXPIRY_SECONDS = 180;

/**
 * EmailVerificationForm
 *
 * @param {Object} props
 * @param {string} props.email - Email address being verified
 * @param {string} [props.title] - Page title (default: "Verify Your Email")
 * @param {string} [props.subtitle] - Custom subtitle text
 * @param {function} props.onVerify - Async function called with code, should return response or throw
 * @param {function} props.onResend - Async function to resend code, should return { remainingTime }
 * @param {function} props.onSuccess - Called with response after successful verification
 * @param {number} [props.expirySeconds] - Code expiry time in seconds (default: 180)
 * @param {string} [props.backLink] - URL for back link (default: "/register")
 * @param {string} [props.backLinkText] - Text for back link (default: "← Back to Registration")
 */
export default function EmailVerificationForm({
  email,
  title = 'Verify Your Email',
  subtitle,
  onVerify,
  onResend,
  onSuccess,
  expirySeconds = DEFAULT_EXPIRY_SECONDS,
  backLink = '/register',
  backLinkText = '← Back to Registration',
}) {
  // Form state
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(expirySeconds);
  const [isExpired, setIsExpired] = useState(false);

  // Input ref for auto-focus
  const codeInputRef = useRef(null);

  // Auto-focus on mount
  useEffect(() => {
    if (codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Watch for expiration
  useEffect(() => {
    if (timeLeft <= 0 && !isExpired) {
      setIsExpired(true);
      setError('Your verification code has expired. Please request a new one.');
    }
  }, [timeLeft, isExpired]);

  // Format time as M:SS
  const formatTime = useCallback((seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Handle code input with auto-submit
  const handleCodeChange = useCallback((e) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 6) {
      value = value.slice(0, 6);
    }
    setCode(value);

    // Auto-submit when 6 digits entered
    if (value.length === 6) {
      setTimeout(() => {
        handleSubmit(null, value);
      }, 500);
    }
  }, []);

  // Handle form submission
  const handleSubmit = async (e, codeValue = null) => {
    if (e) e.preventDefault();

    setError('');
    setSuccess('');

    const verificationCode = codeValue || code;

    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    if (isExpired) {
      setError('Code has expired. Please request a new one.');
      return;
    }

    setLoading(true);

    try {
      const response = await onVerify(verificationCode);
      setSuccess(response.message || 'Email verified successfully!');

      // Call parent's success handler
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle resend code
  const handleResendCode = async () => {
    setError('');
    setSuccess('');
    setResending(true);

    try {
      const response = await onResend();
      setSuccess(response.message || 'New verification code sent!');
      setTimeLeft(response.remainingTime || expirySeconds);
      setIsExpired(false);
      setCode('');

      if (codeInputRef.current) {
        codeInputRef.current.focus();
      }
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Default subtitle if not provided
  const displaySubtitle = subtitle || (
    <>
      We've sent a 6-digit verification code to
      <br />
      <span className="font-medium text-foreground">{email}</span>
    </>
  );

  return (
    <div className="bg-card border border-border rounded-xl shadow-card p-8 text-center">
      <div className="flex justify-center mb-4">
        <MailIcon className="h-12 w-12 text-primary" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        {title}
      </h1>

      {/* Subtitle */}
      <p className="text-muted-foreground mb-6">
        {displaySubtitle}
      </p>

      {/* Timer */}
      <div className={`flex items-center justify-center gap-2 text-sm mb-6 ${
        isExpired ? 'text-red-600' : 'text-foreground'
      }`}>
        <ClockIcon className="h-4 w-4" />
        <span>
          Code expires in{' '}
          <strong>{isExpired ? 'expired' : formatTime(timeLeft)}</strong>
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg text-sm bg-red-100 text-red-800">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 px-4 py-2 rounded-lg text-sm bg-green-100 text-green-800">
          {success}
        </div>
      )}

      {/* Verification Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          ref={codeInputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          placeholder="000000"
          value={code}
          onChange={handleCodeChange}
          disabled={loading || isExpired}
          maxLength={6}
          autoComplete="one-time-code"
          className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground text-center text-lg font-mono tracking-widest placeholder-muted-foreground disabled:opacity-50"
          required
        />

        <button
          type="submit"
          disabled={loading || isExpired || code.length !== 6}
          className="w-full bg-gradient-primary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-hover transition-all duration-200 disabled:opacity-50"
        >
          {loading ? 'Verifying...' : isExpired ? 'Code Expired' : 'Verify Email'}
        </button>
      </form>

      {/* Resend Code */}
      <div className="mt-6">
        <p className="text-sm text-muted-foreground mb-2">
          Didn't receive the code?
        </p>
        <button
          type="button"
          onClick={handleResendCode}
          disabled={resending}
          className="w-full px-6 py-3 border border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all duration-200 disabled:opacity-50"
        >
          {resending ? 'Sending...' : 'Resend Code'}
        </button>
      </div>

      {/* Back Link */}
      <Link
        to={backLink}
        className="mt-6 inline-block text-sm text-primary hover:underline"
      >
        {backLinkText}
      </Link>
    </div>
  );
}
