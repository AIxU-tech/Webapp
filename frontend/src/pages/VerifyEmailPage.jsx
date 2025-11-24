/**
 * VerifyEmailPage Component
 *
 * Email verification page where users enter the 6-digit code sent to their email.
 * This page is shown after successful registration.
 *
 * Features:
 * - 6-digit code input with auto-submit when complete
 * - Countdown timer (3 minutes = 180 seconds)
 * - Resend code functionality
 * - Automatic form disable when code expires
 * - Integration with Flask backend verification API
 * - Animated plasma background matching login/register pages
 *
 * Performance Optimizations:
 * - Timer interval created once on mount (not recreated every second)
 * - No unnecessary progress bar calculations
 * - Minimal re-renders
 *
 * @component
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { verifyEmail, resendVerificationCode } from '../api';
import PlasmaBackground from '../components/PlasmaBackground';

/**
 * Time Constants
 *
 * Total verification time is 3 minutes (180 seconds)
 */
const TOTAL_TIME = 180; // 3 minutes in seconds

/**
 * Icon Components
 *
 * Simple SVG/emoji icons for visual feedback
 */
const MailIcon = () => (
  <div className="text-4xl mb-4">✉️</div>
);

const ClockIcon = () => (
  <span className="timer-icon">⏰</span>
);

