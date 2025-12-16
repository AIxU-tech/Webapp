/**
 * TermsContext
 *
 * Global context for managing Terms of Service modal state.
 * Allows any component to open the TOS modal via useTerms() hook.
 *
 * Usage:
 * 1. Wrap app with TermsProvider in main.jsx
 * 2. Use useTerms() hook to get openTermsModal function
 * 3. Call openTermsModal() to show the modal
 *
 * @module contexts/TermsContext
 */

import { createContext, useContext, useState, useCallback } from 'react';
import TermsModal from '../components/TermsModal';

const TermsContext = createContext(null);

export function TermsProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openTermsModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeTermsModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <TermsContext.Provider value={{ openTermsModal }}>
      {children}
      <TermsModal isOpen={isOpen} onClose={closeTermsModal} />
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
