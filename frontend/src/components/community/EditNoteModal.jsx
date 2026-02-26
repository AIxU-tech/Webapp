/**
 * EditNoteModal Component
 *
 * Thin wrapper around NoteFormModal for editing existing community notes.
 * Maps the `onUpdate` callback to the shared form's `onSubmit`.
 *
 * @component
 */

import NoteFormModal from './NoteFormModal';

export default function EditNoteModal({ onUpdate, ...props }) {
  return <NoteFormModal onSubmit={onUpdate} {...props} />;
}
