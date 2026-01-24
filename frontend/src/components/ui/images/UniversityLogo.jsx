import { useState, useEffect } from 'react';
import { UniversitiesIcon } from '../../icons';
import { getUniversityLogoUrl } from '../../../api/universities';

/**
 * Size variants mapping to Tailwind classes
 * sm: 32px, md: 48px, lg: 80px
 */
const SIZES = {
  sm: { container: 'w-8 h-8', icon: 'h-4 w-4' },
  md: { container: 'w-12 h-12', icon: 'h-6 w-6' },
  lg: { container: 'w-20 h-20', icon: 'h-10 w-10' },
};

/**
 * Shape variants for different contexts
 */
const SHAPES = {
  circle: 'rounded-full',
  rounded: 'rounded-lg',
};

/**
 * Reusable UniversityLogo component with automatic fallback to gradient + icon
 *
 * Displays a university/club logo if available, otherwise shows a gradient
 * background with a university icon.
 *
 * @param {Object} props
 * @param {Object} props.university - University object with id, hasLogo, name, clubName
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Logo size variant
 * @param {'circle'|'rounded'} [props.shape='rounded'] - Logo shape variant
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {number} [props.cacheKey] - Optional cache-busting key (timestamp)
 *
 * @example
 * // In a card (rounded square)
 * <UniversityLogo university={university} size="md" shape="rounded" />
 *
 * // In a profile (circle)
 * <UniversityLogo university={university} size="lg" shape="circle" />
 */
export default function UniversityLogo({
  university,
  size = 'md',
  shape = 'rounded',
  className = '',
  cacheKey,
}) {
  const [imgError, setImgError] = useState(false);

  const { id, hasLogo, name, clubName } = university || {};
  const imageUrl = hasLogo ? getUniversityLogoUrl(id, cacheKey) : null;

  // Reset error state when image URL changes
  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const sizeConfig = SIZES[size] || SIZES.md;
  const shapeClass = SHAPES[shape] || SHAPES.rounded;
  const altText = `${clubName || name || 'University'} logo`;

  const showImage = imageUrl && !imgError;

  return (
    <div
      className={`${sizeConfig.container} ${shapeClass} overflow-hidden bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] flex items-center justify-center flex-shrink-0 ${className}`}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={altText}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <UniversitiesIcon className={`${sizeConfig.icon} text-white`} />
      )}
    </div>
  );
}
