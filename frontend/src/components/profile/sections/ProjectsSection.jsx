/**
 * ProjectsSection
 *
 * Displays project entries on the profile page with
 * modal-based add/edit and inline delete via confirmation.
 */

import ProfileSection from './ProfileSection';
import ProfileSectionModal from './ProfileSectionModal';
import useProfileSectionState from './useProfileSectionState';
import { EmptyState, SecondaryButton, ConfirmationModal, ExpandableText } from '../../ui';
import { PlusIcon, EditIcon, TrashIcon, CodeIcon, ExternalLinkIcon } from '../../icons';

function ProjectItem({ entry, isOwnProfile, onEdit, onDelete }) {
  const hasTech = entry.technologies && entry.technologies.length > 0;

  return (
    <div className="group relative flex gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
        <span className="text-primary"><CodeIcon size="md" /></span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{entry.title}</h3>
              {entry.url && (
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors"
                  aria-label="Open project link"
                >
                  <ExternalLinkIcon size="sm" />
                </a>
              )}
            </div>
          </div>
          {isOwnProfile && (
            <div className="flex gap-1">
              <button
                onClick={() => onEdit(entry)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
                aria-label="Edit project"
              >
                <span className="text-muted-foreground"><EditIcon size="sm" /></span>
              </button>
              <button
                onClick={() => onDelete(entry.id)}
                className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors cursor-pointer"
                aria-label="Delete project"
              >
                <span className="text-destructive"><TrashIcon size="sm" /></span>
              </button>
            </div>
          )}
        </div>
        {entry.description && (
          <ExpandableText
            text={entry.description}
            lines={3}
            className="text-sm text-foreground/60 mt-2"
          />
        )}
        {hasTech && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {entry.technologies.map((tech, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectsSection({
  projects = [],
  isOwnProfile,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const {
    modalOpen, editingEntry, deleteId,
    handleAdd, handleEdit, handleSave,
    handleCloseModal, handleDeleteFromModal,
    handleDeleteConfirm, handleDeleteCancel, setDeleteId,
  } = useProfileSectionState({ onCreate, onUpdate, onDelete });

  const hasProjects = projects && projects.length > 0;

  // Hide empty sections on other users' profiles
  if (!isOwnProfile && !hasProjects) return null;

  const addAction = isOwnProfile && (
    <SecondaryButton
      variant="outline"
      onClick={handleAdd}
      icon={<PlusIcon size="sm" />}
      size="sm"
      className="rounded-full"
    >
      Add
    </SecondaryButton>
  );

  return (
    <>
      <ProfileSection
        title="Projects"
        subtitle="Showcase your best work"
        action={addAction}
      >
        {hasProjects ? (
          <div className="divide-y divide-border">
            {projects.map((project) => (
              <ProjectItem
                key={project.id}
                entry={project}
                isOwnProfile={isOwnProfile}
                onEdit={handleEdit}
                onDelete={setDeleteId}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-secondary/30 rounded-xl">
            <p className="text-sm text-muted-foreground mb-3">
              {isOwnProfile ? 'Showcase your AI projects here' : 'No projects yet'}
            </p>
            {isOwnProfile && (
              <SecondaryButton
                variant="outline"
                onClick={handleAdd}
                icon={<PlusIcon size="sm" />}
                size="sm"
                className="rounded-full"
              >
                Add your first project
              </SecondaryButton>
            )}
          </div>
        )}
      </ProfileSection>

      <ProfileSectionModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        sectionType="project"
        entry={editingEntry}
        onSave={handleSave}
        onDelete={handleDeleteFromModal}
      />

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        message="Are you sure you want to delete this project? This cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
