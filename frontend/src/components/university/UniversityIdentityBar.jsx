/**
 * UniversityIdentityBar
 *
 * Floating card positioned below the hero banner with university avatar,
 * name, and action buttons. Slight translucency for modern look.
 */

import { UniversitiesIcon, ExternalLinkIcon } from '../icons';
import { SecondaryButton } from '../ui';

export default function UniversityIdentityBar({
  university,
  isAdmin,
  onDelete,
  deleteLoading,
}) {
  const { name, clubName, websiteUrl } = university;

  return (
    <div className="relative -mt-8 z-10">
      <div className="container mx-auto px-4">
        {/* Card with slight translucency */}
        <div className="bg-card/100 border border-border rounded-lg shadow-md p-6 flex items-center gap-6">
          {/* University Avatar */}
          <div className="w-20 h-20 rounded-full border-4 border-card bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] flex items-center justify-center -mt-12 shadow-lg flex-shrink-0">
            <UniversitiesIcon className="h-10 w-10 text-white" />
          </div>

          {/* University Name */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">
              {name}
            </h1>
            {clubName && clubName !== name && (
              <p className="text-sm text-muted-foreground">
                {clubName}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-shrink-0">
            {/* Website button - enabled when URL exists */}
            {websiteUrl ? (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <SecondaryButton
                  variant="outline"
                  icon={<ExternalLinkIcon className="h-4 w-4" />}
                >
                  Website
                </SecondaryButton>
              </a>
            ) : (
              <SecondaryButton
                variant="outline"
                icon={<ExternalLinkIcon className="h-4 w-4" />}
                disabled
                title="No website available"
              >
                Website
              </SecondaryButton>
            )}

            {/* Delete button - admin only */}
            {isAdmin && (
              <SecondaryButton
                variant="danger"
                onClick={onDelete}
                loading={deleteLoading}
                loadingText="Deleting..."
              >
                Delete
              </SecondaryButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
