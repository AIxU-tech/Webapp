/**
 * MessageTargetContext
 * 
 * Lightweight context for passing a target user ID to the messages page.
 * Used when clicking "Message" from profiles, opportunities, etc.
 * 
 * Uses a ref instead of state to ensure synchronous updates - this prevents
 * race conditions where navigate() happens before state propagates.
 */

import { createContext, useContext, useRef, useCallback } from 'react';

const MessageTargetContext = createContext(null);

export function MessageTargetProvider({ children }) {
  const targetUserIdRef = useRef(null);

  const setTargetUserId = useCallback((userId) => {
    targetUserIdRef.current = userId;
  }, []);

  const getTargetUserId = useCallback(() => {
    return targetUserIdRef.current;
  }, []);

  const clearTarget = useCallback(() => {
    targetUserIdRef.current = null;
  }, []);

  return (
    <MessageTargetContext.Provider value={{ getTargetUserId, setTargetUserId, clearTarget }}>
      {children}
    </MessageTargetContext.Provider>
  );
}

export function useMessageTarget() {
  const context = useContext(MessageTargetContext);
  if (!context) {
    throw new Error('useMessageTarget must be used within a MessageTargetProvider');
  }
  return context;
}

