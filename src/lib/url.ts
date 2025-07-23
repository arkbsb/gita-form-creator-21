/**
 * Utility functions for handling URLs in different environments
 */

/**
 * Gets the base URL for the application
 * Uses environment variable if available, otherwise falls back to window.location.origin
 */
export function getBaseUrl(): string {
  // In production, this will be injected by nginx from environment variables
  if (typeof window !== 'undefined' && (window as any).__APP_BASE_URL__) {
    return (window as any).__APP_BASE_URL__;
  }
  
  // Fallback to current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Server-side fallback (shouldn't be needed for this app)
  return 'http://localhost:8080';
}

/**
 * Constructs a complete URL for a form
 */
export function getFormUrl(slug: string): string {
  return `${getBaseUrl()}/form/${slug}`;
}

/**
 * Constructs a complete URL for any path
 */
export function getAppUrl(path: string = ''): string {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}