// frontend/src/api/index.js
/**
 * API Module Barrel Export
 *
 * Central export point for all API modules.
 * Import all API functions from here for convenience.
 *
 * @example
 * import { getCurrentUser, getUniversities, createNote } from '@/api';
 */

// Export everything from all API modules
export * from './client';
export * from './auth';
export * from './universities';
export * from './universityRequests';
export * from './notes';
export * from './users';
export * from './messages';
export * from './uploads';