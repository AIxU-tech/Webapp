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
  const { name, clubName, socialLinks, logoUrl } = university;
  const displayName = name?.trim() || clubName?.trim() || 'University';

  return (
    <div className="relative z-10 -mt-6 md:-mt-8">
      <div className="container mx-auto max-w-full px-3 sm:px-4">
        <div className="bg-card/100 border border-border rounded-lg shadow-md p-4 sm:p-6 flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          {/* Logo + title: on mobile, only these compete for width — keeps the name visible */}
          <div className="flex min-w-0 flex-1 gap-3 sm:gap-4 md:items-center">
            <UniversityLogo
              university={university}
              size="lg"
              shape="circle"
              className="h-16 w-16 shrink-0 border-4 border-card shadow-lg sm:h-20 sm:w-20 md:-mt-12"
            />
            <div className="min-w-0 flex-1 pt-0.5 md:pt-0">
              <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                <h1 className="text-xl font-bold leading-tight text-foreground sm:text-2xl break-words [overflow-wrap:anywhere]">
                  {displayName}
                </h1>
                {canEdit && (
                  <IconButton
                    icon={EditIcon}
                    onClick={onEdit}
                    variant="ghost"
                    size="md"
                    label="Edit club identity"
                    className="shrink-0"
                  />
                )}
              </div>
              {clubName && clubName !== displayName && (
                <p className="mt-1 text-sm text-muted-foreground break-words [overflow-wrap:anywhere]">
                  {clubName}
                </p>
              )}
            </div>
          </div>

          {/* Actions: full-width row on mobile so socials wrap instead of squeezing the title */}
          <div className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-2 border-t border-border/70 pt-3 md:w-auto md:shrink-0 md:gap-3 md:border-t-0 md:pt-0">
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
            {socialLinks && socialLinks.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`shrink-0 rounded-lg p-1.5 transition-colors hover:bg-muted sm:p-2 ${PLATFORM_ICON_COLORS[link.type] || 'text-muted-foreground'}`}
                    title={getPlatformDisplayName(link.type)}
                    aria-label={`${getPlatformDisplayName(link.type)} (opens in new window)`}
                  >
                    <SocialLinkIcon type={link.type} size="md" logoUrl={logoUrl} />
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
