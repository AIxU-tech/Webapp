/**
 * EducationSection
 *
 * Displays education entries on the profile page with
 * modal-based add/edit and inline delete via confirmation.
 */

import { useState } from 'react';
import ProfileSection from './ProfileSection';
import ProfileSectionModal from './ProfileSectionModal';
import { EmptyState, SecondaryButton, ConfirmationModal } from '../../ui';
import { PlusIcon, EditIcon, TrashIcon, AcademicCapIcon, CalendarIcon } from '../../icons';

function formatDateRange(startDate, endDate) {
  const fmt = (d) => {
    if (!d) return null;
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };
  const start = fmt(startDate);
  const end = endDate ? fmt(endDate) : 'Present';
  return start ? `${start} — ${end}` : '';
}

function EducationItem({ entry, isOwnProfile, onEdit, onDelete }) {
  return (
    <div className="group relative flex gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
        <AcademicCapIcon className="h-5 w-5 text-primary" />
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
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(entry)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
                aria-label="Edit education"
              >
                <EditIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={() => onDelete(entry.id)}
                className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors cursor-pointer"
                aria-label="Delete education"
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
          {entry.gpa != null && (
            <span>GPA: {entry.gpa.toFixed(2)}</span>
          )}
        </div>
        {entry.description && (
          <p className="text-sm text-foreground/60 mt-2 whitespace-pre-wrap">{entry.description}</p>
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
  isSaving = false,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const hasEducation = education && education.length > 0;

  const handleAdd = () => {
    setEditingEntry(null);
    setModalOpen(true);
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  };

  const handleSave = async (data) => {
    if (editingEntry) {
      await onUpdate(data);
    } else {
      await onCreate(data);
    }
    setModalOpen(false);
    setEditingEntry(null);
  };

  const handleDeleteConfirm = async () => {
    await onDelete(deleteId);
    setDeleteId(null);
  };

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
                icon={<PlusIcon className="h-4 w-4" />}
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
        onClose={() => { setModalOpen(false); setEditingEntry(null); }}
        sectionType="education"
        entry={editingEntry}
        onSave={handleSave}
        onDelete={(id) => { setModalOpen(false); setDeleteId(id); }}
        isSaving={isSaving}
      />

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Education"
        message="Are you sure you want to delete this education entry? This cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
