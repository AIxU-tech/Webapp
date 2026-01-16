/**
 * UniversityHeroBanner
 *
 * Compact hero section with campus background image, subtle rounded corners,
 * and gradient overlay. Supports custom banner uploads with edit button.
 *
 * @param {object} university - University data with banner URL
 * @param {boolean} canEdit - Whether to show edit button
 * @param {function} onEditBanner - Callback when edit button clicked
 * @param {string} bannerPreviewUrl - Optimistic preview URL during upload
 * @param {number} bannerKey - Cache-busting key (timestamp) for banner URL
 */

import { BannerImage } from '../ui';
import { getUniversityBannerUrl } from '../../api/universities';

// Default campus image
const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1562774053-701939374585?w=1920&q=80';

export default function UniversityHeroBanner({
  university,
  canEdit = false,
  onEditBanner,
  bannerPreviewUrl,
  bannerKey,
}) {
  // Use preview URL for optimistic update, otherwise construct URL with cache-buster
  const bannerUrl = bannerPreviewUrl ||
    (university?.hasBanner ? getUniversityBannerUrl(university.id, bannerKey) : null);

  return (
    <div className="px-1 pt-1">
      <BannerImage
        imageUrl={bannerUrl}
        defaultImage={DEFAULT_BANNER}
        canEdit={canEdit}
        onEdit={onEditBanner}
        height="h-56"
        rounded="rounded-lg"
        hasOverlay={true}
        altText={`${university?.name || 'University'} campus`}
      />
    </div>
  );
}
