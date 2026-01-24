/**
 * HomePage Component
 *
 * Landing page for AIxU - AI Across Universities platform.
 * Redirects authenticated users to /community, shows landing page to others.
 */

import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks';
import { NavBar, Footer } from '../components/layout';
import { FeatureCard } from '../components/home';
import { GradientButton, StatItem } from '../components/ui';
import { GRADIENT_PRIMARY } from '../config/styles';
import {
  BrainCircuitIcon,
  FileTextIcon,
  UsersIcon,
  GlobeIcon,
  MessageCircleIcon,
} from '../components/icons';

// =============================================================================
// DATA DEFINITIONS
// =============================================================================

/**
 * Platform statistics displayed in the hero section
 */
const STATS = [
  { value: '50+', label: 'Universities' },
  { value: '500+', label: 'Resources Shared' },
  { value: '10K+', label: 'Students' },
  { value: '100+', label: 'Events Monthly' },
];

/**
 * Feature highlights with icons and descriptions
 */
const FEATURES = [
  {
    icon: FileTextIcon,
    title: 'Community Notes Board',
    description:
      'Share collaborative notes, technical resources, and AI tools with students worldwide.',
  },
  {
    icon: UsersIcon,
    title: 'University Connections',
    description:
      'Dedicated pages for each university with club events, projects, and hackathon materials.',
  },
  {
    icon: GlobeIcon,
    title: 'Global News & Events',
    description:
      'Stay updated with AI club events, speaker sessions, and competitions worldwide.',
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
  const { isAuthenticated } = useAuth();

  usePageTitle('AI Across Universities');

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
              to="/register"
              size="lg"
              className="mb-16"
            >
              Join AIxU Community
            </GradientButton>

            {/* Platform statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto mt-16">
              {STATS.map((stat) => (
                <StatItem key={stat.label} value={stat.value} label={stat.label} size="lg" />
              ))}
            </div>
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
