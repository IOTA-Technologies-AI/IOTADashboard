import axios from 'axios';

const STORAGE_KEY = 'pageAccessByUser';
const ROLE_STORAGE_KEY = 'pageAccessByRole';
const CACHE_TTL_KEY = 'pageAccessCacheTTL';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

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

// Set cache TTL for a role
const setCacheTTL = (role) => {
  if (!hasWindow()) return;
  const ttlMap = safeParse(window.localStorage.getItem(CACHE_TTL_KEY));
  ttlMap[role] = Date.now() + CACHE_TTL_MS;
  window.localStorage.setItem(CACHE_TTL_KEY, JSON.stringify(ttlMap));
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
  // First check user-specific paths
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
  // First check user-specific paths
  const userPaths = getPageAccessForUser(userId);
  if (Array.isArray(userPaths) && userPaths.length > 0) return userPaths;

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
