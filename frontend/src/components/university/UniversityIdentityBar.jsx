/**
 * UniversityIdentityBar
 *
 * Floating card positioned below the hero banner with university avatar,
 * name, and action buttons. Slight translucency for modern look.
 */

import { EditIcon, SocialLinkIcon, AdminIcon } from '../icons';
import { IconButton, SecondaryButton, UniversityLogo } from '../ui';
import { getPlatformDisplayName, PLATFORM_ICON_COLORS } from '../../utils/socialLinks';

export default function UniversityIdentityBar({
  university,
  canEdit,
  onEdit,
  canManageMembers = false,
  onExecutivePortal,
}) {
  const { id, name, clubName, socialLinks, hasLogo, logoUrl } = university;

  return (
    <div className="relative -mt-8 z-10">
      <div className="container mx-auto px-4">
        {/* Card with slight translucency */}
        <div className="bg-card/100 border border-border rounded-lg shadow-md p-6 flex items-center gap-6">
          {/* University Avatar/Logo */}
          <UniversityLogo
            university={university}
            size="lg"
            shape="circle"
            className="border-4 border-card -mt-12 shadow-lg"
          />

          {/* University Name */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground truncate">
                {name}
              </h1>
              {canEdit && (
                <IconButton
                  icon={EditIcon}
                  onClick={onEdit}
                  variant="ghost"
                  size="md"
                  label="Edit club identity"
                />
              )}
            </div>
            {clubName && clubName !== name && (
              <p className="text-sm text-muted-foreground">
                {clubName}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {canManageMembers && university?.id && onExecutivePortal && (
              <SecondaryButton
                variant="outline"
                size="sm"
                onClick={onExecutivePortal}
                icon={<AdminIcon className="h-4 w-4" />}
                className="whitespace-nowrap"
              >
                Executive Portal
              </SecondaryButton>
            )}
            {/* Social Links - display as icon buttons */}
            {socialLinks && socialLinks.length > 0 && (
              <div className="flex items-center gap-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2 rounded-lg hover:bg-muted transition-colors ${PLATFORM_ICON_COLORS[link.type] || 'text-muted-foreground'}`}
                    title={getPlatformDisplayName(link.type)}
                    aria-label={`${getPlatformDisplayName(link.type)} (opens in new window)`}
                  >
                    <SocialLinkIcon type={link.type} size="lg" logoUrl={logoUrl} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
