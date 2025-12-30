/**
 * UniversityAboutTab
 *
 * Displays university description and detailed information.
 */

export default function UniversityAboutTab({ university }) {
  const { description, location, memberCount = 0 } = university;

  return (
    <div className="space-y-8">
      {/* About Section */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-3">About</h3>
        <p className="text-muted-foreground leading-relaxed">
          {description || 'No description available.'}
        </p>
      </section>

      {/* Details */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-3">Details</h3>
        <dl className="space-y-3">
          <div className="flex gap-2">
            <dt className="text-muted-foreground min-w-32">Location:</dt>
            <dd className="text-foreground">{location || 'Not specified'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground min-w-32">Total Members:</dt>
            <dd className="text-foreground">{memberCount}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
