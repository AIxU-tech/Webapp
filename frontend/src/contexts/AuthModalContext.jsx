/**
 * AuthModalContext
 *
 * Global context for managing Auth Modal state.
 * Allows any component to open the login or register modal via useAuthModal() hook.
 *
 * Usage:
 * 1. Wrap app with AuthModalProvider in main.jsx
 * 2. Use useAuthModal() hook to get openAuthModal function
 * 3. Call openAuthModal() to show the login modal (default)
 * 4. Call openAuthModal('register') to show the register modal
 *
 * @module contexts/AuthModalContext
 */

import { createContext, useContext, useState, useCallback } from 'react';
import LoginModal from '../components/LoginModal';
import RegisterModal from '../components/RegisterModal';

const AuthModalContext = createContext(null);

export function AuthModalProvider({ children }) {
  const [activeModal, setActiveModal] = useState(null); // 'login' | 'register' | null

  const openAuthModal = useCallback((type = 'login') => {
    setActiveModal(type === 'register' ? 'register' : 'login');
  }, []);

  const closeAuthModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const switchToRegister = useCallback(() => {
    setActiveModal('register');
  }, []);

  const switchToLogin = useCallback(() => {
    setActiveModal('login');
  }, []);

  return (
    <AuthModalContext.Provider value={{ openAuthModal }}>
      {children}
      <LoginModal
        isOpen={activeModal === 'login'}
        onClose={closeAuthModal}
        onSwitchToRegister={switchToRegister}
      />
      <RegisterModal
        isOpen={activeModal === 'register'}
        onClose={closeAuthModal}
        onSwitchToLogin={switchToLogin}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}

