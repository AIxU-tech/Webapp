/**
 * NavBar Component
 *
 * A unified navigation bar component used across the entire application.
 * Renders different navigation elements based on authentication state:
 *
 * - Authenticated users: Shows logo, centered navigation links (Community,
 *   Universities, Messages), and Profile link on the right
 * - Unauthenticated users: Shows logo and "Join AIxU" call-to-action button
 *
 * Design Features:
 * - Fixed positioning at the top of the viewport
 * - Glassomorphic styling with backdrop blur
 * - Responsive layout with centered navigation
 * - Sliding pill indicator for active route
 * - Active state highlighting for current route
 *
 * @component
 */

import { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { useUnreadCount } from '../../hooks';
import NotificationDropdown from '../notifications/NotificationDropdown';
import {
  BrainCircuitIcon,
  CommunityIcon,
  UniversitiesIcon,
  OpportunitiesIcon,
  MessagesIcon,
  NewsIcon,
  SpeakersIcon,
  ProfileIcon,
  AdminIcon,
} from '../icons';

// =============================================================================
// CENTER NAV ITEMS CONFIG
// =============================================================================

const CENTER_NAV_ITEMS = [
  { id: 'community', path: '/community', label: 'Community', Icon: CommunityIcon },
  { id: 'university', path: '/universities', label: 'University', Icon: UniversitiesIcon, activePrefix: '/universities' },
  { id: 'opportunities', path: '/opportunities', label: 'Opportunities', Icon: OpportunitiesIcon },
  { id: 'messages', path: '/messages', label: 'Messages', Icon: MessagesIcon, requiresAuth: true },
  { id: 'news', path: '/news', label: 'News', Icon: NewsIcon },
  { id: 'speakers', path: '/speakers', label: 'Speakers', Icon: SpeakersIcon, requiresExecutive: true },
];

// =============================================================================
// MESSAGES ICON WITH UNREAD BADGE
// =============================================================================

function MessagesIconWithBadge() {
  const unreadCount = useUnreadCount();
  return (
    <span className="relative">
      <MessagesIcon />
      {unreadCount > 0 && (
        <span
          className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full ring-2 ring-white"
          aria-label="Unread messages"
        />
      )}
    </span>
  );
}

function BottomMessagesIconWithBadge() {
  const unreadCount = useUnreadCount();
  return (
    <span className="relative inline-flex">
      <MessagesIcon />
      {unreadCount > 0 && (
        <span
          className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-white"
          aria-label="Unread messages"
        />
      )}
    </span>
  );
}

// =============================================================================
// SLIDING NAV INDICATOR HOOK
// =============================================================================

function useSlidingIndicator(activeId, itemsLength) {
  const tabRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, visible: false });

  useEffect(() => {
    if (!activeId) {
      setIndicatorStyle(prev => ({ ...prev, visible: false }));
      return;
    }
    const activeEl = tabRefs.current[activeId];
    if (activeEl) {
      setIndicatorStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        visible: true,
      });
    }
  }, [activeId, itemsLength]);

  useEffect(() => {
    const recalc = () => {
      if (!activeId) return;
      const activeEl = tabRefs.current[activeId];
      if (activeEl) {
        setIndicatorStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          visible: true,
        });
      }
    };
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [activeId]);

  return { tabRefs, indicatorStyle };
}

function getActiveId(items, currentPath) {
  return items.find(item => {
    const matchPath = item.activePrefix || item.path;
    return currentPath === matchPath ||
      (matchPath !== '/' && currentPath.startsWith(matchPath));
  })?.id || null;
}

// =============================================================================
// SLIDING PILL NAV — shared by desktop (top) and mobile (bottom)
// Same bg-muted rounded-full track, white sliding pill, icon + label links.
// =============================================================================

