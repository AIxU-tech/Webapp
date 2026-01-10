/**
 * UniversityCard Component
 *
 * Displays a university card with name, location, club info, and stats.
 */

import { useNavigate } from 'react-router-dom';
import { Card, StatItem, SecondaryButton } from './ui';
import { AcademicCapIcon } from './icons';
import { GRADIENT_PRIMARY } from '../config/styles';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';

export default function UniversityCard({ university }) {
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
    <Card>
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

        {/* Gradient icon badge */}
        <div
          className={`w-12 h-12 ${GRADIENT_PRIMARY} rounded-lg flex items-center justify-center flex-shrink-0 ml-3`}
        >
          <AcademicCapIcon className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* Club Information */}
      <div className="mb-4">
        <h4 className="font-semibold text-foreground mb-2">
          {university.clubName || `${university.name} AI Club`}
        </h4>
        <p className="text-muted-foreground text-sm line-clamp-2">
          {university.description ||
            'Join our AI community to collaborate on exciting projects and learn together.'}
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
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
