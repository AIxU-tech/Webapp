/**
 * ExecutivePortalLayout
 *
 * Shared layout for the executive portal dashboard.
 * Sleek header with university identity, nav tabs, and consistent chrome.
 */

import { Link, useLocation } from 'react-router-dom';
import { UsersIcon, CalendarIcon } from '../icons';
import { UniversityLogo } from '../ui';

const NAV_ITEMS = [
  { id: 'members', path: '', label: 'Members', Icon: UsersIcon },
  { id: 'events', path: '/events', label: 'Events', Icon: CalendarIcon },
];

export default function ExecutivePortalLayout({ university, universityId, children }) {
  const location = useLocation();
  const basePath = `/executive/${universityId}`;
  const pathname = location.pathname;

  const activeTab = pathname.includes('/events')
    ? 'events'
    : pathname === basePath || pathname.startsWith(`${basePath}/members`)
      ? 'members'
      : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header - sticky with subtle gradient */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* University identity */}
            <div className="flex items-center gap-4 min-w-0">
              <Link
                to={basePath}
                className="flex items-center gap-3 min-w-0 group"
              >
                <UniversityLogo
                  university={university}
                  size="md"
                  shape="rounded"
                  className="ring-2 ring-border ring-offset-2 ring-offset-background flex-shrink-0"
                />
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {university.name}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Executive Portal
                  </p>
                </div>
              </Link>
            </div>

            {/* Nav tabs */}
            <nav
              className="flex bg-muted rounded-xl p-1 flex-shrink-0 self-start sm:self-auto"
              role="tablist"
            >
              {NAV_ITEMS.map(({ id, path, label, Icon }) => {
                const href = `${basePath}${path}`;
                const isActive = activeTab === id;

                return (
                  <Link
                    key={id}
                    to={href}
                    role="tab"
                    aria-selected={isActive}
                    className={`
                      relative px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                      flex items-center gap-2 whitespace-nowrap
                      ${isActive
                        ? 'text-foreground bg-card shadow-sm ring-1 ring-border/50'
                        : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* View public page link */}
            <Link
              to={`/universities/${universityId}`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex-shrink-0 flex items-center gap-1"
            >
              View public page
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
