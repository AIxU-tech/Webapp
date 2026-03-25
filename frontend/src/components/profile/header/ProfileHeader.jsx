/**
 * ProfileHeader
 *
 * Card-based profile header with banner image inside the card,
 * overlapping avatar, user info, and action buttons.
 * Stats are intentionally omitted - they appear in the sidebar.
 */

import { SecondaryButton, Avatar, BannerImage } from '../../ui';
import {
  MapPinIcon,
  ExternalLinkIcon,
  MessagesIcon,
  LogOutIcon,
  SocialLinkIcon,
} from '../../icons';
import { getProfileBannerUrl } from '../../../api/users';
import { getPlatformDisplayName, PLATFORM_ICON_COLORS } from '../../../utils/socialLinks';

// Import default banner image
import defaultBannerImage from './images/default-profile-banner.jpg';

export default function ProfileHeader({
  user,
  universityLocation,
  isOwnProfile,
  onEditProfile,
  onLogout,
  onMessage,
  onEditBanner,
  bannerPreviewUrl,
  bannerKey,
}) {
  // Compose headline: custom headline > "Student at University" > null
  const headline = user?.headline
    || (user?.university ? `Student at ${user.university}` : null);

  // Location with university fallback
  const displayLocation = user?.location || universityLocation;

  // Determine banner URL - use preview for optimistic update, otherwise construct URL with cache-buster
  const bannerUrl = bannerPreviewUrl ||
    (user?.hasBanner ? getProfileBannerUrl(user.id, bannerKey) : null);

  return (
    <div className="relative">
      {/* Banner image with edit overlay */}
      <BannerImage
        imageUrl={bannerUrl}
        defaultImage={defaultBannerImage}
        canEdit={isOwnProfile}
        onEdit={onEditBanner}
        height="h-32 sm:h-40"
        rounded="rounded-t-2xl"
        altText={`${user?.full_name || 'User'}'s banner`}
      />

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
            {headline && (
              <p className="text-base text-muted-foreground">{headline}</p>
            )}
          </div>

          {/* Action buttons - rounded-full style */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOwnProfile ? (
              <>
                <SecondaryButton
                  variant="outline"
                  onClick={onEditProfile}
                  className="rounded-full"
                >
                  Edit Profile
                </SecondaryButton>
                <SecondaryButton
                  variant="outline"
                  onClick={onLogout}
                  className="rounded-full"
                  icon={<LogOutIcon size="sm" />}
                >
                  Log Out
                </SecondaryButton>
              </>
            ) : (
              <button
                onClick={onMessage}
                title="Send message"
                className="p-2.5 rounded-full border border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <MessagesIcon size="md" />
              </button>
            )}
          </div>
        </div>

        {/* Meta info row */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          {/* Left side: Location, Website */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Location - no background */}
            {displayLocation && (
              <span className="flex items-center gap-1.5">
                <MapPinIcon className="w-3.5 h-3.5" />
                {displayLocation}
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

          {/* Right side: Social Links */}
          {user?.socialLinks && user.socialLinks.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {user.socialLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-lg hover:bg-muted transition-colors ${PLATFORM_ICON_COLORS[link.type] || 'text-muted-foreground'}`}
                  title={getPlatformDisplayName(link.type)}
                  aria-label={`${getPlatformDisplayName(link.type)} (opens in new window)`}
                >
                  <SocialLinkIcon type={link.type} size="lg" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
