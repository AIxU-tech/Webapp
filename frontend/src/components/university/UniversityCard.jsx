/**
 * UniversityCard Component
 *
 * Displays a university card with name, location, club info, and stats.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, StatItem, SecondaryButton, UniversityLogo } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthModal } from '../../contexts/AuthModalContext';

export default function UniversityCard({ university }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();

  const handleViewUniversity = (e) => {
    if (!isAuthenticated) {
      e.preventDefault();
      openAuthModal();
      return;
    }
    navigate(`/universities/${university.id}`);
  };

  return (
    <Card className="h-full flex flex-col">
      {/* Header - Name, Location, and Icon */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-foreground truncate">
            {university.name}
          </h3>
          <p className="text-muted-foreground truncate">
            {university.location}
          </p>
        </div>

        {/* University Logo */}
        <UniversityLogo university={university} size="md" shape="rounded" className="ml-3" />
      </div>

      {/* Club Information */}
      <div className="mb-4">
        <h4 className="font-semibold text-foreground mb-2">
          {university.clubName || `${university.name} AI Club`}
        </h4>
        <p
          className={`text-muted-foreground text-sm ${!isExpanded ? 'line-clamp-2' : ''
            }`}
        >
          {university.description ||
            'Join our AI community to collaborate on exciting projects and learn together.'}
        </p>
        {university.description && university.description.length > 100 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-primary text-sm font-medium hover:text-primary/80 transition-colors mt-1 cursor-pointer"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6 mt-auto">
        <StatItem value={university.memberCount || 0} label="Members" size="sm" />
        <StatItem value={university.recentPosts || 0} label="Posts" size="sm" />
        <StatItem value={university.upcomingEvents || 0} label="Events" size="sm" />
      </div>

      {/* View University Button */}
      <SecondaryButton
        onClick={handleViewUniversity}
        variant="primary"
        className="w-full"
      >
        View University
      </SecondaryButton>
    </Card>
  );
}
