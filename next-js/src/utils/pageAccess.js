import axios from 'axios';

// Use same API base URL as apiHelper.js for consistency
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://staging-iotaapiserver-s572.encr.app/';

const STORAGE_KEY = 'pageAccessByUser';
const ROLE_STORAGE_KEY = 'pageAccessByRole';
const USER_PERM_STORAGE_KEY = 'userNavPermissions';
const CACHE_TTL_KEY = 'pageAccessCacheTTL';
const USER_CACHE_TTL_KEY = 'userNavPermissionsCacheTTL';
const CACHE_TTL_MS = 30 * 1000; // 30 seconds cache - short TTL to ensure permissions refresh quickly

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : {};
  } catch (error) {
    console.warn('Failed to parse page access map, resetting', error);
    return {};
  }
};

const hasWindow = () => typeof window !== 'undefined';

const toSafeArray = (value) => (Array.isArray(value) ? value : []);

// Check if cache is still valid
const isCacheValid = (role) => {
  if (!hasWindow()) return false;
  const ttlMap = safeParse(window.localStorage.getItem(CACHE_TTL_KEY));
  const expiry = ttlMap[role];
  return expiry && Date.now() < expiry;
};

// Check if user permission cache is valid
const isUserCacheValid = (userId) => {
  if (!hasWindow()) return false;
  const ttlMap = safeParse(window.localStorage.getItem(USER_CACHE_TTL_KEY));
  const expiry = ttlMap[userId];
  return expiry && Date.now() < expiry;
};

// Set cache TTL for a role
const setCacheTTL = (role) => {
  if (!hasWindow()) return;
  const ttlMap = safeParse(window.localStorage.getItem(CACHE_TTL_KEY));
  ttlMap[role] = Date.now() + CACHE_TTL_MS;
  window.localStorage.setItem(CACHE_TTL_KEY, JSON.stringify(ttlMap));
};

// Set cache TTL for a user
const setUserCacheTTL = (userId) => {
  if (!hasWindow()) return;
  const ttlMap = safeParse(window.localStorage.getItem(USER_CACHE_TTL_KEY));
  ttlMap[userId] = Date.now() + CACHE_TTL_MS;
  window.localStorage.setItem(USER_CACHE_TTL_KEY, JSON.stringify(ttlMap));
};

export const getPageAccessMap = () => {
  if (!hasWindow()) return {};
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
};

export const getRoleAccessMap = () => {
  if (!hasWindow()) return {};
  return safeParse(window.localStorage.getItem(ROLE_STORAGE_KEY));
};

export const getPageAccessForUser = (userId) => {
  if (!userId || !hasWindow()) return [];
  const map = getPageAccessMap();
  const entry = map[userId];
  return toSafeArray(entry);
};

export const getPageAccessForRole = (role) => {
  if (!role || !hasWindow()) return [];
  const map = getRoleAccessMap();
  const entry = map[role];
  return toSafeArray(entry);
};

// Fetch permissions from backend API
export const fetchNavPermissionsForRole = async (role) => {
  if (!role) return [];
  try {
    const response = await axios.get(`/api/nav-permissions/${role}`);
    const paths = response.data?.paths || [];
    if (paths.length > 0) {
      savePageAccessForRole(role, paths);
      setCacheTTL(role);
    }
    return paths;
  } catch (error) {
    console.warn('Failed to fetch nav permissions from backend:', error.message);
    return [];
  }
};

export const savePageAccessForUser = (userId, paths) => {
  if (!userId || !hasWindow()) return;
  const map = getPageAccessMap();
  map[userId] = Array.from(new Set(toSafeArray(paths)));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
};

export const savePageAccessForRole = (role, paths) => {
  if (!role || !hasWindow()) return;
  const map = getRoleAccessMap();
  map[role] = Array.from(new Set(toSafeArray(paths)));
  window.localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(map));
};

export const removePageAccessForUser = (userId) => {
  if (!userId || !hasWindow()) return;
  const map = getPageAccessMap();
  delete map[userId];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
};

export const removePageAccessForRole = (role) => {
  if (!role || !hasWindow()) return;
  const map = getRoleAccessMap();
  delete map[role];
  window.localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(map));
};

