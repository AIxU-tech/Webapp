/**
 * ProfileSidebar
 *
 * Container component for all sidebar cards. Sticky positioning
 * keeps the sidebar visible while scrolling through the main content.
 */

import ActivityCard from './ActivityCard';
import AIClubsCard from './AIClubsCard';
import SkillsCard from './SkillsCard';

export default function ProfileSidebar({ user, university, isOwnProfile, onSaveSkills }) {
  // Extract relevant data from user object
  const {
    skills = [],
    recent_activity = [],
  } = user || {};

  // User role at university (default to 0 = member)
  const universityRole = user?.university_role || 0;

  return (
    <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
      <ActivityCard
        activities={recent_activity}
        isOwnProfile={isOwnProfile}
      />

      <AIClubsCard
        universityName={user?.university}
        universityId={university?.id}
        universityLogoUrl={university?.logoUrl || null}
        role={universityRole}
      />

      <SkillsCard
        skills={skills}
        isOwnProfile={isOwnProfile}
        onSave={onSaveSkills}
      />
    </aside>
  );
}
