import { useState, useRef } from 'react';
import { useSearchUsers, useDebounce, useClickOutside } from '../../hooks';
import { SearchIcon } from '../icons';
import { Avatar } from '../ui';

export default function UserSearchBar({ onStartNewConversation }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const { data: searchResults, isFetching } = useSearchUsers(debouncedQuery);
  const containerRef = useRef(null);

  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  const handleSelect = (user) => {
    onStartNewConversation(user);
    setQuery('');
    setIsOpen(false);
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const showResults = isOpen && debouncedQuery.length >= 2;

  return (
    <div className="relative p-3" ref={containerRef}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <SearchIcon />
        </div>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="New conversation..."
          className="
            w-full pl-10 pr-4 py-2 text-sm
            bg-background border border-border rounded-lg
            text-foreground placeholder-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-primary
          "
        />
      </div>

      {showResults && (
        <div className="absolute left-3 right-3 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
          {isFetching ? (
            <p className="text-sm text-muted-foreground p-3">Searching...</p>
          ) : searchResults?.length > 0 ? (
            searchResults.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gradient-to-r hover:from-primary/15 hover:to-primary/5 transition-colors text-left"
              >
                <Avatar user={user} size="sm" name={user.name} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                  {user.university && (
                    <p className="text-xs text-muted-foreground truncate">{user.university}</p>
                  )}
                </div>
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground p-3">No users found</p>
          )}
        </div>
      )}
    </div>
  );
}
