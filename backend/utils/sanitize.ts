/**
 * Sanitization utilities for user input
 * Prevents NoSQL injection (regex bombs / ReDoS attacks)
 */

/**
 * Escape special regex characters in user input to prevent ReDoS attacks.
 * Use this before passing user input to `new RegExp()`.
 *
 * @example
 * const safe = escapeRegex(userInput);
 * const regex = new RegExp(safe, 'i');
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
