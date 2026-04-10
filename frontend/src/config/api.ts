/**
 * Shared API configuration constants
 * Single source of truth for API URL construction
 */

/** Full API base URL (e.g., http://localhost:3001/api) */
export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

/** API host without the /api suffix (for image URLs, uploads, etc.) */
export const API_HOST =
  API_BASE_URL.replace(/\/api\/?$/, '') || 'http://localhost:3001';

/**
 * Build a full URL for a server-hosted asset (image, upload, avatar, etc.)
 * Returns the original path if it's already an absolute URL or data URI.
 */
export function getAssetUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:')
  ) {
    return path;
  }
  return `${API_HOST}${path.startsWith('/') ? '' : '/'}${path}`;
}
