/**
 * Validation Utilities
 *
 * Reusable format validation for email, phone, etc.
 * Use for forms and API payloads; keep in sync with backend/utils/validation.py where applicable.
 */

const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const EMAIL_MAX_LEN = 254;

/**
 * Validate email format (optional field: empty is valid).
 * @param {string} email
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateEmailFormat(email) {
  const s = typeof email === 'string' ? email.trim() : '';
  if (!s) return { valid: true };
  if (s.length > EMAIL_MAX_LEN) return { valid: false, error: 'Email address is too long' };
  if (!EMAIL_FORMAT_RE.test(s)) return { valid: false, error: 'Please enter a valid email address' };
  return { valid: true };
}

/**
 * Validate phone format: 7–15 digits, optional +, spaces, dashes, parens, dots (optional field: empty is valid).
 * @param {string} phone
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePhoneFormat(phone) {
  const s = typeof phone === 'string' ? phone.trim() : '';
  if (!s) return { valid: true };
  const digits = s.replace(/\D/g, '');
  if (digits.length === 0) {
    return { valid: false, error: 'Please enter a valid phone number (digits only, with optional +, spaces, or dashes)' };
  }
  if (digits.length < 7 || digits.length > 15) {
    return { valid: false, error: 'Phone number must be between 7 and 15 digits' };
  }
  return { valid: true };
}

/**
 * Auto-format a phone number as US format: (XXX) XXX-XXXX.
 * International numbers (starting with +) are left unformatted.
 * @param {string} value - Raw input value
 * @returns {string} Formatted phone string
 */
export function formatUSPhone(value) {
  if (!value) return '';
  // Leave international numbers unformatted
  if (value.startsWith('+')) return value;

  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}
