/**
 * SpeakerImage Component
 *
 * Displays a speaker's image with graceful fallback to a gradient + initials
 * placeholder when no image is available or the image fails to load.
 */

import { useState, useEffect } from 'react';
import { getInitialsFromName, getAvatarGradient } from '../../utils/avatar';

const SIZES = {
  sm: 'w-12 h-12 text-sm',
  md: 'w-16 h-16 text-lg',
  lg: 'w-32 h-32 text-3xl',
};

export default function SpeakerImage({ imageUrl, name, className = '', size = 'md' }) {
  const [imgError, setImgError] = useState(false);

  // Reset error state when image URL changes
  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const initials = getInitialsFromName(name);
  const gradientClass = getAvatarGradient(null, name);
  const sizeClass = SIZES[size] || SIZES.md;
  const showImage = imageUrl && !imgError;

  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={name || 'Speaker'}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
