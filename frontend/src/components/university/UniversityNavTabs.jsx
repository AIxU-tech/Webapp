/**
 * UniversityNavTabs
 *
 * Horizontal navigation tabs with sticky positioning, dark rounded background,
 * and white sliding pill indicator for the active tab.
 */

import { useRef, useState, useEffect } from 'react';
import { FileTextIcon, ClockIcon, OpportunitiesIcon, InfoIcon, UsersIcon } from '../icons';

const TABS = [
  { id: 'about', label: 'About', Icon: InfoIcon },
  { id: 'posts', label: 'Posts', Icon: FileTextIcon },
  { id: 'events', label: 'Events', Icon: ClockIcon },
  { id: 'opportunities', label: 'Opportunities', Icon: OpportunitiesIcon },
  { id: 'members', label: 'Members', Icon: UsersIcon },
];

export default function UniversityNavTabs({ activeTab, onTabChange, className = '' }) {
  const tabRefs = useRef({});
  const containerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Update indicator position when active tab changes
  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    if (activeEl && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tabRect = activeEl.getBoundingClientRect();

      setIndicatorStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [activeTab]);

  return (
    <div className={`sticky top-16 z-20 bg-background ${className}`}>
      <div className="container mx-auto px-4 py-3">
        {/* Dark rounded container for tabs */}
        <nav
          ref={containerRef}
          className="relative flex bg-muted rounded-lg p-1"
          role="tablist"
        >
          {/* White sliding pill indicator */}
          <div
            className="absolute inset-y-1 bg-white rounded-md shadow-sm transition-all duration-300 ease-out"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
          />

          {/* Tab buttons */}
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;

            return (
              <button
                key={id}
                ref={(el) => (tabRefs.current[id] = el)}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(id)}
                className={`
                  relative z-10 px-4 py-2 text-sm font-medium transition-colors rounded-md
                  flex items-center gap-2 cursor-pointer
                  ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
                `}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
