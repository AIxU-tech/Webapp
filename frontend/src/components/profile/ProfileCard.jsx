/**
 * ProfileCard Component
 *
 * A reusable card container for profile page sections.
 * Provides consistent styling for About, Skills, Interests, and similar sections.
 *
 * @component
 *
 * @example
 * <ProfileCard title="About">
 *   <p>User bio goes here...</p>
 * </ProfileCard>
 *
 * @example
 * // Without title
 * <ProfileCard>
 *   <CustomContent />
 * </ProfileCard>
 */

export default function ProfileCard({ title, children, className = '' }) {
  return (
    <div className={`bg-card border border-border rounded-lg p-6 shadow-card ${className}`}>
      {title && (
        <h2 className="text-xl font-semibold text-foreground mb-4">{title}</h2>
      )}
      {children}
    </div>
  );
}