// Clear cache to force refresh from backend
export const clearPageAccessCache = (role) => {
  if (!hasWindow()) return;
  const ttlMap = safeParse(window.localStorage.getItem(CACHE_TTL_KEY));
  if (role) {
    delete ttlMap[role];
  } else {
    // Clear all
    window.localStorage.removeItem(CACHE_TTL_KEY);
    window.localStorage.removeItem(ROLE_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(CACHE_TTL_KEY, JSON.stringify(ttlMap));
};

export const resolvePageAccess = (userId, role) => {
  // First check user-specific permissions from userNavPermissions cache
  if (userId) {
    const userPermPaths = getUserNavPermissionPaths(userId);
    if (Array.isArray(userPermPaths) && userPermPaths.length > 0) return userPermPaths;
  }

  // Then check legacy user-specific paths
  const userPaths = getPageAccessForUser(userId);
  if (Array.isArray(userPaths) && userPaths.length > 0) return userPaths;

  // Then check role-based paths from cache
  const rolePaths = getPageAccessForRole(role);
  if (Array.isArray(rolePaths) && rolePaths.length > 0) return rolePaths;

  // Return empty - the layout will trigger a fetch if needed
  return [];
};

// Async version that fetches from backend if cache is stale
export const resolvePageAccessAsync = async (userId, role) => {
  // First check user-specific permissions from userNavPermissions table
  if (userId && isUserCacheValid(userId)) {
    const userPaths = getUserNavPermissionPaths(userId);
    if (Array.isArray(userPaths) && userPaths.length > 0) return userPaths;
  }

  // Try fetching user-specific permissions from backend
  if (userId) {
    const userPerms = await fetchUserNavPermissions(userId);
    if (userPerms.length > 0) return userPerms;
  }

  // Fall back to role-based permissions
  // Check if we have valid cached role paths
  if (isCacheValid(role)) {
    const rolePaths = getPageAccessForRole(role);
    if (Array.isArray(rolePaths) && rolePaths.length > 0) return rolePaths;
  }

  // Fetch from backend
  const fetchedPaths = await fetchNavPermissionsForRole(role);
  if (fetchedPaths.length > 0) return fetchedPaths;

  // Fallback to local cache even if stale
  const stalePaths = getPageAccessForRole(role);
  return Array.isArray(stalePaths) ? stalePaths : [];
};

// ============================================================================
// User-specific Nav Permissions (from userNavPermissions table)
// ============================================================================

// Get cached user nav permission paths
export const getUserNavPermissionPaths = (userId) => {
  if (!userId || !hasWindow()) return [];
  const map = safeParse(window.localStorage.getItem(USER_PERM_STORAGE_KEY));
  const entry = map[userId];
  return toSafeArray(entry);
};

// Save user nav permission paths to cache
export const saveUserNavPermissionPaths = (userId, paths) => {
  if (!userId || !hasWindow()) return;
  const map = safeParse(window.localStorage.getItem(USER_PERM_STORAGE_KEY));
  map[userId] = Array.from(new Set(toSafeArray(paths)));
  window.localStorage.setItem(USER_PERM_STORAGE_KEY, JSON.stringify(map));
};

// Clear user nav permission cache
export const clearUserNavPermissionCache = (userId) => {
  if (!hasWindow()) return;
  if (userId) {
    const map = safeParse(window.localStorage.getItem(USER_PERM_STORAGE_KEY));
    delete map[userId];
    window.localStorage.setItem(USER_PERM_STORAGE_KEY, JSON.stringify(map));

    const ttlMap = safeParse(window.localStorage.getItem(USER_CACHE_TTL_KEY));
    delete ttlMap[userId];
    window.localStorage.setItem(USER_CACHE_TTL_KEY, JSON.stringify(ttlMap));
  } else {
    window.localStorage.removeItem(USER_PERM_STORAGE_KEY);
    window.localStorage.removeItem(USER_CACHE_TTL_KEY);
  }
};

// Fetch user-specific nav permissions from backend
export const fetchUserNavPermissions = async (userId, forceRefresh = false) => {
  if (!userId) {
    console.warn('[pageAccess] No userId provided to fetchUserNavPermissions');
    return [];
  }

  try {
    // Check cache first unless force refresh
    if (!forceRefresh && isUserCacheValid(userId)) {
      const cached = getUserNavPermissionPaths(userId);
      if (cached && cached.length > 0) {
        console.log(
          '[pageAccess] Using cached permissions for:',
          userId,
          '- paths:',
          cached.length
        );
        return cached;
      }
    }

    console.log('[pageAccess] Fetching fresh user nav permissions for userId:', userId);
    const response = await axios.get(
      `${API_BASE_URL}user-nav-permissions/${encodeURIComponent(userId)}/paths`
    );

    const paths = response.data?.paths || [];
    console.log('[pageAccess] Fetched', paths.length, 'permission paths:', paths);

    // Always save to cache, even if empty (to know user has no permissions)
    saveUserNavPermissionPaths(userId, paths);
    setUserCacheTTL(userId);

    return paths;
  } catch (error) {
    console.error('[pageAccess] Failed to fetch user nav permissions:', error.message);
    // On error, return empty array to be safe (block access)
    return [];
  }
};

// Check if user has permission to access a specific path
export const hasPathPermission = (allowedPaths, targetPath) => {
  if (!targetPath || !Array.isArray(allowedPaths)) return false;

  // SuperAdmin wildcard - grants access to everything
  if (allowedPaths.includes('*')) {
    console.log(
      '[hasPathPermission] SuperAdmin wildcard detected - granting access to:',
      targetPath
    );
    return true;
  }

  // Always allow dashboard root
  if (targetPath === '/dashboard' || targetPath === '/dashboard/') return true;

  // Normalize target path by removing trailing slash
  const normalizedTarget =
    targetPath.endsWith('/') && targetPath !== '/' ? targetPath.slice(0, -1) : targetPath;

  return allowedPaths.some((allowedPath) => {
    // Normalize allowed path
    const normalizedAllowed =
      allowedPath.endsWith('/') && allowedPath !== '/' ? allowedPath.slice(0, -1) : allowedPath;

    // Exact match only - no prefix matching
    // Users need explicit permission for each page
    return normalizedTarget === normalizedAllowed;
  });
};
