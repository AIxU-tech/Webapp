/**
 * TermsModalWrapper Component
 *
 * Wrapper component that renders TermsModal with access to both
 * TermsContext and AuthModalContext. This allows TermsModal to restore
 * parent modals when closing.
 *
 * Must be rendered inside both TermsProvider and AuthModalProvider.
 *
 * @component
 */

import { useTerms } from '../../contexts/TermsContext';
import TermsModal from './TermsModal';

export default function TermsModalWrapper() {
  const { isOpen, closeTermsModal, parentModalType } = useTerms();

  return (
    <TermsModal
      isOpen={isOpen}
      onClose={closeTermsModal}
      parentModalType={parentModalType}
    />
  );
}

