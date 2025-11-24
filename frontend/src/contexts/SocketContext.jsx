/**
 * WebSocket Context
 *
 * This module provides real-time WebSocket connectivity throughout the
 * application. It manages the Socket.IO connection lifecycle and provides
 * a hook for components to access the socket instance.
 *
 * Architecture:
 * - Socket connects when user is authenticated
 * - Socket disconnects on logout or unmount
 * - Automatic reconnection on connection loss
 * - Connection state available to all components
 *
 * Event Flow:
 * 1. User logs in → AuthContext sets user
 * 2. SocketContext detects user → connects to server
 * 3. Server authenticates via session cookie → joins user's private room
 * 4. Events (new_message, etc.) are emitted to user's room
 * 5. User logs out → socket disconnects
 *
 * Usage:
 *   const { socket, isConnected } = useSocket();
 *   socket.on('new_message', handleNewMessage);
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

// =============================================================================
// Socket Context
// =============================================================================

const SocketContext = createContext(null);

// =============================================================================
// Socket Provider Component
// =============================================================================

/**
 * SocketProvider Component
 *
 * Manages WebSocket connection lifecycle and provides socket access to children.
 * Automatically connects when user is authenticated and disconnects on logout.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Child components
 *
 * Connection Behavior:
 * - Connects only when user is authenticated
 * - Uses session cookie for authentication (withCredentials: true)
 * - Automatically reconnects on disconnection
 * - Cleans up on unmount or user logout
 */
export function SocketProvider({ children }) {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  // Socket.IO client instance
  const [socket, setSocket] = useState(null);

  // Connection state for UI feedback
  const [isConnected, setIsConnected] = useState(false);

  // Track if we've intentionally disconnected (to prevent reconnect)
  const intentionalDisconnect = useRef(false);

  // Get current user from auth context
  const { user, isAuthenticated } = useAuth();

  // ---------------------------------------------------------------------------
  // Socket Connection Effect
  // ---------------------------------------------------------------------------
  // Creates socket connection when user authenticates, cleans up on logout

  useEffect(() => {
    // Only connect if user is authenticated
    if (!isAuthenticated || !user) {
      // If socket exists and user logged out, disconnect
      if (socket) {
        intentionalDisconnect.current = true;
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Reset intentional disconnect flag
    intentionalDisconnect.current = false;

    // -------------------------------------------------------------------------
    // Create Socket Connection
    // -------------------------------------------------------------------------
    // Socket.IO will use the same origin as the page by default.
    // In development, Vite proxies to Flask on port 5000.
    // In production, both are served from the same origin.

    const newSocket = io({
      // -----------------------------------------------------------------------
      // Authentication
      // -----------------------------------------------------------------------
      // Include credentials (cookies) so Flask-Login session is available.
      // This allows the server to identify the user on connection.
      withCredentials: true,

      // -----------------------------------------------------------------------
      // Reconnection Settings
      // -----------------------------------------------------------------------
      // Automatically attempt to reconnect on disconnection.
      // Uses exponential backoff to prevent overwhelming the server.
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,

      // -----------------------------------------------------------------------
      // Transport
      // -----------------------------------------------------------------------
      // Start with websocket, fall back to polling if needed.
      // WebSocket is preferred for lower latency.
      transports: ['websocket', 'polling'],

      // -----------------------------------------------------------------------
      // Timeout
      // -----------------------------------------------------------------------
      // How long to wait for initial connection before timing out.
      timeout: 10000,
    });

    // -------------------------------------------------------------------------
    // Event Handlers
    // -------------------------------------------------------------------------

    // Handle successful connection
    newSocket.on('connect', () => {
      console.log('[Socket] Connected with ID:', newSocket.id);
      setIsConnected(true);

      // Request to join user's private room (redundant but ensures room membership)
      newSocket.emit('join_user_room');
    });

    // Handle disconnection
    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);

      // If server disconnected us, attempt to reconnect
      if (reason === 'io server disconnect' && !intentionalDisconnect.current) {
        console.log('[Socket] Server disconnected, attempting reconnect...');
        newSocket.connect();
      }
    });

    // Handle connection errors
    newSocket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setIsConnected(false);
    });

    // Handle reconnection attempts
    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Socket] Reconnection attempt:', attemptNumber);
    });

    // Handle successful reconnection
    newSocket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    // Handle confirmation from server
    newSocket.on('connected', (data) => {
      console.log('[Socket] Server confirmed connection:', data);
    });

    // Handle room join confirmation
    newSocket.on('room_joined', (data) => {
      console.log('[Socket] Joined room:', data.room);
    });

    // Store socket in state
    setSocket(newSocket);

    // -------------------------------------------------------------------------
    // Cleanup on Unmount or User Change
    // -------------------------------------------------------------------------
    return () => {
      intentionalDisconnect.current = true;
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, user?.id]); // Reconnect if user changes

  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------

  const contextValue = {
    // Socket instance (null if not connected)
    socket,

    // Whether socket is currently connected
    isConnected,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

// =============================================================================
// useSocket Hook
// =============================================================================

/**
 * useSocket Hook
 *
 * Access the WebSocket connection from any component.
 *
 * @returns {object} Socket context value
 * @returns {Socket|null} socket - Socket.IO client instance (null if not connected)
 * @returns {boolean} isConnected - Whether socket is currently connected
 *
 * @throws {Error} If used outside SocketProvider
 *
 * @example
 * function MessagesPage() {
 *   const { socket, isConnected } = useSocket();
 *
 *   useEffect(() => {
 *     if (!socket) return;
 *
 *     socket.on('new_message', (data) => {
 *       // Handle new message
 *     });
 *
 *     return () => socket.off('new_message');
 *   }, [socket]);
 *
 *   return <div>Connected: {isConnected ? 'Yes' : 'No'}</div>;
 * }
 */
export function useSocket() {
  const context = useContext(SocketContext);

  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }

  return context || { socket: null, isConnected: false };
}

// =============================================================================
// useSocketEvent Hook
// =============================================================================

/**
 * useSocketEvent Hook
 *
 * Convenience hook for subscribing to a specific socket event.
 * Automatically handles cleanup when component unmounts.
 *
 * @param {string} eventName - Name of the socket event to listen for
 * @param {Function} handler - Callback function when event is received
 *
 * @example
 * function MessagesPage() {
 *   useSocketEvent('new_message', (data) => {
 *     console.log('New message received:', data);
 *   });
 * }
 */
export function useSocketEvent(eventName, handler) {
  const { socket } = useSocket();

  // Memoize handler to prevent unnecessary re-subscriptions
  const savedHandler = useRef(handler);

  // Update ref when handler changes
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  // Subscribe to event
  useEffect(() => {
    if (!socket) return;

    // Create stable event handler that uses current handler from ref
    const eventHandler = (data) => {
      savedHandler.current(data);
    };

    // Subscribe
    socket.on(eventName, eventHandler);

    // Cleanup
    return () => {
      socket.off(eventName, eventHandler);
    };
  }, [socket, eventName]);
}
