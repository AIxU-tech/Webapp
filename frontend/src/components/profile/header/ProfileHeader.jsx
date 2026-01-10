/**
 * ProfileHeader
 *
 * Card-based profile header with banner image inside the card,
 * overlapping avatar, user info, and action buttons.
 * Stats are intentionally omitted - they appear in the sidebar.
 */

import { useNavigate } from 'react-router-dom';
import { GradientButton, SecondaryButton, Avatar } from '../../ui';
import {
  UniversitiesIcon,
  MapPinIcon,
  ExternalLinkIcon,
  EditIcon,
  LogOutIcon,
  MessageCircleIcon,
} from '../../icons';

// Import banner image directly
import bannerImage from './images/default-profile-banner.jpg';

export default function ProfileHeader({
  user,
  isOwnProfile,
  onEditProfile,
  onLogout,
  onMessage,
}) {
  const navigate = useNavigate();

  // Compose headline from university
  const headline = user?.university ? `AI Researcher · ${user.university}` : 'AI Enthusiast';

  const handleMessage = () => {
    if (onMessage) {
      onMessage();
    } else {
      navigate(`/messages?user=${user?.id}`);
    }
  };

  return (
    <div className="relative">
      {/* Banner image - extends to component edges */}
      <div className="relative h-32 sm:h-40 rounded-t-2xl overflow-hidden">
        <img
          src={bannerImage}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content area */}
      <div className="relative bg-card rounded-b-2xl border border-t-0 border-border p-6 pt-16 sm:pt-20">
        {/* Avatar - overlaps banner, no glow */}
        <div className="absolute -top-14 sm:-top-16 left-6">
          <Avatar
            user={user}
            size="xl"
            className="sm:w-28 sm:h-28 sm:text-3xl border-4 border-card"
            alt={user?.full_name || 'User'}
          />
        </div>

        {/* Name row with edit button */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              {user?.full_name || 'Unknown User'}
            </h1>
            <p className="text-base text-muted-foreground">{headline}</p>
          </div>

          {/* Action buttons - rounded-full style */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOwnProfile ? (
              <SecondaryButton
                variant="outline"
                onClick={onEditProfile}
                className="rounded-full"
              >
                Edit Profile
              </SecondaryButton>
            ) : (
              <>
                <GradientButton className="rounded-full">Connect</GradientButton>
                <SecondaryButton
                  variant="outline"
                  onClick={handleMessage}
                  className="rounded-full"
                  icon={<MessageCircleIcon className="h-4 w-4" />}
                />
              </>
            )}
          </div>
        </div>

        {/* Meta info row */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {/* University with gradient icon */}
          {user?.university && (
            <span className="flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1 rounded-full">
              <UniversitiesIcon className="w-3.5 h-3.5 text-primary" />
              <span className="text-foreground">{user.university}</span>
            </span>
          )}

          {/* Location - no background */}
          {user?.location && (
            <span className="flex items-center gap-1.5">
              <MapPinIcon className="w-3.5 h-3.5" />
              {user.location}
            </span>
          )}

          {/* Website link */}
          {user?.website_url && (
            <a
              href={user.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary hover:underline"
            >
              <ExternalLinkIcon className="w-3.5 h-3.5" />
              Portfolio
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
