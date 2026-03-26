/**
 * BannerImage Component
 *
 * Reusable banner display component with optional edit button overlay.
 * Used by both ProfileHeader and UniversityHeroBanner.
 *
 * @param {string} imageUrl - URL of the banner image (or null for default)
 * @param {string} defaultImage - Fallback image URL or import
 * @param {boolean} canEdit - Whether to show edit button
 * @param {function} onEdit - Callback when edit button clicked
 * @param {string} height - Tailwind height class (e.g., "h-32 sm:h-40")
 * @param {string} rounded - Tailwind rounded class (e.g., "rounded-t-2xl")
 * @param {boolean} hasOverlay - Whether to show gradient overlay
 * @param {string} altText - Alt text for the image
 * @param {string} className - Additional classes for the container
 */

import { useState } from 'react';
import { CameraIcon } from '../../icons';

const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1562774053-701939374585?w=1920&q=80';

export default function BannerImage({
  imageUrl,
  defaultImage,
  canEdit = false,
  onEdit,
  height = 'h-32 sm:h-40',
  rounded = 'rounded-t-2xl',
  hasOverlay = false,
  altText = 'Banner image',
  className = '',
}) {
  const [imgError, setImgError] = useState(false);

  // Use custom banner if available and no error, otherwise use default
  const showCustomBanner = imageUrl && !imgError;
  const displayUrl = showCustomBanner ? imageUrl : (defaultImage || DEFAULT_BANNER);

  return (
    <div className={`relative ${height} ${className}`}>
      {/* Image container with overflow-hidden for clipping to rounded corners */}
      <div className={`absolute inset-0 ${rounded} overflow-hidden`}>
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={altText}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)]" />
        )}

        {hasOverlay && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/25 to-black/10" />
        )}
      </div>

      {/* Buttons outside overflow-hidden container so click area isn't clipped */}
      {/* z-20 ensures button is above overlapping elements like UniversityIdentityBar (z-10) */}
      {canEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="absolute bottom-4 right-4 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer z-20"
          aria-label="Edit banner image"
        >
          <CameraIcon size="md" />
        </button>
      )}
    </div>
  );
}
