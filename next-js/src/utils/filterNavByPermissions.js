/**
 * Filter navigation items based on user permissions
 * Hides menu items that user doesn't have access to
 */
export const filterNavByPermissions = (navItems, allowedPaths = []) => {
  if (!Array.isArray(navItems) || !Array.isArray(allowedPaths)) {
    return navItems;
  }

  // Helper to check if a path is allowed
  const isPathAllowed = (path) => {
    if (!path) return true; // Items without path are always shown

    // Normalize paths by removing trailing slash
    const normalizedPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;

    return allowedPaths.some((allowedPath) => {
      const normalizedAllowed =
        allowedPath.endsWith('/') && allowedPath !== '/' ? allowedPath.slice(0, -1) : allowedPath;

      // Exact match
      if (normalizedPath === normalizedAllowed) return true;

      // If item has children, parent is allowed if any child is allowed
      return false;
    });
  };

  // Helper to check if any child is allowed
  const hasAllowedChild = (children = []) =>
    children.some((child) => {
      if (isPathAllowed(child.href)) return true;
      if (child.children) return hasAllowedChild(child.children);
      return false;
    });

  // Recursively filter nav items
  return navItems
    .map((item) => {
      // If item has children, recursively filter them
      if (item.children && Array.isArray(item.children)) {
        const filteredChildren = filterNavByPermissions(item.children, allowedPaths);

        return {
          ...item,
          children: filteredChildren.length > 0 ? filteredChildren : [],
        };
      }

      return item;
    })
    .filter((item) => {
      // Always show items without a href (separators, labels, etc)
      if (!item.href) return true;

      // Always show dashboard home
      if (item.href === '/dashboard' || item.href === '/dashboard/') return true;

      // Show if path is allowed
      if (isPathAllowed(item.href)) return true;

      // Show if any child is allowed (parent menus)
      if (item.children && hasAllowedChild(item.children)) return true;

      // Hide if not allowed
      return false;
    });
};
