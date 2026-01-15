/**
 * TermsContext
 *
 * Global context for managing Terms of Service modal state.
 * Allows any component to open the TOS modal via useTerms() hook.
 * Tracks parent modal (login/register) to restore it when Terms closes.
 *
 * Usage:
 * 1. Wrap app with TermsProvider in main.jsx
 * 2. Use useTerms() hook to get openTermsModal function
 * 3. Call openTermsModal() to show the modal
 * 4. Call openTermsModal('login') or openTermsModal('register') to track parent modal
 *
 * @module contexts/TermsContext
 */

import { createContext, useContext, useState, useCallback } from 'react';

const TermsContext = createContext(null);

export function TermsProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [parentModalType, setParentModalType] = useState(null); // 'login' | 'register' | null

  /**
   * Open Terms modal, optionally tracking which modal opened it
   * @param {string|null} fromModal - 'login' | 'register' | null
   */
  const openTermsModal = useCallback((fromModal = null) => {
    setParentModalType(fromModal);
    setIsOpen(true);
  }, []);

  /**
   * Close Terms modal and restore parent modal if it exists
   */
  const closeTermsModal = useCallback(() => {
    setIsOpen(false);
    // Parent modal restoration is handled in TermsModal component
    // Reset parent modal type after a brief delay to allow modal transition
    setTimeout(() => {
      setParentModalType(null);
    }, 300);
  }, []);

  return (
    <TermsContext.Provider value={{ openTermsModal, parentModalType, isOpen, closeTermsModal }}>
      {children}
    </TermsContext.Provider>
  );
}

export function useTerms() {
  const context = useContext(TermsContext);
  if (!context) {
    throw new Error('useTerms must be used within a TermsProvider');
  }
  return context;
}
