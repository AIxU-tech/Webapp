/**
 * HomePage Component
 *
 * Landing page for AIxU - AI Across Universities platform.
 * Redirects authenticated users to /community, shows landing page to others.
 */

import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks';
import { NavBar, Footer } from '../components/layout';
import { FeatureCard } from '../components/home';
import { GradientButton, StatItem } from '../components/ui';
import { GRADIENT_PRIMARY } from '../config/styles';
import { api } from '../api/client';
import {
  BrainCircuitIcon,
  FileTextIcon,
  UsersIcon,
  GlobeIcon,
  MessageCircleIcon,
} from '../components/icons';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Rounds a number down to its leading digit and appends "+".
 * e.g. 21 → "20+", 523 → "500+", 1234 → "1,000+"
 */
function formatStat(n) {
  if (n < 10) return `${n}+`;
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)));
  const rounded = Math.floor(n / magnitude) * magnitude;
  return `${rounded.toLocaleString()}+`;
}

// =============================================================================
// DATA DEFINITIONS
// =============================================================================

/**
 * Feature highlights with icons and descriptions
 */
const FEATURES = [
  {
    icon: FileTextIcon,
    title: 'Community Notes Board',
    description:
      'Share collaborative notes, technical resources, and AI tools with students worldwide.',
    to: '/community',
  },
  {
    icon: UsersIcon,
    title: 'University Connections',
    description:
      'Dedicated pages for each university with club events, projects, and hackathon materials.',
    to: '/universities',
  },
  {
    icon: GlobeIcon,
    title: 'Global News & Events',
    description:
      'Stay updated with AI club events, speaker sessions, and competitions worldwide.',
    to: '/news',
  },
  {
    icon: MessageCircleIcon,
    title: 'Direct Messaging',
    description:
      'Connect with like-minded students through our secure messaging system.',
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function HomePage() {
  const { isAuthenticated, isReturningUser } = useAuth();

  usePageTitle('AI Across Universities');

  const { data: stats } = useQuery({
    queryKey: ['platformStats'],
    queryFn: () => api.get('/stats'),
    staleTime: 5 * 60 * 1000,
  });

  // Redirect authenticated users to community
  if (isAuthenticated) {
    return <Navigate to="/community" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavBar />

      {/* Navbar spacer (navbar is fixed positioned) */}
      <div className="h-16" aria-hidden="true" />

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center bg-background">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            {/* Hero icon with gradient background */}
            <div className="mb-8 flex justify-center">
              <div
                className={`w-24 h-24 ${GRADIENT_PRIMARY} rounded-2xl flex items-center justify-center shadow-card`}
              >
                <BrainCircuitIcon className="h-12 w-12 text-white" />
              </div>
            </div>

            {/* Main headline */}
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              AI <span className="text-academic-blue">Across</span> Universities
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Connect with AI clubs worldwide. Share knowledge, collaborate on
              projects, and build the future of artificial intelligence together
            </p>

            {/* Primary CTA */}
            <GradientButton
              as={Link}
              to={isReturningUser ? '/login' : '/register'}
              size="lg"
              className="mb-16"
            >
              {isReturningUser ? 'Log In to AIxU' : 'Join AIxU Community'}
            </GradientButton>

            {/* Platform statistics */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto mt-16">
                <StatItem value={formatStat(stats.universities)} label="Universities" size="lg" />
                <StatItem value={formatStat(stats.resources)} label="Resources Shared" size="lg" />
                <StatItem value={formatStat(stats.students)} label="Students" size="lg" />
                <StatItem value={formatStat(stats.events)} label="Events" size="lg" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need to{' '}
              <span className="text-academic-blue">connect & collaborate</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Built for the academic AI community, by the academic AI community.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {FEATURES.map((feature) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                to={feature.to}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
