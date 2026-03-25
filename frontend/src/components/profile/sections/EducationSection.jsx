/**
 * EducationSection
 *
 * Displays education entries on the profile page with
 * modal-based add/edit and inline delete via confirmation.
 */

import ProfileSection from './ProfileSection';
import ProfileSectionModal from './ProfileSectionModal';
import useProfileSectionState from './useProfileSectionState';
import { EmptyState, SecondaryButton, ConfirmationModal, ExpandableText } from '../../ui';
import { PlusIcon, EditIcon, TrashIcon, AcademicCapIcon, CalendarIcon } from '../../icons';
import { formatDateRange } from '../../../utils';

function EducationItem({ entry, isOwnProfile, onEdit, onDelete }) {
  return (
    <div className="group relative flex gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
        <span className="text-primary"><AcademicCapIcon size="md" /></span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{entry.institution}</h3>
            <p className="text-sm text-foreground/70">
              {entry.degree}
              {entry.field_of_study && ` · ${entry.field_of_study}`}
            </p>
          </div>
          {isOwnProfile && (
            <div className="flex gap-1">
              <button
                onClick={() => onEdit(entry)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
                aria-label="Edit education"
              >
                <span className="text-muted-foreground"><EditIcon size="sm" /></span>
              </button>
              <button
                onClick={() => onDelete(entry.id)}
                className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors cursor-pointer"
                aria-label="Delete education"
              >
                <span className="text-destructive"><TrashIcon size="sm" /></span>
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
          {(entry.start_date || entry.end_date) && (
            <span className="flex items-center gap-1">
              <CalendarIcon size="xs" />
              {formatDateRange(entry.start_date, entry.end_date)}
            </span>
          )}
          {entry.gpa != null && (
            <span>GPA: {entry.gpa}</span>
          )}
        </div>
        {entry.description && (
          <ExpandableText
            text={entry.description}
            lines={3}
            className="text-sm text-foreground/60 mt-2"
          />
        )}
      </div>
    </div>
  );
}

export default function EducationSection({
  education = [],
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

  const hasEducation = education && education.length > 0;

  // Hide empty sections on other users' profiles
  if (!isOwnProfile && !hasEducation) return null;

  const addAction = isOwnProfile && (
    <SecondaryButton
      variant="outline"
      onClick={handleAdd}
      icon={<PlusIcon size="sm" />}
      size="sm"
    >
      Add
    </SecondaryButton>
  );

  return (
    <>
      <ProfileSection title="Education" action={addAction}>
        {hasEducation ? (
          <div className="divide-y divide-border">
            {education.map((edu) => (
              <EducationItem
                key={edu.id}
                entry={edu}
                isOwnProfile={isOwnProfile}
                onEdit={handleEdit}
                onDelete={setDeleteId}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-secondary/30 rounded-xl">
            <p className="text-sm text-muted-foreground mb-3">
              {isOwnProfile ? 'Add your education' : 'No education listed'}
            </p>
            {isOwnProfile && (
              <SecondaryButton
                variant="outline"
                onClick={handleAdd}
                icon={<PlusIcon size="sm" />}
                size="sm"
              >
                Add education
              </SecondaryButton>
            )}
          </div>
        )}
      </ProfileSection>

      <ProfileSectionModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        sectionType="education"
        entry={editingEntry}
        onSave={handleSave}
        onDelete={handleDeleteFromModal}
      />

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Education"
        message="Are you sure you want to delete this education entry? This cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
