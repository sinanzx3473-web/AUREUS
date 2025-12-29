/**
 * CSRF Token Management Utility
 * Handles fetching and attaching CSRF tokens to API requests
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';

let csrfToken: string | null = null;

/**
 * Fetch CSRF token from backend
 */
export async function fetchCsrfToken(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/${API_VERSION}/csrf-token`, {
    method: 'GET',
    credentials: 'include', // Include cookies
  });

  if (!response.ok) {
    throw new Error('Failed to fetch CSRF token');
  }

  const data = await response.json();
  csrfToken = data.csrfToken;
  return csrfToken as string;
}

/**
 * Get current CSRF token (fetch if not available)
 */
export async function getCsrfToken(): Promise<string> {
  if (!csrfToken) {
    return await fetchCsrfToken();
  }
  return csrfToken;
}

/**
 * Clear cached CSRF token (call on 403 errors)
 */
export function clearCsrfToken(): void {
  csrfToken = null;
}

/**
 * Make authenticated API request with CSRF token
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}/api/${API_VERSION}${endpoint}`;
  
  // Get CSRF token for state-changing operations
  const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(
    options.method?.toUpperCase() || 'GET'
  );

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (needsCsrf) {
    try {
      const token = await getCsrfToken();
      headers['X-CSRF-Token'] = token;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      throw new Error('CSRF token required but unavailable');
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies
    });

    // If CSRF token is invalid, clear cache and retry once
    if (response.status === 403 && needsCsrf) {
      const errorData = await response.json();
      if (errorData.error === 'Invalid CSRF token') {
        clearCsrfToken();
        
        // Retry with fresh token
        const newToken = await getCsrfToken();
        headers['X-CSRF-Token'] = newToken;
        
        const retryResponse = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });

        if (!retryResponse.ok) {
          throw new Error(`API request failed: ${retryResponse.statusText}`);
        }

        return await retryResponse.json();
      }
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

/**
 * Initialize CSRF token on app load
 */
export async function initializeCsrf(): Promise<void> {
  // Only initialize if backend is likely available
  // Skip in development when backend might not be running
  if (import.meta.env.PROD) {
    try {
      await fetchCsrfToken();
    } catch {
      // Silently fail in production too - will retry on first API call
    }
  }
}
