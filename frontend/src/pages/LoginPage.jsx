/**
 * LoginPage Component
 *
 * User login page with animated plasma background.
 * Allows users to log in with email and password.
 *
 * Features:
 * - Animated plasma background using Three.js
 * - Form validation
 * - Integration with Flask backend authentication
 * - Redirects to home page on successful login
 * - Error handling and display
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { login } from '../api/auth';
import PlasmaBackground from '../components/PlasmaBackground';

/**
 * Lucide Icon Components
 *
 * Simple SVG icons for the UI. Using inline SVG instead of
 * a library to keep dependencies minimal and performance high.
 */
const BrainIcon = () => (
  <svg
    className="h-6 w-6 text-white"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    className="h-4 w-4 ml-1"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default function LoginPage() {
  /**
   * Component State
   *
   * - email: Input field value for email
   * - password: Input field value for password
   * - error: Error message to display (if any)
   * - loading: Whether form is currently submitting
   */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Hooks
   *
   * - navigate: React Router function to programmatically navigate
   * - loginUser: Function from AuthContext to update auth state
   */
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  /**
   * Set Page Title
   *
   * Updates the browser tab title when component mounts.
   * Empty dependency array [] means this runs once on mount.
   */
  useEffect(() => {
    document.title = 'Login - AIxU';
  }, []);

  /**
   * Form Submission Handler
   *
   * Validates input, calls login API, updates auth context,
   * and redirects on success.
   *
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    // Prevent default form submission (which would reload the page)
    e.preventDefault();

    // Clear any previous errors
    setError('');

    // Validate inputs
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    // Set loading state to disable form during submission
    setLoading(true);

    try {
      /**
       * Call Login API
       *
       * Sends credentials to Flask backend.
       * Backend sets session cookie on success and returns user data.
       */
      const response = await login(email.trim(), password.trim());

      /**
       * Update Auth Context
       *
       * Update global auth state with the user data returned from login.
       * This makes user info available throughout the app via AuthContext.
       */
      loginUser(response.user);

      /**
       * Redirect to Home
       *
       * On successful login, navigate to the home page.
       * replace: true means user can't go "back" to login page.
       */
      navigate('/', { replace: true });

    } catch (err) {
      /**
       * Handle Errors
       *
       * Display error message from API or generic fallback.
       * Error might be: invalid credentials, network error, etc.
       */
      setError(err.message || 'Invalid email or password');
    } finally {
      /**
       * Reset Loading State
       *
       * Re-enable form whether request succeeded or failed.
       */
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden no-scrollbar">
      {/*
        Plasma Background Component

        Renders animated gradient background with radial whitecast
        effect to highlight the login card.
      */}
      <PlasmaBackground
        variant="fullscreen"
        radialWhitecast={true}
        cardRadius={0.35}
      />

      {/*
        Login Form Container

        Positioned above the plasma background (z-10).
        Centered vertically and horizontally.
      */}
      <div className="relative z-10 w-full max-w-md px-6 py-12">

        {/*
          Login Card

          White card with border, rounded corners, and shadow.
          Contains logo, heading, form, and legal text.
        */}
        <div className="bg-card border border-border rounded-xl shadow-card p-8">

          {/*
            Logo and Header Section

            AIxU branding with icon and tagline.
          */}
          <div className="text-center mb-8">
            {/* Logo */}
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mr-3">
                <BrainIcon />
              </div>
              <span className="text-2xl font-bold text-foreground">AIxU</span>
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-bold text-foreground mb-3">
              Your ideas, amplified
            </h1>

            {/* Subtitle */}
            <p className="text-muted-foreground text-lg">
              Privacy-first AI community that helps you create in confidence.
            </p>
          </div>

          {/*
            Error Message Display

            Shows error message if login fails.
            Only rendered when error state is not empty.
          */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/*
            Login Form

            Two input fields (email, password) and submit button.
            Calls handleSubmit on form submission.
          */}
          <form className="space-y-4" onSubmit={handleSubmit}>

            {/* Email Input */}
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            />

            {/* Password Input */}
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            />

            {/*
              Submit Button

              Shows "Logging in..." when loading.
              Disabled during submission to prevent double-submits.
            */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-primary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          {/*
            Register Link

            Directs users who don't have an account to the registration page.
          */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>

          {/*
            Legal Text

            Links to Terms of Service and Privacy Policy.
            Currently placeholder links (#).
          */}
          <p className="text-xs text-muted-foreground mt-6 text-center leading-relaxed">
            By continuing, you agree to AIxU's{' '}
            <a href="#" className="text-primary hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary hover:underline">
              Privacy Policy
            </a>
            .
          </p>

          {/*
            Learn More Button

            Placeholder for additional information.
            Could expand to show more details about AIxU.
          */}
          <div className="text-center mt-6">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center justify-center mx-auto"
              onClick={() => alert('Learn more functionality coming soon!')}
            >
              Learn more
              <ChevronDownIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
