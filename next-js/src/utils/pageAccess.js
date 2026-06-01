import axios from 'axios';

// Use same API base URL as apiHelper.js for consistency
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://staging-iotaapiserver-s572.encr.app/';

const STORAGE_KEY = 'pageAccessByUser';
const ROLE_STORAGE_KEY = 'pageAccessByRole';
const USER_PERM_STORAGE_KEY = 'userNavPermissions';
const CACHE_TTL_KEY = 'pageAccessCacheTTL';
const USER_CACHE_TTL_KEY = 'userNavPermissionsCacheTTL';
const VERSION_CHECK_TTL_KEY = 'permVersionCheckTTL';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours - permissions are cached for a full day
const VERSION_CHECK_TTL_MS = 5 * 60 * 1000; // 5 minutes - how often to silently re-validate in background

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

// Fetch role-based permissions from backend API
export const fetchNavPermissionsForRole = async (role) => {
  if (!role) return [];
  try {
    const response = await axios.get(
      `${API_BASE_URL}nav-permissions/role/${encodeURIComponent(role)}`
    );
    const menuKeys = response.data?.menuKeys || [];
    if (menuKeys.length > 0) {
      savePageAccessForRole(role, menuKeys);
      setCacheTTL(role);
    }
    return menuKeys;
  } catch (error) {
    console.warn('Failed to fetch role-based permissions from backend:', error.message);
    return [];
  }
};

// Preferred API for role-based permissions (alias)
export const fetchRoleBasedNavPermissions = fetchNavPermissionsForRole;

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

// ============================================================================
// Version check helpers — 5-minute TTL, independent of the 24h paths cache
// Used to silently re-validate permissions in the background without a visible refresh
// ============================================================================

export const isVersionCheckDue = (userId) => {
  if (!userId || !hasWindow()) return true;
  const ttlMap = safeParse(window.localStorage.getItem(VERSION_CHECK_TTL_KEY));
  const expiry = ttlMap[userId];
  return !expiry || Date.now() > expiry;
};

export const markVersionCheckDone = (userId) => {
  if (!userId || !hasWindow()) return;
  const ttlMap = safeParse(window.localStorage.getItem(VERSION_CHECK_TTL_KEY));
  ttlMap[userId] = Date.now() + VERSION_CHECK_TTL_MS;
  window.localStorage.setItem(VERSION_CHECK_TTL_KEY, JSON.stringify(ttlMap));
};

export const clearVersionCheck = (userId) => {
  if (!hasWindow()) return;
  const ttlMap = safeParse(window.localStorage.getItem(VERSION_CHECK_TTL_KEY));
  if (userId) {
    delete ttlMap[userId];
  } else {
    window.localStorage.removeItem(VERSION_CHECK_TTL_KEY);
    return;
  }
  window.localStorage.setItem(VERSION_CHECK_TTL_KEY, JSON.stringify(ttlMap));
};

// Fetch user-specific nav permissions from backend (LEGACY - FOR USER-SPECIFIC OVERRIDES)
export const fetchUserNavPermissions = async (userId, forceRefresh = false) => {
  if (!userId) {
    console.warn('[pageAccess] No userId provided to fetchUserNavPermissions');
    return { paths: [], hasExplicitPermissions: false };
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
        // Return consistent shape — if it's cached, it was explicitly configured
        return { paths: cached, hasExplicitPermissions: true };
      }
    }

    console.log('[pageAccess] Fetching fresh user nav permissions for userId:', userId);
    const response = await axios.get(
      `${API_BASE_URL}user-nav-permissions/${encodeURIComponent(userId)}/paths`
    );

    const paths = response.data?.paths || [];
    const hasExplicitPermissions = response.data?.hasExplicitPermissions ?? false;
    console.log(
      '[pageAccess] Fetched',
      paths.length,
      'permission paths, hasExplicit:',
      hasExplicitPermissions
    );

    // Save enabled paths to cache
    saveUserNavPermissionPaths(userId, paths);
    setUserCacheTTL(userId);

    // Return both the paths and whether the user has been explicitly configured.
    // Callers use hasExplicitPermissions to decide whether to fall back to role defaults.
    return { paths, hasExplicitPermissions };
  } catch (error) {
    console.error('[pageAccess] Failed to fetch user nav permissions:', error.message);
    // On error, assume not configured → callers fall back to role defaults
    return { paths: [], hasExplicitPermissions: false };
  }
};

// Check if user has permission to access a specific path
/**
 * Maps a full path to its menu key
 * /dashboard/expense -> expense
 * /dashboard/expense/new -> expense:create (requires expense:create permission)
 * /dashboard/expense/edit/:id -> expense:edit (requires expense:edit permission)
 * /dashboard/hr/employee -> hr:employee
 */
export const pathToMenuKey = (pathname) => {
  if (!pathname) return null;

  // Remove /dashboard prefix and trailing slashes
  let path = pathname.replace(/^\/dashboard\/?/, '').replace(/\/$/, '');

  if (!path) return 'dashboard'; // /dashboard maps to 'dashboard'

  // Extract action from path
  const parts = path.split('/');
  const menuPart = parts[0]; // e.g., "expense", "invoice", "hr"
  const actionPart = parts[1]; // e.g., "new", "edit", details

  // Map common actions to permission keys
  let action = '';
  if (actionPart === 'new') {
    action = ':create';
  } else if (
    actionPart === 'edit' ||
    actionPart?.match(/edit\/.*/) ||
    actionPart?.match(/^[^/]+\/edit$/)
  ) {
    action = ':edit';
  } else if (
    actionPart === 'delete' ||
    actionPart?.match(/delete\/.*/) ||
    actionPart?.match(/^[^/]+\/delete$/)
  ) {
    action = ':delete';
  }

  // Construct menu key
  const baseKey = parts.slice(0, 2).join(':'); // e.g., "hr:employee"
  return action ? baseKey + action : baseKey;
};

/**
 * Check if user has permission for a specific path
 * @param {string[]} allowedPaths - Array of allowed paths from database (e.g., ['/dashboard/expense/new'])
 * @param {string} pathname - The path to check (e.g., /dashboard/expense/new)
 * @returns {boolean} true if user has permission
 */
export const hasPathPermission = (allowedPaths, pathname) => {
  if (!pathname || !Array.isArray(allowedPaths)) return false;

  // SuperAdmin wildcard - grants access to everything
  if (allowedPaths.includes('*')) {
    console.log('[hasPathPermission] SuperAdmin wildcard detected - granting access to:', pathname);
    return true;
  }

  // Always allow dashboard root
  if (pathname === '/dashboard' || pathname === '/dashboard/') return true;

  // Normalize paths: remove trailing slashes for comparison
  const normalizedPathname = pathname.replace(/\/$/, '');
  console.log('[hasPathPermission] Checking:', { pathname: normalizedPathname, allowedPaths });

  // Check exact match or if pathname starts with an allowed path
  const hasPermission = allowedPaths.some((allowedPath) => {
    const normalizedAllowed = allowedPath.replace(/\/$/, '');
    return (
      normalizedPathname === normalizedAllowed ||
      normalizedPathname.startsWith(normalizedAllowed + '/')
    );
  });

  if (hasPermission) {
    console.log('[hasPathPermission] ✅ Permission granted for:', normalizedPathname);
  } else {
    console.log('[hasPathPermission] ❌ Permission denied for:', normalizedPathname);
  }

  return hasPermission;
};
