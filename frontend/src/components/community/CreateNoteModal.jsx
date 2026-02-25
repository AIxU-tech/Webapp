/**
 * CreateNoteModal Component
 *
 * Thin wrapper around NoteFormModal for creating new community notes.
 * Maps the `onCreate` callback to the shared form's `onSubmit`.
 *
 * @component
 */

import NoteFormModal from './NoteFormModal';

export default function CreateNoteModal({ onCreate, ...props }) {
  return <NoteFormModal onSubmit={onCreate} {...props} />;
}
