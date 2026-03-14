/**
 * JWT Authorization Enhancement for Permission Guards
 *
 * This module provides JWT extraction and server-side permission verification.
 * Since we're on Encore (backend), we can enhance the existing permission checks
 * by extracting JWT from Authorization header and validating it server-side.
 *
 * Current Flow:
 * 1. Frontend: Gets user from AuthContext (Supabase OAuth)
 * 2. Frontend: Calls /user-nav-permissions/{userId}/paths with user email
 * 3. Backend: Returns allowed paths based on user email
 * 4. Frontend: PermissionGuard checks paths against current pathname
 *
 * Enhanced Flow with JWT:
 * 1. Frontend: Extracts JWT token from Supabase session
 * 2. Frontend: Sends JWT in Authorization header: "Bearer {token}"
 * 3. Backend: Decodes JWT to get user info (no need for email parameter)
 * 4. Backend: Validates JWT signature and expiry
 * 5. Backend: Extracts userId/email from JWT claims
 * 6. Backend: Returns permissions based on verified user
 * 7. Frontend: Uses permissions as before
 */

import axios from 'axios';

/**
 * Extract JWT token from browser localStorage (Supabase session storage)
 * Supabase stores auth data in localStorage under key: sb-{PROJECT_ID}-auth-token
 */
export const extractJWTFromSession = () => {
  if (typeof window === 'undefined') return null;

  try {
    // Try to get from Supabase session storage
    // The key pattern is: sb-{projectId}-auth-token
    const keys = Object.keys(window.localStorage);
    const authKey = keys.find((key) => key.includes('auth-token'));

    if (!authKey) {
      console.warn('[JWT] No auth token found in localStorage');
      return null;
    }

    const sessionData = JSON.parse(window.localStorage.getItem(authKey));

    // Supabase JS v2 stores the token directly: { access_token, refresh_token, ... }
    // Supabase JS v1 / some wrappers wrap it: { session: { access_token, ... } }
    const token = sessionData?.access_token || sessionData?.session?.access_token || null;

    if (!token) {
      console.warn('[JWT] No access_token in session');
      return null;
    }

    return token;
  } catch (error) {
    console.error('[JWT] Failed to extract JWT:', error.message);
    return null;
  }
};

/**
 * Get user info from JWT (client-side decoding)
 * Note: This is NOT cryptographic validation, just decoding
 * For security-critical operations, backend should validate signature
 */
export const decodeJWT = (token) => {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[JWT] Invalid token format');
      return null;
    }

    // Decode payload (base64url to base64)
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');

    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('[JWT] Failed to decode JWT:', error.message);
    return null;
  }
};

/**
 * Fetch user permissions with JWT authentication
 * Backend validates JWT and uses embedded user info instead of relying on email parameter
 */
export const fetchUserPermissionsWithJWT = async (forceRefresh = false) => {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'https://staging-iotaapiserver-s572.encr.app/';

  try {
    const token = extractJWTFromSession();
    if (!token) {
      console.warn('[JWT] No JWT token available');
      return [];
    }

    const response = await axios.get(`${API_BASE_URL}user-nav-permissions/paths`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const paths = response.data?.paths || [];
    console.log('[JWT] Fetched permissions via JWT:', paths.length, 'paths');
    return paths;
  } catch (error) {
    console.error('[JWT] Failed to fetch permissions with JWT:', error.message);
    return [];
  }
};

/**
 * Validate JWT expiry
 */
export const isJWTValid = (token) => {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return false;

  const expiryTime = decoded.exp * 1000; // exp is in seconds
  return Date.now() < expiryTime;
};

/**
 * Get user info from JWT
 */
export const getUserFromJWT = (token) => {
  const decoded = decodeJWT(token);
  if (!decoded) return null;

  return {
    id: decoded.sub,
    email: decoded.email,
    roles: decoded.roles || [],
    aud: decoded.aud,
  };
};

export const getJWTUserInfo = () => {
  const token = extractJWTFromSession();
  if (!token) return null;

  if (!isJWTValid(token)) {
    console.warn('[JWT] Token expired');
    return null;
  }

  return getUserFromJWT(token);
};
