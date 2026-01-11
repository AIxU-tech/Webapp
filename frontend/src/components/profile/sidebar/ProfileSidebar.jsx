/**
 * ProfileSidebar
 *
 * Container component for all sidebar cards. Sticky positioning
 * keeps the sidebar visible while scrolling through the main content.
 */

import ActivityCard from './ActivityCard';
import AIClubsCard from './AIClubsCard';
import SkillsCard from './SkillsCard';

export default function ProfileSidebar({ user, isOwnProfile, onEditSkills }) {
  // Extract relevant data from user object
  const {
    id,
    university,
    university_id,
    skills = [],
    recent_activity = [],
    followers = [],
  } = user || {};

  // User role at university (default to 0 = member)
  const universityRole = user?.university_role || 0;

  return (
    <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
      <ActivityCard
        userId={id}
        activities={recent_activity}
        connections={followers}
        isOwnProfile={isOwnProfile}
      />

      <AIClubsCard
        universityName={university}
        universityId={university_id}
        role={universityRole}
      />

      <SkillsCard
        skills={skills}
        isOwnProfile={isOwnProfile}
        onEdit={onEditSkills}
      />
    </aside>
  );
}
