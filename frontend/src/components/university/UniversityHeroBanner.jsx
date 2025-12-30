/**
 * UniversityHeroBanner
 *
 * Compact hero section with campus background image, subtle rounded corners,
 * and gradient overlay. Minimal padding from screen edges.
 */

// Placeholder campus image
const CAMPUS_IMAGE = 'https://images.unsplash.com/photo-1562774053-701939374585?w=1920&q=80';

export default function UniversityHeroBanner() {
  return (
    <div className="px-1 pt-1">
      <div className="relative w-full h-56 overflow-hidden rounded-lg">
        {/* Background image */}
        <img
          src={CAMPUS_IMAGE}
          alt="University campus"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/25 to-black/10" />
      </div>
    </div>
  );
}
