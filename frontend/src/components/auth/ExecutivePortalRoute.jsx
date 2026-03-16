/**
 * ExecutivePortalRoute Component
 *
 * Protects executive portal routes. Redirects:
 * - Unauthenticated users → home (/)
 * - Authenticated users who lack executive+ at this university → university page
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Component to render if authorized
 */

import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUniversity } from '../../hooks';
import { ExecutivePortalSkeleton } from '../executive';

export default function ExecutivePortalRoute({ children }) {
  const { universityId } = useParams();
  const { isAuthenticated, loading } = useAuth();
  const { data: university, isLoading: universityLoading } = useUniversity(universityId);

  if (loading || universityLoading) {
    return <ExecutivePortalSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const canManageMembers = university?.permissions?.canManageMembers === true;

  if (!canManageMembers) {
    return <Navigate to={`/universities/${universityId}`} replace />;
  }

  return children;
}
