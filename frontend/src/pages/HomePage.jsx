/**
 * HomePage Component
 *
 * Landing page for AIxU - AI Across Universities platform.
 * This page serves two purposes based on authentication status:
 *
 * 1. Non-authenticated users: Shows full landing page with value proposition
 * 2. Authenticated users: Automatically redirects to /community
 *
 * Design Features:
 * - Unified navigation bar (adapts based on auth state via NavBar component)
 * - Hero section with platform description
 * - Statistics showcasing platform growth
 * - Feature highlights explaining main capabilities
 *
 * @component
 */

import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NavBar from '../components/NavBar';

/**
 * SVG Icon Components
 *
 * Custom icons used throughout the landing page for visual appeal.
 */

const BrainCircuitIcon = () => (
  <svg
    className="h-12 w-12 text-white"
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

const FileTextIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const UsersIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const GlobeIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const MessageCircleIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);

export default function HomePage() {
  /**
   * Authentication State
   *
   * Get current authentication status from AuthContext.
   * This determines whether to show landing page or redirect.
   */
  const { isAuthenticated } = useAuth();

  /**
   * Set Page Title
   *
   * Updates the browser tab title when component mounts.
   */
  useEffect(() => {
    document.title = 'AIxU - AI Across Universities';
  }, []);

  /**
   * Redirect Authenticated Users
   *
   * If user is already logged in, redirect them to the community page.
   * This prevents authenticated users from seeing the landing page.
   */
  if (isAuthenticated) {
    return <Navigate to="/community" replace />;
  }

  /**
   * Landing Page Render
   *
   * Only shown to non-authenticated users.
   * Includes: navigation, hero section, statistics, and features.
   */
  return (
    <div className="min-h-screen bg-background">
      {/* =================================================================
          UNIFIED NAVIGATION BAR

          The NavBar component automatically adapts based on auth state.
          For unauthenticated users, it shows the logo and "Join AIxU" button.
          ================================================================= */}
      <NavBar />

      {/* =================================================================
          NAVBAR SPACER

          Since the navbar is fixed positioned, we need a spacer element
          to prevent content from being hidden behind it.
          ================================================================= */}
      <div className="h-16" aria-hidden="true" />

      {/*
        Hero Section

        Main landing page content with value proposition and call-to-action.
        Full-screen height to create strong first impression.
      */}
      <section className="min-h-screen flex items-center justify-center bg-background">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            {/*
              Hero Icon

              Large branded icon with gradient background.
              Visually represents AI/technology theme.
            */}
            <div className="mb-8 flex justify-center">
              <div className="w-24 h-24 bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] rounded-2xl flex items-center justify-center shadow-card">
                <BrainCircuitIcon />
              </div>
            </div>

            {/*
              Main Headline

              Clear value proposition with highlighted "Across" to emphasize
              the cross-university collaboration aspect.
            */}
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              AI <span className="text-academic-blue">Across</span> Universities
            </h1>

            {/*
              Subheadline

              Explains the platform's purpose and benefits.
              Encourages users to join the community.
            */}
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Connect with AI clubs worldwide. Share knowledge, collaborate on projects, and
              build the future of artificial intelligence together
            </p>

            {/*
              Primary Call-to-Action

              Large, prominent button encouraging sign-ups.
              Uses gradient styling to stand out and attract attention.
            */}
            <Link
              to="/register"
              className="bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-[hsl(220,85%,60%)]/30 transition-all duration-200 inline-block transform hover:-translate-y-0.5 mb-16"
            >
              Join AIxU Community
            </Link>

            {/*
              Platform Statistics

              Social proof showing platform growth and engagement.
              Displayed in a grid layout: 2 columns on mobile, 4 on desktop.
            */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto mt-16">
              {/* Number of Universities */}
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground">
                  50+
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Universities
                </div>
              </div>

              {/* Resources Shared */}
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground">
                  500+
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Resources Shared
                </div>
              </div>

              {/* Active Students */}
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground">
                  10K+
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Students
                </div>
              </div>

              {/* Monthly Events */}
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground">
                  100+
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Events Monthly
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*
        Features Section

        Highlights the four main features of the platform.
        Uses different background color to create visual separation.
      */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          {/*
            Section Header

            Introduces features section with benefit-focused headline.
          */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need to{' '}
              <span className="text-academic-blue">connect & collaborate</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Built for the academic AI community, by the academic AI community.
            </p>
          </div>

          {/*
            Features Grid

            2x2 grid of feature cards on desktop, stacked on mobile.
            Each card is clickable but currently most link to placeholders.
          */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/*
              Feature 1: Community Notes Board

              Share research notes, papers, and technical resources.
              TODO: Link to /community once implemented.
            */}
            <div className="bg-card p-8 rounded-xl shadow-card border border-border hover:shadow-hover transition-all duration-300 group">
              {/* Icon Container */}
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-6 group-hover:bg-academic-blue/10 transition-all duration-300">
                <div className="text-foreground group-hover:text-academic-blue transition-all duration-300">
                  <FileTextIcon />
                </div>
              </div>

              {/* Feature Title */}
              <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-academic-blue transition-all duration-300">
                Community Notes Board
              </h3>

              {/* Feature Description */}
              <p className="text-muted-foreground">
                Share collaborative notes, technical resources, and AI tools with students
                worldwide.
              </p>
            </div>

            {/*
              Feature 2: University Connections

              Browse and join AI clubs from universities around the world.
              TODO: Link to /universities once implemented.
            */}
            <div className="bg-card p-8 rounded-xl shadow-card border border-border hover:shadow-hover transition-all duration-300 group">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-6 group-hover:bg-academic-blue/10 transition-all duration-300">
                <div className="text-foreground group-hover:text-academic-blue transition-all duration-300">
                  <UsersIcon />
                </div>
              </div>

              <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-academic-blue transition-all duration-300">
                University Connections
              </h3>

              <p className="text-muted-foreground">
                Dedicated pages for each university with club events, projects, and hackathon
                materials.
              </p>
            </div>

            {/*
              Feature 3: Global News & Events

              Stay updated with AI events, competitions, and speaker sessions.
              TODO: Implement events/news page.
            */}
            <div className="bg-card p-8 rounded-xl shadow-card border border-border hover:shadow-hover transition-all duration-300 group">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-6 group-hover:bg-academic-blue/10 transition-all duration-300">
                <div className="text-foreground group-hover:text-academic-blue transition-all duration-300">
                  <GlobeIcon />
                </div>
              </div>

              <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-academic-blue transition-all duration-300">
                Global News & Events
              </h3>

              <p className="text-muted-foreground">
                Stay updated with AI club events, speaker sessions, and competitions worldwide.
              </p>
            </div>

            {/*
              Feature 4: Direct Messaging

              Private messaging to connect with other students.
              TODO: Link to /messages once implemented.
            */}
            <div className="bg-card p-8 rounded-xl shadow-card border border-border hover:shadow-hover transition-all duration-300 group">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-6 group-hover:bg-academic-blue/10 transition-all duration-300">
                <div className="text-foreground group-hover:text-academic-blue transition-all duration-300">
                  <MessageCircleIcon />
                </div>
              </div>

              <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-academic-blue transition-all duration-300">
                Direct Messaging
              </h3>

              <p className="text-muted-foreground">
                Connect with like-minded students through our secure messaging system.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