export default function VerifyEmailPage() {
  /**
   * Router Hooks
   *
   * - navigate: For redirecting after successful verification
   * - location: To get the email address passed from RegisterPage
   */
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();

  /**
   * Email Address
   *
   * Get email from navigation state (passed from RegisterPage)
   * If not found, redirect back to register page
   */
  const email = location.state?.email;

  /**
   * Form State
   *
   * - code: The 6-digit verification code entered by user
   * - error: Error message to display
   * - success: Success message to display
   * - loading: Whether form is currently submitting
   * - resending: Whether resend request is in progress
   */
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  /**
   * Timer State
   *
   * - timeLeft: Seconds remaining before code expires
   * - isExpired: Whether the code has expired
   */
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [isExpired, setIsExpired] = useState(false);

  /**
   * Ref for input field
   *
   * Used to auto-focus the input when page loads and after resending code
   */
  const codeInputRef = useRef(null);

  /**
   * Redirect if no email found
   *
   * If user navigates directly to this page without coming from registration,
   * redirect them back to the register page.
   */
  useEffect(() => {
    if (!email) {
      navigate('/register', { replace: true });
    }
  }, [email, navigate]);

  /**
   * Auto-focus code input
   *
   * Automatically focus the input field when page loads
   * for better user experience
   */
  useEffect(() => {
    if (codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, []);

  /**
   * Set Page Title
   *
   * Updates browser tab title when component mounts
   */
  useEffect(() => {
    document.title = 'Verify Email - AIxU';
  }, []);

  /**
   * Countdown Timer Effect
   *
   * PERFORMANCE OPTIMIZATION:
   * Creates a single interval on mount that runs every second.
   * Does NOT recreate the interval every time state changes.
   * This prevents the lag issue from constantly creating/destroying intervals.
   *
   * The interval decrements timeLeft every second.
   * A separate useEffect watches for expiration.
   * Cleanup function clears interval on unmount.
   */
  useEffect(() => {
    // Create interval that runs every second
    const interval = setInterval(() => {
      setTimeLeft((prevTime) => {
        // If already at 0, keep it at 0
        if (prevTime <= 0) {
          return 0;
        }

        // Decrement time by 1 second
        return prevTime - 1;
      });
    }, 1000); // Run every 1000ms = 1 second

    // Cleanup function: clear interval when component unmounts
    // This prevents memory leaks
    return () => clearInterval(interval);
  }, []); // Empty dependency array = run once on mount only

  /**
   * Timer Expiration Watcher
   *
   * Separate effect that watches when timeLeft reaches 0
   * and marks the code as expired. This approach avoids
   * setState-inside-setState issues.
   */
  useEffect(() => {
    if (timeLeft <= 0 && !isExpired) {
      setIsExpired(true);
      setError('Your verification code has expired. Please request a new one.');
    }
  }, [timeLeft, isExpired]); // Watch timeLeft for changes

  /**
   * Format Time for Display
   *
   * Converts seconds to MM:SS format for better readability
   *
   * @param {number} seconds - Total seconds
   * @returns {string} Formatted time (e.g., "2:45", "0:05")
   *
   * Example:
   * - 180 seconds → "3:00"
   * - 65 seconds → "1:05"
   * - 5 seconds → "0:05"
   */
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  /**
   * Code Input Change Handler
   *
   * Handles input in the verification code field.
   * - Only allows numeric input (strips non-digits)
   * - Limits to 6 digits maximum
   * - AUTO-SUBMITS when exactly 6 digits are entered
   *
   * @param {Event} e - Input change event
   */
  const handleCodeChange = (e) => {
    // Remove any non-numeric characters
    // This ensures only digits 0-9 can be entered
    let value = e.target.value.replace(/[^0-9]/g, '');

    // Limit to 6 digits maximum
    if (value.length > 6) {
      value = value.slice(0, 6);
    }

    // Update state with sanitized value
    setCode(value);

    /**
     * AUTO-SUBMIT FEATURE
     *
     * When user enters exactly 6 digits, automatically submit the form.
     * Uses a short delay (500ms) for better UX - gives user time to see
     * what they typed before the form submits.
     *
     * This eliminates the need to click the submit button.
     */
    if (value.length === 6) {
      // Small delay before auto-submit for better user experience
      setTimeout(() => {
        handleSubmit(new Event('submit'), value);
      }, 500);
    }
  };

  /**
   * Form Submit Handler
   *
   * Submits the verification code to the backend API.
   * On success:
   * - User account is created
   * - User is logged in
   * - Redirects to profile page
   *
   * @param {Event} e - Form submit event
   * @param {string} codeValue - Optional code value (used for auto-submit)
   */
  const handleSubmit = async (e, codeValue = null) => {
    // Prevent default form submission (which would reload page)
    e.preventDefault();

    // Clear any previous messages
    setError('');
    setSuccess('');

    // Use provided code value (for auto-submit) or state code (for button submit)
    const verificationCode = codeValue || code;

    /**
     * Validation
     *
     * Ensure code is exactly 6 digits and hasn't expired
     */
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    if (isExpired) {
      setError('Code has expired. Please request a new one.');
      return;
    }

    // Set loading state to disable form during submission
    setLoading(true);

    try {
      /**
       * Call Verification API
       *
       * Sends code to Flask backend at /api/auth/verify-email
       * Backend will:
       * 1. Verify the code matches what was sent
       * 2. Check code hasn't expired
       * 3. Create the user account
       * 4. Log the user in (set session cookie)
       * 5. Return user data
       */
      const response = await verifyEmail(verificationCode);

      /**
       * Show Success Message
       */
      setSuccess(response.message || 'Email verified successfully!');

      /**
       * Update Auth Context
       *
       * Refresh authentication status to update global user state.
       * The backend has already logged the user in (via session cookie),
       * so we just need to fetch and store their user data.
       */
      await refreshUser();

      /**
       * Redirect to Profile
       *
       * After successful verification, redirect user to their profile page.
       * Short delay (1.5s) allows user to see success message.
       * replace: true prevents back button from returning to this page.
       */
      setTimeout(() => {
        navigate('/profile', { replace: true });
      }, 1500);

    } catch (err) {
      /**
       * Handle Verification Errors
       *
       * Common errors:
       * - Invalid code (user typo)
       * - Expired code (took too long)
       * - Code already used (trying to verify twice)
       * - Network errors (server down, no internet)
       */
      setError(err.message || 'Verification failed. Please check your code and try again.');
    } finally {
      // Reset loading state whether request succeeded or failed
      setLoading(false);
    }
  };

  /**
   * Resend Code Handler
   *
   * Requests a new verification code to be sent to user's email.
   * Resets the timer when successful.
   */
  const handleResendCode = async () => {
    // Clear any previous messages
    setError('');
    setSuccess('');

    // Set loading state
    setResending(true);

    try {
      /**
       * Call Resend API
       *
       * Requests Flask backend at /api/auth/resend-verification to:
       * 1. Generate a new 6-digit code
       * 2. Send it to user's email
       * 3. Reset the expiration timer
       */
      const response = await resendVerificationCode();

      /**
       * Show Success Message
       */
      setSuccess(response.message || 'A new verification code has been sent to your email!');

      /**
       * Reset Timer
       *
       * Reset countdown to full 3 minutes (180 seconds)
       */
      setTimeLeft(response.remainingTime || TOTAL_TIME);
      setIsExpired(false);

      /**
       * Clear Code Input
       *
       * Clear any partially entered code so user can enter the new one
       */
      setCode('');

      /**
       * Re-focus Input
       *
       * Put cursor back in input field for immediate typing
       */
      if (codeInputRef.current) {
        codeInputRef.current.focus();
      }

    } catch (err) {
      /**
       * Handle Resend Errors
       *
       * Common errors:
       * - No pending registration (session expired)
       * - Email send failure (SMTP error)
       * - Rate limiting (too many resend requests)
       * - Network errors
       */
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      // Reset loading state
      setResending(false);
    }
  };

  /**
   * Don't render if no email
   *
   * If email is not found, user will be redirected by useEffect.
   * Return null while redirect is in progress to avoid flash of content.
   */
  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden no-scrollbar">
      {/*
        Plasma Background Component

        Animated gradient background with radial whitecast effect
        to highlight the verification card.
        Matches the login and register page backgrounds.
      */}
      <PlasmaBackground
        variant="fullscreen"
        radialWhitecast={true}
        cardRadius={0.35}
      />

      {/*
        Verification Form Container

        Positioned above the plasma background (z-10).
        Centered vertically and horizontally.
      */}
      <div className="relative z-10 w-full max-w-lg px-6 py-12">
        {/*
          Verification Card

          White card with border, rounded corners, and shadow.
          Contains all verification UI elements.
        */}
        <div className="bg-card border border-border rounded-xl shadow-card p-8 text-center">

          {/*
            Email Icon

            Visual indicator that this is about email verification
          */}
          <MailIcon />

          {/*
            Page Header

            Title and description explaining what user needs to do
          */}
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Verify Your Email
          </h1>

          <p className="text-muted-foreground mb-6">
            We've sent a 6-digit verification code to
            <br />
            <span className="font-medium text-foreground">{email}</span>
          </p>

          {/*
            Countdown Timer

            Shows time remaining before code expires.
            Turns red when expired for visual feedback.
            No progress bar - just the timer text as requested.
          */}
          <div
            className={`flex items-center justify-center gap-2 text-sm mb-6 ${
              isExpired ? 'text-red-600' : 'text-foreground'
            }`}
          >
            <ClockIcon />
            <span>
              Code expires in{' '}
              <strong>
                {isExpired ? 'expired' : formatTime(timeLeft)}
              </strong>
            </span>
          </div>

          {/*
            Error Message Display

            Shows error message in red box when something goes wrong.
            Only renders when error state is not empty.
          */}
          {error && (
            <div className="mb-4 px-4 py-2 rounded-lg text-sm bg-red-100 text-red-800">
              {error}
            </div>
          )}

          {/*
            Success Message Display

            Shows success message in green box when verification succeeds.
            Only renders when success state is not empty.
          */}
          {success && (
            <div className="mb-4 px-4 py-2 rounded-lg text-sm bg-green-100 text-green-800">
              {success}
            </div>
          )}

          {/*
            Verification Form

            Contains the code input and submit button
          */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/*
              Code Input Field

              Features:
              - 6-digit numeric input
              - Monospace font for better readability
              - Center-aligned with wide letter spacing for visual separation
              - Auto-submits when 6 digits entered (see handleCodeChange)
              - Disabled when code expires to prevent invalid submissions
              - Auto-focuses on mount for immediate typing
              - inputMode="numeric" shows number pad on mobile
              - pattern="[0-9]{6}" provides HTML5 validation hint
              - autoComplete="one-time-code" triggers browser autofill from SMS
            */}
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
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground text-center text-lg font-mono tracking-widest placeholder-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />

            {/*
              Verify Button

              Manual submit button (also triggered automatically when 6 digits entered).
              States:
              - Disabled when less than 6 digits entered
              - Disabled when code has expired
              - Disabled during submission (loading)
              - Shows different text based on state
            */}
            <button
              type="submit"
              disabled={loading || isExpired || code.length !== 6}
              className="w-full bg-gradient-primary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : isExpired ? 'Code Expired' : 'Verify Email'}
            </button>
          </form>

          {/*
            Resend Code Section

            Allows user to request a new code if:
            - They didn't receive the first one
            - Code expired
            - Email was accidentally deleted
          */}
          <div className="mt-6">
            <p className="text-sm text-muted-foreground mb-2">
              Didn't receive the code?
            </p>

            {/*
              Resend Button

              Requests a new verification code to be sent.
              Shows loading state during resend operation.
            */}
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending}
              className="w-full px-6 py-3 border border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>

          {/*
            Back to Registration Link

            Allows user to go back and change their email if needed.
            Useful if they entered wrong email address.
          */}
          <Link
            to="/register"
            className="mt-6 inline-block text-sm text-primary hover:underline"
          >
            ← Back to Registration
          </Link>
        </div>
      </div>
    </div>
  );
}
