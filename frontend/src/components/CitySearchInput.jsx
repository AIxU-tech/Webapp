/**
 * CitySearchInput Component
 *
 * A modular US city search input with autocomplete functionality.
 * Uses a static dataset of ~30,000 US cities for instant, reliable search.
 *
 * Features:
 * - Comprehensive US cities database (~30k cities)
 * - Instant client-side search (no network latency)
 * - Debounced input (100ms) for smooth typing
 * - Dropdown with city suggestions (City, State format)
 * - Keyboard navigation support (arrow keys, Enter, Escape)
 * - Click-away to close dropdown
 * - Smart matching: prioritizes prefix matches, then contains matches
 *
 * State Management Pattern:
 * - Internal state (`inputValue`) handles what the user sees/types
 * - External `value` prop is the initial/committed value
 * - `onChange` is called ONLY when user selects a city from dropdown
 * - This prevents sync loops and provides smooth typing UX
 *
 * @component
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import US_CITIES from '../data/usCities';

/**
 * Debounce hook - short delay for instant feel while preventing excessive re-renders
 * @param {any} value - Value to debounce
 * @param {number} delay - Debounce delay in ms
 * @returns {any} Debounced value
 */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Search cities with smart matching
 * Prioritizes: exact match > prefix match > contains match
 * @param {string} query - Search query
 * @param {number} limit - Max results to return
 * @returns {string[]} Matching city names
 */
function searchCities(query, limit = 8) {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();
  const prefixMatches = [];
  const containsMatches = [];

  for (const city of US_CITIES) {
    const lowerCity = city.toLowerCase();

    if (lowerCity.startsWith(lowerQuery)) {
      prefixMatches.push(city);
      if (prefixMatches.length >= limit) break;
    } else if (lowerCity.includes(lowerQuery)) {
      containsMatches.push(city);
    }
  }

  // Combine results, prioritizing prefix matches
  const results = [...prefixMatches];
  for (const city of containsMatches) {
    if (results.length >= limit) break;
    results.push(city);
  }

  return results.slice(0, limit);
}

/**
 * Search icon for the input
 */
const SearchIcon = () => (
  <svg
    className="h-5 w-5 text-muted-foreground"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

/**
 * CitySearchInput Component
 *
 * @param {Object} props - Component props
 * @param {string} props.value - Initial/committed value (synced on mount and when changed externally)
 * @param {function} props.onChange - Called when user SELECTS a city (not on every keystroke)
 * @param {string} [props.placeholder='Search for a city...'] - Input placeholder
 * @param {boolean} [props.disabled=false] - Whether input is disabled
 * @param {boolean} [props.required=false] - Whether input is required
 * @param {string} [props.name] - Input name attribute
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element}
 */
export default function CitySearchInput({
  value,
  onChange,
  placeholder = 'Search for a city...',
  disabled = false,
  required = false,
  name,
  className = '',
}) {
  // Internal display state - what the user sees and types
  const [inputValue, setInputValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Track if user is actively interacting to prevent external sync during typing
  const isUserTypingRef = useRef(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Debounce the search query - short delay for instant feel
  const debouncedQuery = useDebounce(inputValue, 100);

  // Compute suggestions from static dataset (instant, memoized)
  const suggestions = useMemo(() => {
    return searchCities(debouncedQuery);
  }, [debouncedQuery]);

  // Open dropdown when we have suggestions
  useEffect(() => {
    if (suggestions.length > 0 && isUserTypingRef.current) {
      setIsOpen(true);
    } else if (suggestions.length === 0) {
      setIsOpen(false);
    }
  }, [suggestions]);

  // Sync external value changes ONLY when not actively typing
  // This handles: initial mount, form reset, programmatic value changes
  useEffect(() => {
    if (!isUserTypingRef.current && value !== undefined) {
      setInputValue(value || '');
    }
  }, [value]);

  /**
   * Handle input change - updates display only, doesn't notify parent
   */
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    isUserTypingRef.current = true;
    setInputValue(newValue);
    setHighlightedIndex(-1);

    // If user clears the input, notify parent with empty value
    if (newValue === '' && onChange) {
      onChange('');
    }
  };

  /**
   * Handle suggestion selection - notifies parent with selected city
   */
  const handleSelectSuggestion = (cityName) => {
    isUserTypingRef.current = false;
    setInputValue(cityName);
    setIsOpen(false);
    setHighlightedIndex(-1);

    // Notify parent of the selection
    if (onChange) {
      onChange(cityName);
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      // Allow Enter to submit form when dropdown is closed
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault();
          handleSelectSuggestion(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        // Close dropdown on tab, allow default tab behavior
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  /**
   * Handle blur - commit current value if user typed something but didn't select
   */
  const handleBlur = () => {
    // Small delay to allow click on suggestion to fire first
    setTimeout(() => {
      if (isUserTypingRef.current && inputValue.trim()) {
        // User typed but didn't select - commit the typed value
        isUserTypingRef.current = false;
        if (onChange) {
          onChange(inputValue.trim());
        }
      }
      isUserTypingRef.current = false;
    }, 150);
  };

  /**
   * Handle click outside to close dropdown
   */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Handle focus to show existing suggestions
   */
  const handleFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input with icon */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete="off"
          className="w-full px-4 py-3 pl-11 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Search icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <SearchIcon />
        </div>
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((cityName, index) => {
            // Parse "City, State" format
            const [city, state] = cityName.split(', ');
            return (
              <li
                key={cityName}
                onClick={() => handleSelectSuggestion(cityName)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`
                  px-4 py-3 cursor-pointer text-sm
                  ${index === highlightedIndex
                    ? 'bg-muted text-foreground'
                    : 'text-foreground hover:bg-muted'
                  }
                  ${index !== suggestions.length - 1 ? 'border-b border-border' : ''}
                `}
              >
                <span className="font-medium">{city}</span>
                {state && (
                  <span className="text-muted-foreground">, {state}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
