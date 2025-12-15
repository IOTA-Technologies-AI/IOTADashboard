const STORAGE_KEY = 'pageAccessByUser';
const ROLE_STORAGE_KEY = 'pageAccessByRole';

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : {};
  } catch (error) {
    console.warn('Failed to parse page access map, resetting', error);
    return {};
  }
};

const hasWindow = () => typeof window !== 'undefined';

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
  return Array.isArray(entry) ? entry : [];
};

export const getPageAccessForRole = (role) => {
  if (!role || !hasWindow()) return [];
  const map = getRoleAccessMap();
  const entry = map[role];
  return Array.isArray(entry) ? entry : [];
};

export const savePageAccessForUser = (userId, paths) => {
  if (!userId || !hasWindow()) return;
  const map = getPageAccessMap();
  map[userId] = Array.from(new Set(paths || []));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
};

export const savePageAccessForRole = (role, paths) => {
  if (!role || !hasWindow()) return;
  const map = getRoleAccessMap();
  map[role] = Array.from(new Set(paths || []));
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

export const resolvePageAccess = (userId, role) => {
  const userPaths = getPageAccessForUser(userId);
  if (Array.isArray(userPaths) && userPaths.length > 0) return userPaths;
  const rolePaths = getPageAccessForRole(role);
  if (Array.isArray(rolePaths) && rolePaths.length > 0) return rolePaths;
  return [];
};
