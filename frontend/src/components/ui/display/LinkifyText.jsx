/**
 * LinkifyText Component
 *
 * Wraps children and automatically converts URLs in text nodes into
 * clickable links. Uses react-linkify-it under the hood.
 *
 * Security:
 * - All links open in a new tab (target="_blank")
 * - rel="noopener noreferrer" prevents reverse tabnapping and referrer leakage
 * - URLs are sanitized by the library to prevent XSS
 *
 * @component
 * @example
 * <LinkifyText>
 *   <p>Check out https://example.com for more info</p>
 * </LinkifyText>
 */

import { LinkIt, urlRegex } from 'react-linkify-it';

/**
 * Render function for matched URLs.
 * Returns a secure anchor element styled in the primary (blue) color.
 *
 * @param {string} match - The matched URL string
 * @param {string} key - Unique key for React rendering
 * @returns {JSX.Element} A styled, secure anchor element
 */
function renderLink(match, key) {
  const href = match.startsWith('http') ? match : `https://${match}`;
  return (
    <a
      key={key}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 hover:text-blue-600 hover:underline break-all"
    >
      {match}
    </a>
  );
}

export default function LinkifyText({ children }) {
  return (
    <LinkIt component={renderLink} regex={urlRegex}>
      {children}
    </LinkIt>
  );
}
