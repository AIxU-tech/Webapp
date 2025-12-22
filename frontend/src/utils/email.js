/**
 * Email Validation Utilities
 *
 * Shared validation functions for email domain checking and extraction.
 * Note: WHITELISTED_DOMAINS must match backend/utils/validation.py
 */

// Temporary whitelist for non-.edu domains (testing/special access)
export const WHITELISTED_DOMAINS = ['peekz.com'];

/**
 * Extracts the domain portion from an email address
 * @example getEmailDomain('user@example.com') // 'example.com'
 */
export const getEmailDomain = (email) => {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : '';
};

/**
 * Extracts the subdomain identifier from a .edu email (removes ".edu" suffix)
 * @example extractEduSubdomain('student@uoregon.edu') // 'uoregon'
 * @example extractEduSubdomain('user@cs.mit.edu') // 'cs.mit'
 */
export const extractEduSubdomain = (email) => {
  const domain = getEmailDomain(email);
  if (!domain || !domain.endsWith('.edu')) return null;
  return domain.slice(0, -4);
};

/** Checks if an email has a .edu domain */
export const isEduEmail = (email) => {
  return getEmailDomain(email).endsWith('.edu');
};

/** Checks if an email domain is in the temporary whitelist */
export const isWhitelistedEmail = (email) => {
  return WHITELISTED_DOMAINS.includes(getEmailDomain(email));
};

/** Checks if an email is valid for registration (.edu or whitelisted) */
export const isValidRegistrationEmail = (email) => {
  return isEduEmail(email) || isWhitelistedEmail(email);
};
