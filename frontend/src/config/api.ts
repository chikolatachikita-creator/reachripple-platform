/**
 * Shared API configuration constants
 * Single source of truth for API URL construction
 */

/** Full API base URL (e.g., http://localhost:3001/api) */
function resolveApiBaseUrl(): string {
  const configuredUrl = process.env.REACT_APP_API_BASE_URL?.trim();
  if (configuredUrl && /^https?:\/\//.test(configuredUrl)) {
    return configuredUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const { hostname } = window.location;

    if (hostname === 'reachripple-live-web.onrender.com' || hostname.endsWith('.onrender.com')) {
      return 'https://reachripple-api.onrender.com/api';
    }

    if (hostname.endsWith('.loca.lt')) {
      return 'https://legal-breads-battle.loca.lt/api';
    }
  }

  return 'http://localhost:3001/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

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

/**
 * Route external (third-party) image URLs through our /api/img proxy so
 * they get resized, re-encoded as WebP, cached, and fall back to a
 * placeholder on failure. Local uploads and data URIs pass through
 * unchanged. Pass `width` to request a specific render width.
 */
export function proxyImage(
  src: string | undefined | null,
  width?: number
): string {
  if (!src) return '/placeholder-profile.svg';
  if (src.startsWith('data:') || src.startsWith('/')) return src;
  // Anything served by our own API host is already optimised; skip proxy.
  if (src.startsWith(API_HOST)) return src;
  if (!/^https?:\/\//.test(src)) return src;
  const params = new URLSearchParams({ u: src });
  if (width && width > 0) params.set('w', String(Math.round(width)));
  return `${API_BASE_URL}/img?${params.toString()}`;
}

