import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useUniversities, usePageTitle } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { ErrorState, EmptyState, UniversityCardSkeleton, GradientButton, SecondaryButton } from '../components/ui';
import { SearchIcon, BuildingIcon, PlusIcon, MapPinIcon } from '../components/icons';
import { UniversityCard, CreateUniversityModal } from '../components/university';
import {
  UniversityMap,
  UniversityPinCard,
  MapMissingCoordsBanner,
  MapStatsHeader,
} from '../components/university-map';

const VIEW_STORAGE_KEY = 'universities.view';
const VIEW_MAP = 'map';
const VIEW_LIST = 'list';

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <UniversityCardSkeleton key={i} />
      ))}
    </div>
  );
}

// =============================================================================
// MAIN UNIVERSITIES PAGE COMPONENT
// =============================================================================

export default function UniversitiesPage() {
  usePageTitle('Universities');

  const { user } = useAuth();
  const isAdmin = user?.permissionLevel >= 1;

  // ---------------------------------------------------------------------------
  // View state — persisted to localStorage so a user's preference sticks.
  // ---------------------------------------------------------------------------
  const [view, setView] = useState(() => {
    if (typeof window === 'undefined') return VIEW_MAP;
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return stored === VIEW_LIST ? VIEW_LIST : VIEW_MAP;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  // ---------------------------------------------------------------------------
  // Data fetching — only request coordinates when actually rendering the map.
  // The hook keeps separate cache entries per flag, so non-map consumers
  // (RegisterPage, ProfilePage, etc.) pay zero geocoding cost.
  // ---------------------------------------------------------------------------
  const includeCoordinates = view === VIEW_MAP;
  const {
    data: universities = [],
    isLoading,
    error: queryError,
  } = useUniversities({ includeCoordinates });
  const error = queryError?.message || null;

  // ---------------------------------------------------------------------------
  // Local UI State
  // ---------------------------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Two pieces of state drive the pin card:
  //   - `selected` is sticky (set by click, cleared by close).
  //   - `hovered`  is transient (set on pin enter, cleared on leave).
  // The card prefers `selected` when present and falls back to `hovered`,
  // so a click "locks" the card open while quick hovers still preview.
  // Position is in map-container-relative pixels so the pin card can anchor
  // against the same wrapper without needing a portal.
  const mapWrapperRef = useRef(null);
  const [selected, setSelected] = useState(null); // { id, x, y } | null
  const [hovered, setHovered] = useState(null); // { id, x, y } | null
  const hoverCloseTimer = useRef(null);

  const filteredUniversities = useMemo(() => {
    if (!searchTerm.trim()) return universities;
    const term = searchTerm.toLowerCase();
    return universities.filter((university) => {
      const nameMatch = university.name?.toLowerCase().includes(term);
      const clubMatch = university.clubName?.toLowerCase().includes(term);
      return nameMatch || clubMatch;
    });
  }, [universities, searchTerm]);

  // Resolve which university the card should show. Sticky selection wins
  // over hover so clicking a pin doesn't get overridden by a stray hover.
  const activeAnchor = selected || hovered;
  const activeUniversity = useMemo(
    () =>
      activeAnchor
        ? filteredUniversities.find((u) => u.id === activeAnchor.id) || null
        : null,
    [activeAnchor, filteredUniversities],
  );

  // Translate a viewport-space pin point into map-container-relative coords.
  const toContainerCoords = useCallback((point) => {
    if (!point || !mapWrapperRef.current) return null;
    const rect = mapWrapperRef.current.getBoundingClientRect();
    return { x: point.x - rect.left, y: point.y - rect.top };
  }, []);

  const handlePinClick = useCallback(
    (uni, point) => {
      const local = toContainerCoords(point);
      if (!local) return;
      setSelected({ id: uni.id, x: local.x, y: local.y });
      // Clear any pending hover-close so the card transitions cleanly from
      // hover preview to sticky selection.
      if (hoverCloseTimer.current) {
        clearTimeout(hoverCloseTimer.current);
        hoverCloseTimer.current = null;
      }
      setHovered(null);
    },
    [toContainerCoords],
  );

  // Hover handlers. We debounce the close path so moving the cursor between
  // two adjacent pins doesn't cause a brief empty flash — if a new hover
  // arrives before the timer fires, we just swap content under the same
  // card. The open path stays immediate to feel responsive.
  const handlePinHover = useCallback(
    (uni, point) => {
      if (hoverCloseTimer.current) {
        clearTimeout(hoverCloseTimer.current);
        hoverCloseTimer.current = null;
      }
      if (!uni) {
        hoverCloseTimer.current = setTimeout(() => {
          setHovered(null);
          hoverCloseTimer.current = null;
        }, 80);
        return;
      }
      const local = toContainerCoords(point);
      if (!local) return;
      setHovered({ id: uni.id, x: local.x, y: local.y });
    },
    [toContainerCoords],
  );

  useEffect(() => {
    return () => {
      if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
    };
  }, []);

  // Note: we deliberately don't clear `selected` when the underlying list
  // filters it out — `activeUniversity` already resolves to null in that
  // case, so the pin card simply stops rendering. Keeping the stale id is
  // harmless and avoids a setState-in-effect anti-pattern.

  // ---------------------------------------------------------------------------
  // Render: Loading State (skeleton when loading with no data yet)
  // ---------------------------------------------------------------------------
  if (isLoading && universities.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader isAdmin={isAdmin} onCreateClick={() => setShowCreateModal(true)} />
        <ControlsRow
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          view={view}
          onViewChange={setView}
        />
        <LoadingSkeleton />
      </div>
    );
  }

  if (error && universities.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader isAdmin={isAdmin} onCreateClick={() => setShowCreateModal(true)} />
        <ErrorState
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader isAdmin={isAdmin} onCreateClick={() => setShowCreateModal(true)} />

      <ControlsRow
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        view={view}
        onViewChange={setView}
      />

      {view === VIEW_MAP ? (
        // Constrain both the stats strip and the map to a sensible reading
        // width — full container width felt unbalanced on wide displays,
        // with the map stretching far past the rest of the page content.
        <div className="mx-auto w-full max-w-4xl">
          <MapStatsHeader universities={filteredUniversities} />
          <MapMissingCoordsBanner universities={filteredUniversities} />
          <div
            ref={mapWrapperRef}
            className="relative w-full h-[55vh] min-h-[380px]"
          >
            <UniversityMap
              universities={filteredUniversities}
              onPinClick={handlePinClick}
              onPinHover={handlePinHover}
              selectedId={selected?.id || null}
              hoveredId={hovered?.id || null}
            />
            {activeUniversity && activeAnchor && (
              <UniversityPinCard
                university={activeUniversity}
                containerRef={mapWrapperRef}
                anchor={{ x: activeAnchor.x, y: activeAnchor.y }}
                onClose={() => setSelected(null)}
                sticky={Boolean(selected)}
              />
            )}
          </div>
        </div>
      ) : filteredUniversities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUniversities.map((university) => (
            <UniversityCard key={university.id} university={university} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BuildingIcon className="h-12 w-12" />}
          title={
            searchTerm
              ? 'No universities found'
              : 'No universities available yet'
          }
          description={
            searchTerm
              ? 'Try adjusting your search query'
              : 'Check back later for new university clubs'
          }
          action={
            searchTerm
              ? { label: 'Clear search', onClick: () => setSearchTerm('') }
              : undefined
          }
        />
      )}

      <CreateUniversityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function PageHeader({ isAdmin, onCreateClick }) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          University AI Clubs
        </h1>
        <p className="text-muted-foreground text-lg">
          Discover and connect with AI communities across universities worldwide
        </p>
      </div>
      {isAdmin && (
        <GradientButton onClick={onCreateClick} icon={<PlusIcon />} className="self-start flex-shrink-0">
          Create University
        </GradientButton>
      )}
    </div>
  );
}

/**
 * ControlsRow - Search input + view toggle (Map | List)
 */
function ControlsRow({ searchTerm, onSearchChange, view, onViewChange }) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
      <div className="relative flex-1">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Search universities or clubs..."
          className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search universities"
        />
      </div>

      <div
        role="tablist"
        aria-label="View toggle"
        className="inline-flex p-1 bg-muted rounded-full self-start sm:self-auto"
      >
        <ViewToggleButton
          active={view === VIEW_MAP}
          onClick={() => onViewChange(VIEW_MAP)}
          icon={<MapPinIcon className="h-4 w-4" />}
          label="Map"
        />
        <ViewToggleButton
          active={view === VIEW_LIST}
          onClick={() => onViewChange(VIEW_LIST)}
          icon={<BuildingIcon className="h-4 w-4" />}
          label="List"
        />
      </div>
    </div>
  );
}

function ViewToggleButton({ active, onClick, icon, label }) {
  return (
    <SecondaryButton
      onClick={onClick}
      variant={active ? 'primary' : 'ghost'}
      size="sm"
      icon={icon}
      aria-pressed={active}
      role="tab"
    >
      {label}
    </SecondaryButton>
  );
}