function SlidingPillNav({ items, currentPath, navClassName = '', ariaLabel }) {
  const activeId = getActiveId(items, currentPath);
  const { tabRefs, indicatorStyle } = useSlidingIndicator(activeId, items.length);

  return (
    <nav
      className={`relative flex items-center bg-muted rounded-full px-2 py-1 ${navClassName}`}
      role="navigation"
      {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
    >
      {indicatorStyle.visible && (
        <div
          className="absolute inset-y-1 bg-white dark:bg-white/15 rounded-full ring-[0.75px] ring-black/15 shadow-sm transition-[left,width] duration-300 ease-out pointer-events-none"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />
      )}

      {items.map((item) => (
        <div key={item.id} ref={(el) => { tabRefs.current[item.id] = el; }}>
          <Link
            to={item.path}
            className={`
              relative z-10 px-3 py-2 text-sm font-medium transition-colors rounded-md
              flex items-center gap-2 whitespace-nowrap
              ${activeId === item.id
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            {item.renderIcon ? item.renderIcon() : <item.Icon />}
            <span>{item.label}</span>
          </Link>
        </div>
      ))}
    </nav>
  );
}

function SlidingNavLinks({ items, currentPath }) {
  return <SlidingPillNav items={items} currentPath={currentPath} />;
}

function SlidingBottomNav({ items, currentPath }) {
  return (
    <SlidingPillNav
      items={items}
      currentPath={currentPath}
      navClassName="w-max"
      ariaLabel="Mobile navigation"
    />
  );
}

// =============================================================================
// NAVIGATION LINK COMPONENT (used for right-side items: Admin, Profile)
// =============================================================================

function NavLink({ to, children, currentPath, activePrefix }) {
  const matchPath = activePrefix || to;
  const isActive = currentPath === matchPath ||
    (matchPath !== '/' && currentPath.startsWith(matchPath));

  return (
    <Link
      to={to}
      className={`
        px-3 py-2 rounded-md text-sm font-medium
        flex items-center gap-2
        transition-all duration-150
        ${isActive
          ? 'text-primary bg-gray-100'
          : 'text-gray-700 hover:text-foreground hover:bg-gray-100'
        }
      `}
    >
      {children}
    </Link>
  );
}

// =============================================================================
// MAIN NAVBAR COMPONENT
// =============================================================================

const ADMIN_PERMISSION_LEVEL = 1;

export default function NavBar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const { isAuthenticated, isReturningUser, user } = useAuth();
  const { openAuthModal } = useAuthModal();

  const isAdmin = user && user.permissionLevel >= ADMIN_PERMISSION_LEVEL;
  const primaryUniversityId = isAuthenticated ? user?.university_id : null;

  const logoHref = isAuthenticated
    ? (primaryUniversityId ? `/universities/${primaryUniversityId}` : '/universities')
    : '/';

  const filteredNavItems = CENTER_NAV_ITEMS
    .filter(item => {
      if (item.requiresAuth && !isAuthenticated) return false;
      if (item.requiresExecutive && !user?.isExecutiveAnywhere) return false;
      return true;
    })
    .map(item => {
      if (item.id === 'university') {
        return { ...item, path: primaryUniversityId ? `/universities/${primaryUniversityId}` : '/universities' };
      }
      return item;
    });

  const centerNavItems = filteredNavItems.map(item => {
    if (item.id === 'messages') return { ...item, renderIcon: () => <MessagesIconWithBadge /> };
    return item;
  });

  const bottomNavItems = filteredNavItems.map(item => {
    if (item.id === 'messages') return { ...item, renderIcon: () => <BottomMessagesIconWithBadge /> };
    return item;
  });

  return (
    <>
    <nav
      className="fixed top-0 left-0 right-0 z-50 glass-navbar px-6 py-3"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-between">
        {/* Brand (Left) */}
        <Link
          to={logoHref}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] rounded-lg flex items-center justify-center">
            <BrainCircuitIcon />
          </div>
          <span className="font-bold text-xl text-foreground">AIxU</span>
        </Link>

        {/* Sliding Nav (Center) */}
        <div className="absolute left-1/2 transform -translate-x-1/2 hidden xl:flex items-center">
          <SlidingNavLinks items={centerNavItems} currentPath={currentPath} />
        </div>

        {/* Actions (Right) */}
        {isAuthenticated ? (
          <div className="flex items-center gap-1">
            {isAdmin && (
              <NavLink to="/admin/university-requests" currentPath={currentPath}>
                <AdminIcon />
                <span>Admin</span>
              </NavLink>
            )}

            <NotificationDropdown />

            <NavLink to="/profile" currentPath={currentPath}>
              <ProfileIcon />
              <span>Profile</span>
            </NavLink>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link
              to="/add-university"
              className="text-sm font-medium text-gray-700 hover:text-foreground transition-colors duration-150"
            >
              Add Your School
            </Link>

            <Link
              to={isReturningUser ? '/login' : '/register'}
              className="bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-[hsl(220,85%,60%)]/30 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              {isReturningUser ? 'Log In' : 'Join AIxU'}
            </Link>
          </div>
        )}
      </div>

    </nav>

    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 xl:hidden border-t border-border overflow-x-auto no-scrollbar flex justify-center px-3"
    >
      <SlidingBottomNav items={bottomNavItems} currentPath={currentPath} />
    </div>
    </>
  );
}
