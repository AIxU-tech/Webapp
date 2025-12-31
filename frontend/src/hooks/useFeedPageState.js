/**
 * useFeedPageState Hook
 * Manages common state patterns for feed pages (create modal, delete confirmation).
 */

import { useState, useCallback } from 'react';

/**
 * @param {object} options
 * @param {boolean} options.isAuthenticated - Whether user is logged in
 * @param {string} [options.authMessage='Please log in'] - Message when auth required
 * @param {function} [options.onCreateModalOpen] - Callback when modal opens
 * @param {function} [options.onCreateModalClose] - Callback when modal closes
 */
export default function useFeedPageState({
  isAuthenticated,
  authMessage = 'Please log in',
  onCreateModalOpen,
  onCreateModalClose,
} = {}) {
  // Create modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Delete confirmation state
  const [itemToDelete, setItemToDelete] = useState(null);

  const openCreateModal = useCallback(() => {
    if (!isAuthenticated) {
      alert(authMessage);
      return;
    }
    setIsCreateModalOpen(true);
    onCreateModalOpen?.();
  }, [isAuthenticated, authMessage, onCreateModalOpen]);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    onCreateModalClose?.();
  }, [onCreateModalClose]);

  const requestDelete = useCallback((itemId) => {
    setItemToDelete(itemId);
  }, []);

  const cancelDelete = useCallback(() => {
    setItemToDelete(null);
  }, []);

  const confirmDelete = useCallback((deleteFn) => {
    if (itemToDelete) {
      deleteFn(itemToDelete);
      setItemToDelete(null);
    }
  }, [itemToDelete]);

  return {
    createModal: {
      isOpen: isCreateModalOpen,
      open: openCreateModal,
      close: closeCreateModal,
    },
    deleteConfirm: {
      itemId: itemToDelete,
      isOpen: itemToDelete !== null,
      request: requestDelete,
      confirm: confirmDelete,
      cancel: cancelDelete,
    },
  };
}
