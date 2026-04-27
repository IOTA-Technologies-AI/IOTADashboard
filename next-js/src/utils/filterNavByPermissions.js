/**
 * Filter navigation items based on user permissions.
 * Nav items use `item.path` (not `item.href`).
 * Sections use `item.items` as the children array.
 */
export const filterNavByPermissions = (navItems, allowedPaths = []) => {
  if (!Array.isArray(navItems) || !Array.isArray(allowedPaths)) {
    return navItems;
  }

  // SuperAdmin wildcard — show everything
  if (allowedPaths.includes('*')) return navItems;

  // Helper: normalise a path for comparison
  const norm = (p) => (p && p.endsWith('/') && p !== '/' ? p.slice(0, -1) : p);

  // Helper: is this specific path allowed?
  const isPathAllowed = (path) => {
    if (!path) return true; // items without a path (labels/separators) are always shown
    const n = norm(path);
    return allowedPaths.some((ap) => {
      const na = norm(ap);
      return n === na || n.startsWith(na + '/');
    });
  };

  // Helper: does this item or any of its descendants have an allowed path?
  const isItemAllowed = (item) => {
    if (isPathAllowed(item.path)) return true;
    if (Array.isArray(item.children)) return item.children.some(isItemAllowed);
    return false;
  };

  // Recursively filter an array of nav items (used for `children` arrays)
  const filterItems = (items) =>
    items
      .map((item) => {
        if (!Array.isArray(item.children)) return item;
        const filteredChildren = filterItems(item.children);
        return { ...item, children: filteredChildren };
      })
      .filter(isItemAllowed);

  // Top-level navData is an array of *sections* with a `subheader` + `items` array
  // Each section's items are the actual nav items
  return navItems
    .map((section) => {
      // If it looks like a nav section (has `items`), filter its items
      if (Array.isArray(section.items)) {
        return { ...section, items: filterItems(section.items) };
      }
      // Otherwise treat it as a plain nav item
      return section;
    })
    .filter((section) => {
      if (Array.isArray(section.items)) return section.items.length > 0;
      return isItemAllowed(section);
    });
};
