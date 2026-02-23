/**
 * useProfileSectionState
 *
 * Shared state management for profile section components
 * (Education, Experience, Projects). Manages modal open/close,
 * editing state, and delete confirmation flow.
 */

import { useState } from 'react';

export default function useProfileSectionState({ onCreate, onUpdate, onDelete }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const handleAdd = () => {
    setEditingEntry(null);
    setModalOpen(true);
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  };

  const handleSave = (data) => {
    if (editingEntry) {
      onUpdate(data);
    } else {
      onCreate(data);
    }
    setModalOpen(false);
    setEditingEntry(null);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingEntry(null);
  };

  const handleDeleteFromModal = (id) => {
    setModalOpen(false);
    setDeleteId(id);
  };

  const handleDeleteConfirm = () => {
    onDelete(deleteId);
    setDeleteId(null);
  };

  const handleDeleteCancel = () => {
    setDeleteId(null);
  };

  return {
    modalOpen,
    editingEntry,
    deleteId,
    handleAdd,
    handleEdit,
    handleSave,
    handleCloseModal,
    handleDeleteFromModal,
    handleDeleteConfirm,
    handleDeleteCancel,
    setDeleteId,
  };
}
