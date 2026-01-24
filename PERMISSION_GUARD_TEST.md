# Permission Guard Testing Instructions

## What Was Fixed

### Problem

Users with revoked permissions could still access pages by typing the URL directly (e.g., `https://dashboard.iotatechnologies.io/dashboard/expense/`).

### Solution

1. **Enhanced PermissionGuard Component** - Added detailed logging and ensured it NEVER renders page content without permission
2. **Reduced Cache TTL** - Changed from 5 minutes to 30 seconds so permission changes take effect faster
3. **Force Refresh Option** - Added ability to bypass cache when fetching permissions
4. **Strict Permission Checking** - Empty permission arrays now properly block all access (except always-allowed paths)

### Changes Made

#### `/next-js/src/auth/guard/permission-guard.jsx`

- Added `permissionCheckComplete` state to ensure guard waits for permission fetch
- Added extensive console logging for debugging
- BLOCKS rendering until permission check completes (shows SplashScreen)
- NEVER renders children if no permission - always redirects to 403
- Explicitly sets empty array when no permissions found (blocks access)

#### `/next-js/src/utils/pageAccess.js`

- Reduced `CACHE_TTL_MS` from 5 minutes to 30 seconds
- Enhanced `fetchUserNavPermissions` to always save cache (even for empty arrays)
- Added `forceRefresh` parameter for bypassing cache
- Better error handling - returns empty array on error (blocks access)

## How to Test

### Test Scenario 1: Revoke Access and Block Direct URL

1. **Setup**: Log in as SuperAdmin
2. **Grant Access**:
   - Go to "Page Access" settings
   - Grant expense page access to a test user (e.g., `test@iotatechnologies.io`)
   - Save permissions
3. **Verify Access Works**:
   - Log in as the test user
   - Navigate to `/dashboard/expense/` - should work
   - Check browser console for logs: `[PermissionGuard] Access granted to: /dashboard/expense`
4. **Revoke Access**:
   - Log back in as SuperAdmin
   - Go to "Page Access" settings
   - REVOKE expense page access for the test user
   - Save permissions
5. **Test Direct URL (This should NOW work)**:
   - Log in as the test user
   - Type URL directly: `https://dashboard.iotatechnologies.io/dashboard/expense/`
   - **Expected Result**: User should see loading screen, then be redirected to 403 page
   - **Browser Console Should Show**:
     ```
     [PermissionGuard] Fetching permissions for email: test@iotatechnologies.io
     [PermissionGuard] Fetched paths: []  (or paths not including /dashboard/expense)
     [PermissionGuard] ACCESS DENIED to: /dashboard/expense
     [PermissionGuard] Blocking render - no permission for: /dashboard/expense
     ```

### Test Scenario 2: Cache Expiry

1. User has access to expense page
2. Admin revokes access
3. User tries to access within 30 seconds - may still have cached permissions
4. Wait 30 seconds for cache to expire
5. User refreshes page - should now be blocked and redirected to 403

### Test Scenario 3: Always-Allowed Paths

These paths should ALWAYS be accessible to any logged-in user:

- `/dashboard` (root)
- `/dashboard/` (root with trailing slash)
- `/dashboard/general/app` (dashboard home)
- `/dashboard/access` (access control - admin only)
- `/dashboard/user/pageAccess` (page access settings)

### Test Scenario 4: SuperAdmin Access

- SuperAdmin should have access to ALL paths regardless of permissions
- Check console log: `[PermissionGuard] User is superAdmin - granting full access`

## Debug Console Logs

Look for these logs in browser console to diagnose issues:

### Normal Access Flow

```
[PermissionGuard] Current state: {pathname, userEmail, role, authLoading, permissionsLoading, allowedPathsCount}
[PermissionGuard] Loading permissions for: {userEmail, role}
[PermissionGuard] Fetching permissions for email: user@example.com
[pageAccess] Fetching fresh user nav permissions for userId: user@example.com
[pageAccess] Fetched 5 permission paths: ["/dashboard/invoice", "/dashboard/expense", ...]
[PermissionGuard] Fetched paths: ["/dashboard/invoice", "/dashboard/expense", ...]
[PermissionGuard] Permission check result: {pathname, hasPermission: true, allowedPaths}
[PermissionGuard] Access granted to: /dashboard/expense
```

### Blocked Access Flow

```
[PermissionGuard] Current state: {pathname, userEmail, role, authLoading: false, permissionsLoading: true, allowedPathsCount: 0}
[PermissionGuard] Fetching permissions for email: user@example.com
[pageAccess] Fetching fresh user nav permissions for userId: user@example.com
[pageAccess] Fetched 0 permission paths: []
[PermissionGuard] No permissions found for user: user@example.com
[PermissionGuard] Permission check result: {pathname, hasPermission: false, allowedPaths: []}
[PermissionGuard] ACCESS DENIED to: /dashboard/expense
[PermissionGuard] User has no permission. Redirecting to 403.
[PermissionGuard] Blocking render - no permission for: /dashboard/expense
```

## Manual Cache Clear (If Needed)

If permissions aren't updating as expected, manually clear cache:

1. Open browser console
2. Run:
   ```javascript
   localStorage.removeItem("userNavPermissions");
   localStorage.removeItem("userNavPermissionsCacheTTL");
   ```
3. Refresh the page

## Backend Verification

Verify the backend is returning correct permissions:

1. Open Network tab in browser DevTools
2. Filter for: `user-nav-permissions`
3. Look for request: `GET /user-nav-permissions/{email}/paths`
4. Check response - should be: `{"paths": ["/dashboard/expense", ...]}`
5. If paths array is empty `{"paths": []}` - user has no permissions (correct)

## Common Issues

### Issue: User still sees page after revocation

**Possible Causes**:

1. Cache hasn't expired (wait 30 seconds)
2. LocalStorage has stale data (clear manually)
3. User is SuperAdmin (check role)
4. Path is in always-allowed list

### Issue: "Loading..." screen never goes away

**Possible Causes**:

1. API request failing (check Network tab)
2. User email not available (check console logs)
3. Auth context not loading properly

### Issue: All users blocked from all pages

**Possible Causes**:

1. Backend API not returning permissions
2. Database query failing
3. User email format mismatch

## Production Deployment

After testing locally:

1. Commit changes to `dev` branch
2. Test on staging environment
3. Verify with multiple test users
4. Deploy to production
5. Monitor logs for any access issues

## Rollback Plan

If issues occur in production:

1. Revert commit: `git revert <commit-hash>`
2. Increase cache TTL back to 5 minutes temporarily
3. Debug with extended logging
4. Fix and redeploy
