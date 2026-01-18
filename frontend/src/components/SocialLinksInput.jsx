/**
 * SocialLinksInput Component
 *
 * Reusable input for managing social media links.
 * Auto-detects platform from pasted URLs and displays as removable chips.
 *
 * Features:
 * - Auto-detection of platform (LinkedIn, X, Instagram, GitHub, Discord, YouTube)
 * - Auto-prepends https:// if missing
 * - Displays links as chips with platform icon and remove button
 * - For "website" type: uses university logo if provided, else GlobeIcon
 * - Validation: valid URLs, no duplicates, max 7 links
 *
 * @component
 */

import { useState, useRef, useEffect } from 'react';
import { XIcon, SocialLinkIcon } from './icons';
import {
  parseSocialLink,
  getPlatformDisplayName,
  getPlatformColorClasses,
  linkExists,
  knownSocialTypeExists,
  MAX_SOCIAL_LINKS,
} from '../utils/socialLinks';

export default function SocialLinksInput({
  value = [],
  onChange,
  disabled = false,
  universityLogoUrl = null,
  placeholder = 'Paste a URL...',
}) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  // Clear error when input changes or is cleared
  useEffect(() => {
    setError(null);
  }, [inputValue]);

  /**
   * Add a new link from the input value
   */
  const addLink = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // Parse and validate the URL
    const result = parseSocialLink(trimmed);
    if (result.error) {
      setError(result.error);
      return;
    }

    // Check for duplicate URLs
    if (linkExists(value, result.url)) {
      setError('This link has already been added');
      return;
    }

    // Check for duplicate known social types (e.g., two LinkedIn links)
    if (knownSocialTypeExists(value, result.type)) {
      const platformName = getPlatformDisplayName(result.type);
      setError(`You can only add one ${platformName} link. Each known social type (LinkedIn, X, Instagram, GitHub, Discord, YouTube) can only be added once.`);
      return;
    }

    // Check max limit
    if (value.length >= MAX_SOCIAL_LINKS) {
      setError(`Maximum ${MAX_SOCIAL_LINKS} links allowed`);
      return;
    }

    // Add the link
    onChange([...value, result]);
    setInputValue('');
    setError(null);
  };

  /**
   * Remove a link by URL
   */
  const removeLink = (urlToRemove) => {
    onChange(value.filter((link) => link.url !== urlToRemove));
  };

  /**
   * Handle key press - Enter to add
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLink();
    }
  };

  /**
   * Handle paste - auto-parse pasted URLs immediately
   */
  const handlePaste = (e) => {
    const pastedText = e.clipboardData.getData('text').trim();
    if (pastedText) {
      e.preventDefault();

      const result = parseSocialLink(pastedText);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (linkExists(value, result.url)) {
        setError('This link has already been added');
        return;
      }
      if (knownSocialTypeExists(value, result.type)) {
        const platformName = getPlatformDisplayName(result.type);
        setError(`You can only add one ${platformName} link. Each known social type (LinkedIn, X, Instagram, GitHub, Discord, YouTube) can only be added once.`);
        return;
      }
      if (value.length >= MAX_SOCIAL_LINKS) {
        setError(`Maximum ${MAX_SOCIAL_LINKS} links allowed`);
        return;
      }
      onChange([...value, result]);
    }
  };

  return (
    <div className="space-y-2">
      {/* Current links as chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((link) => (
            <span
              key={link.url}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm
                         rounded-full border transition-colors
                         ${getPlatformColorClasses(link.type)}`}
              title={link.url}
            >
              <SocialLinkIcon type={link.type} size="sm" logoUrl={universityLogoUrl} />
              <span className="max-w-[150px] truncate">
                {getPlatformDisplayName(link.type)}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeLink(link.url)}
                  className="p-0.5 rounded-full hover:text-red-500 hover:bg-red-50
                             dark:hover:bg-red-900/20 transition-colors ml-0.5"
                  aria-label={`Remove ${getPlatformDisplayName(link.type)} link`}
                >
                  <XIcon className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input for adding new links */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                   text-foreground placeholder-muted-foreground
                   disabled:opacity-50"
      />

      {/* Error message */}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        {value.length}/{MAX_SOCIAL_LINKS} links
      </p>
    </div>
  );
}
