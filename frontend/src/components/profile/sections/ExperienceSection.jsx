/**
 * ExperienceSection
 *
 * Displays work experience entries on the profile page with
 * modal-based add/edit and inline delete via confirmation.
 */

import ProfileSection from './ProfileSection';
import ProfileSectionModal from './ProfileSectionModal';
import useProfileSectionState from './useProfileSectionState';
import { EmptyState, SecondaryButton, ConfirmationModal } from '../../ui';
import { PlusIcon, EditIcon, TrashIcon, BriefcaseIcon, MapPinIcon, CalendarIcon } from '../../icons';
import { formatDateRange } from '../../../utils';

function ExperienceItem({ entry, isOwnProfile, onEdit, onDelete }) {
  return (
    <div className="group relative flex gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
        <BriefcaseIcon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{entry.title}</h3>
            <p className="text-sm text-foreground/70">{entry.company}</p>
          </div>
          {isOwnProfile && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(entry)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
                aria-label="Edit experience"
              >
                <EditIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={() => onDelete(entry.id)}
                className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors cursor-pointer"
                aria-label="Delete experience"
              >
                <TrashIcon className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            {formatDateRange(entry.start_date, entry.end_date)}
          </span>
          {entry.location && (
            <span className="flex items-center gap-1">
              <MapPinIcon className="h-3 w-3" />
              {entry.location}
            </span>
          )}
        </div>
        {entry.description && (
          <p className="text-sm text-foreground/60 mt-2 whitespace-pre-wrap">{entry.description}</p>
        )}
      </div>
    </div>
  );
}

export default function ExperienceSection({
  experiences = [],
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

  const hasExperiences = experiences && experiences.length > 0;

  const addAction = isOwnProfile && (
    <SecondaryButton
      variant="outline"
      onClick={handleAdd}
      icon={<PlusIcon className="h-4 w-4" />}
      size="sm"
    >
      Add
    </SecondaryButton>
  );

  return (
    <>
      <ProfileSection title="Experience" action={addAction}>
        {hasExperiences ? (
          <div className="divide-y divide-border">
            {experiences.map((exp) => (
              <ExperienceItem
                key={exp.id}
                entry={exp}
                isOwnProfile={isOwnProfile}
                onEdit={handleEdit}
                onDelete={setDeleteId}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-secondary/30 rounded-xl">
            <p className="text-sm text-muted-foreground mb-3">
              {isOwnProfile ? 'Add your work experience' : 'No experience listed'}
            </p>
            {isOwnProfile && (
              <SecondaryButton
                variant="outline"
                onClick={handleAdd}
                icon={<PlusIcon className="h-4 w-4" />}
                size="sm"
              >
                Add experience
              </SecondaryButton>
            )}
          </div>
        )}
      </ProfileSection>

      <ProfileSectionModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        sectionType="experience"
        entry={editingEntry}
        onSave={handleSave}
        onDelete={handleDeleteFromModal}
      />

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Experience"
        message="Are you sure you want to delete this experience entry? This cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
