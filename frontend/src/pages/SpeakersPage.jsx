/**
 * SpeakersPage Component
 *
 * Displays a grid of guest speaker contacts shared across university AI clubs.
 * Only accessible to users who are executives (or higher) at any university, or site admins.
 */

import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSpeakers, useDeleteSpeaker, usePageTitle, useDelayedLoading } from '../hooks';
import { EmptyState, ErrorState, GradientButton, ConfirmationModal, CardSkeleton } from '../components/ui';
import { SearchIcon, PlusIcon, SpeakersIcon } from '../components/icons';
import SpeakerCard from '../components/speakers/SpeakerCard';
import CreateSpeakerModal from '../components/speakers/CreateSpeakerModal';

// Lock icon for access-denied state
function LockIcon({ className = 'h-12 w-12' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function SpeakersPage() {
  usePageTitle('Speakers Network');

  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.permissionLevel >= 1;
  const hasAccess = isAuthenticated && (user?.isExecutiveAnywhere || isAdmin);

  // Data fetching (only if authorized)
  const { data, isLoading, error: queryError } = useSpeakers();
  const speakers = data?.speakers || [];
  const userUniversities = data?.userUniversities || [];

  const showLoading = useDelayedLoading(isLoading);
  const error = queryError?.message || null;

  // Delete mutation
  const deleteMutation = useDeleteSpeaker();

  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [speakerToDelete, setSpeakerToDelete] = useState(null);

  // Client-side search
  const filteredSpeakers = useMemo(() => {
    if (!searchTerm.trim()) return speakers;
    const term = searchTerm.toLowerCase();
    return speakers.filter((s) =>
      s.name?.toLowerCase().includes(term) ||
      s.position?.toLowerCase().includes(term) ||
      s.organization?.toLowerCase().includes(term)
    );
  }, [speakers, searchTerm]);

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (speakerToDelete) {
      deleteMutation.mutate(speakerToDelete.id, {
        onSettled: () => setSpeakerToDelete(null),
      });
    }
  };

  // Access-denied state
  if (!hasAccess) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          icon={<LockIcon className="h-12 w-12" />}
          title="Speakers Network"
          description="This page is available to club executives. Contact your club president to get access."
        />
      </div>
    );
  }

  // Loading state
  if (showLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader onCreateClick={() => setShowCreateModal(true)} />
        <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        <LoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (error && speakers.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader onCreateClick={() => setShowCreateModal(true)} />
        <ErrorState
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader onCreateClick={() => setShowCreateModal(true)} />

      <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      {/* Speakers Grid or Empty State */}
      {filteredSpeakers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpeakers.map((speaker) => (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              currentUserId={user?.id}
              isSiteAdmin={isAdmin}
              onEdit={setEditingSpeaker}
              onDelete={setSpeakerToDelete}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<SpeakersIcon className="h-12 w-12" />}
          title={searchTerm ? 'No speakers found' : 'No speakers added yet'}
          description={
            searchTerm
              ? 'Try adjusting your search query'
              : 'Add your first guest speaker contact to share with other clubs'
          }
          action={
            searchTerm
              ? { label: 'Clear search', onClick: () => setSearchTerm('') }
              : { label: 'Add Speaker', onClick: () => setShowCreateModal(true) }
          }
        />
      )}

      {/* Create/Edit Modal */}
      <CreateSpeakerModal
        isOpen={showCreateModal || !!editingSpeaker}
        onClose={() => {
          setShowCreateModal(false);
          setEditingSpeaker(null);
        }}
        speaker={editingSpeaker}
        userUniversities={userUniversities}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!speakerToDelete}
        onClose={() => setSpeakerToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Speaker"
        message={`Are you sure you want to delete "${speakerToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function PageHeader({ onCreateClick }) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Speakers Network
        </h1>
        <p className="text-muted-foreground text-lg">
          Share and discover guest speakers across AI clubs
        </p>
      </div>
      <GradientButton onClick={onCreateClick} icon={<PlusIcon />}>
        Add Speaker
      </GradientButton>
    </div>
  );
}

function SearchBar({ searchTerm, onSearchChange }) {
  return (
    <div className="mb-8">
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Search by name, position, or organization..."
          className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search speakers"
        />
      </div>
    </div>
  );
}
