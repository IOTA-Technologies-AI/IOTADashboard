'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import ListItem from '@mui/material/ListItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemButton from '@mui/material/ListItemButton';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import {
  fetchRoles,
  fetchNavPermissions,
  refreshNavPermissionsCache,
  setUserNavPermissions,
  fetchUserNavPermissions,
  grantDefaultPermissions,
  fetchEnterpriseAppUsers,
  addEnterpriseAppUser,
  removeEnterpriseAppUser,
} from 'src/utils/apiHelper';
import { clearPermissionCache } from 'src/auth/guard/permission-guard';
import { clearVersionCheck, clearUserNavPermissionCache } from 'src/utils/pageAccess';

import { Iconify } from 'src/components/iconify';

import { RoleGuard } from 'src/auth/guard';
import { useAuthContext } from 'src/auth/hooks';
import { useMicrosoftUsers } from 'src/auth/hooks/use-microsoft-users';

// ----------------------------------------------------------------------

// Group users by role
const groupUsersByRole = (users, roles) => {
  const roleMap = {};
  roles.forEach((role) => {
    roleMap[role.id] = role.name;
  });

  const groups = {
    superAdmin: { label: 'Super Admins', users: [] },
    admin: { label: 'Admins', users: [] },
    manager: { label: 'Managers', users: [] },
    regular: { label: 'Regular Users', users: [] },
    unassigned: { label: 'Unassigned', users: [] },
  };

  users.forEach((user) => {
    const roleName = roleMap[user.roleId] || 'regular';
    const normalizedRole = roleName.toLowerCase().replace(/\s+/g, '');

    if (groups[normalizedRole]) {
      groups[normalizedRole].users.push(user);
    } else if (roleName.toLowerCase().includes('super')) {
      groups.superAdmin.users.push(user);
    } else if (roleName.toLowerCase().includes('admin')) {
      groups.admin.users.push(user);
    } else if (roleName.toLowerCase().includes('manager')) {
      groups.manager.users.push(user);
    } else {
      groups.regular.users.push(user);
    }
  });

  return groups;
};

// Group nav permissions by mainMenu
const groupNavPermissions = (permissions) => {
  const groups = {};

  permissions.forEach((perm) => {
    const mainMenu = perm.mainMenu || 'Other';

    if (!groups[mainMenu]) {
      groups[mainMenu] = {
        mainMenu,
        items: [],
      };
    }

    groups[mainMenu].items.push(perm);
  });

  // Sort items within each group by path
  Object.values(groups).forEach((group) => {
    group.items.sort((a, b) => (a.path || '').localeCompare(b.path || ''));
  });

  return Object.values(groups);
};

// ----------------------------------------------------------------------

export default function AccessControlPage() {
  const { user: currentUser } = useAuthContext();
  const { users: microsoftUsers, loading: usersLoading, error: usersError } = useMicrosoftUsers();

  const [roles, setRoles] = useState([]);
  const [navPermissions, setNavPermissions] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Enterprise App Access state
  const [appAssignments, setAppAssignments] = useState([]);
  const [appAccessLoading, setAppAccessLoading] = useState(false);
  const [appAccessError, setAppAccessError] = useState('');
  const [userToAdd, setUserToAdd] = useState(null);
  const [addingUser, setAddingUser] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  // Selected user
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [userPermsLoading, setUserPermsLoading] = useState(false);
  const [grantedRoleInfo, setGrantedRoleInfo] = useState(null); // { role, grantedBy, grantedAt }

  // Permission changes tracking
  const [enabledPermIds, setEnabledPermIds] = useState(new Set());
  const [saving, setSaving] = useState(false);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedMenus, setExpandedMenus] = useState({});

  // Load roles and nav permissions on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setRolesLoading(true);
        setNavLoading(true);

        const [rolesData, navData] = await Promise.all([fetchRoles(), fetchNavPermissions()]);

        console.log('[AccessControl] Loaded nav permissions:', navData?.length, 'records');
        console.log('[AccessControl] Nav permissions IDs:', navData?.map((p) => p.id).slice(-10));

        setRoles(rolesData);
        setNavPermissions(navData);
      } catch (err) {
        setError(err?.message || 'Failed to load data');
      } finally {
        setRolesLoading(false);
        setNavLoading(false);
      }
    };

    loadData();
  }, []);

  // Load Enterprise App assignments
  const loadAppAssignments = useCallback(async () => {
    try {
      setAppAccessLoading(true);
      setAppAccessError('');
      const data = await fetchEnterpriseAppUsers();
      setAppAssignments(data);
    } catch (err) {
      setAppAccessError(err?.message || 'Failed to load app assignments');
    } finally {
      setAppAccessLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 1) {
      loadAppAssignments();
    }
  }, [activeTab, loadAppAssignments]);

  // Add a user to the Enterprise App
  const handleAddEnterpriseUser = useCallback(async () => {
    if (!userToAdd) return;
    try {
      setAddingUser(true);
      setAppAccessError('');
      setSuccessMessage('');
      await addEnterpriseAppUser(userToAdd.id);
      setUserToAdd(null);
      await loadAppAssignments();
      setSuccessMessage(`${userToAdd.name} has been granted access to the dashboard.`);
    } catch (err) {
      setAppAccessError(err?.message || 'Failed to add user');
    } finally {
      setAddingUser(false);
    }
  }, [userToAdd, loadAppAssignments]);

  // Remove a user from the Enterprise App
  const handleRemoveEnterpriseUser = useCallback(
    async (assignmentId, displayName) => {
      try {
        setRemovingId(assignmentId);
        setAppAccessError('');
        setSuccessMessage('');
        await removeEnterpriseAppUser(assignmentId);
        await loadAppAssignments();
        setSuccessMessage(`${displayName} has been removed from the dashboard.`);
      } catch (err) {
        setAppAccessError(err?.message || 'Failed to remove user');
      } finally {
        setRemovingId(null);
      }
    },
    [loadAppAssignments]
  );

  // Load user permissions when user is selected
  const loadUserPermissions = useCallback(async (userId) => {
    if (!userId) return;

    try {
      setUserPermsLoading(true);
      const perms = await fetchUserNavPermissions(userId);
      setUserPermissions(perms);

      // Build enabled set
      const enabled = new Set();
      perms.forEach((p) => {
        if (p.enabled) {
          enabled.add(p.navPermissionId);
        }
      });
      setEnabledPermIds(enabled);

      // Extract granted role info from the first permission (they all have the same role info)
      if (perms.length > 0) {
        const firstPerm = perms[0];
        setGrantedRoleInfo({
          role: firstPerm.grantedRole || null,
          grantedBy: firstPerm.grantedBy || null,
          grantedAt: firstPerm.grantedAt || null,
        });
      } else {
        setGrantedRoleInfo(null);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load user permissions');
    } finally {
      setUserPermsLoading(false);
    }
  }, []);

  // Handle user selection - use email as the unique identifier
  const handleSelectUser = useCallback(
    (user) => {
      console.log('[AccessControl] Selected user:', {
        id: user.id,
        name: user.name,
        email: user.email,
      });
      setSelectedUser(user);
      setSuccessMessage('');
      setError('');
      // Use email as the user identifier for permissions
      loadUserPermissions(user.email);
    },
    [loadUserPermissions]
  );

  // Toggle permission
  const handleTogglePermission = useCallback((permId) => {
    setEnabledPermIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(permId)) {
        newSet.delete(permId);
      } else {
        newSet.add(permId);
      }
      return newSet;
    });
  }, []);

  // Toggle all permissions in a menu group
  const handleToggleMenuGroup = useCallback((menuItems, checked) => {
    setEnabledPermIds((prev) => {
      const newSet = new Set(prev);
      menuItems.forEach((item) => {
        if (checked) {
          newSet.add(item.id);
        } else {
          newSet.delete(item.id);
        }
      });
      return newSet;
    });
  }, []);

  // Save permissions
  const handleSavePermissions = useCallback(async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      const permissions = navPermissions.map((np) => ({
        navPermissionId: np.id,
        enabled: enabledPermIds.has(np.id),
      }));

      console.log('[AccessControl] Saving permissions for user:', {
        email: selectedUser.email,
        userName: selectedUser.name,
        enabledCount: permissions.filter((p) => p.enabled).length,
        totalCount: permissions.length,
      });

      // Use email as the user identifier
      const response = await setUserNavPermissions({
        userId: selectedUser.email,
        permissions,
        grantedBy: currentUser?.email,
      });

      console.log('[AccessControl] API Response:', response);

      // Check if the operation actually succeeded
      if (!response.success) {
        const errorMsg = response.message || 'Failed to save permissions';
        throw new Error(errorMsg);
      }

      setSuccessMessage(
        response.message ||
          `Permissions saved successfully for ${selectedUser.name}. Saved ${response.count} permissions.`
      );
      // Clear the PermissionGuard cache for this user so the change takes effect immediately.
      clearPermissionCache(selectedUser.email);
      // Clear the user's nav permission cache and version check so that their
      // layout will silently re-validate on the next navigation and sign them
      // out if the permissions have changed.
      clearUserNavPermissionCache(selectedUser.email);
      clearVersionCheck(selectedUser.email);
      await loadUserPermissions(selectedUser.email);
    } catch (err) {
      console.error('[AccessControl] Save error:', err);
      setError(err?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  }, [selectedUser, navPermissions, enabledPermIds, currentUser, loadUserPermissions]);

  // Grant default permissions based on role
  const handleGrantDefaults = useCallback(
    async (role) => {
      if (!selectedUser) return;

      try {
        setSaving(true);
        setError('');
        setSuccessMessage('');

        // Use email as the user identifier
        await grantDefaultPermissions({
          userId: selectedUser.email,
          role,
          grantedBy: currentUser?.email,
        });

        setSuccessMessage(`Default ${role} permissions granted to ${selectedUser.name}`);
        // Clear the PermissionGuard cache for this user so the change takes effect immediately.
        clearPermissionCache(selectedUser.email);
        clearUserNavPermissionCache(selectedUser.email);
        clearVersionCheck(selectedUser.email);
        await loadUserPermissions(selectedUser.email);
      } catch (err) {
        setError(err?.message || 'Failed to grant default permissions');
      } finally {
        setSaving(false);
      }
    },
    [selectedUser, currentUser, loadUserPermissions]
  );

  // Memoized data
  const userGroups = useMemo(
    () => groupUsersByRole(microsoftUsers, roles),
    [microsoftUsers, roles]
  );

  const navGroups = useMemo(() => groupNavPermissions(navPermissions), [navPermissions]);

  // Filtered nav groups based on menu search
  const filteredNavGroups = useMemo(() => {
    if (!menuSearchQuery.trim()) return navGroups;
    const query = menuSearchQuery.toLowerCase();
    return navGroups
      .map((group) => {
        const mainMenuMatches = group.mainMenu.toLowerCase().includes(query);
        const matchingItems = mainMenuMatches
          ? group.items
          : group.items.filter(
              (item) =>
                item.subMenu1?.toLowerCase().includes(query) ||
                item.subMenu2?.toLowerCase().includes(query) ||
                item.subMenu3?.toLowerCase().includes(query) ||
                item.path?.toLowerCase().includes(query)
            );
        return { ...group, items: matchingItems };
      })
      .filter((group) => group.items.length > 0);
  }, [navGroups, menuSearchQuery]);

  // Filtered users based on search
  const filteredUserGroups = useMemo(() => {
    if (!searchQuery.trim()) return userGroups;

    const query = searchQuery.toLowerCase();
    const filtered = {};

    Object.entries(userGroups).forEach(([key, group]) => {
      const matchedUsers = group.users.filter(
        (user) =>
          user.name?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query)
      );
      filtered[key] = { ...group, users: matchedUsers };
    });

    return filtered;
  }, [userGroups, searchQuery]);

  // Toggle expand group
  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Toggle expand menu
  const toggleMenu = (menuKey) => {
    setExpandedMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  // Check if all items in a menu are enabled
  const isMenuFullyEnabled = (items) => items.every((item) => enabledPermIds.has(item.id));

  // Check if some items in a menu are enabled
  const isMenuPartiallyEnabled = (items) =>
    items.some((item) => enabledPermIds.has(item.id)) && !isMenuFullyEnabled(items);

  // Render user list item
  const renderUserItem = (user) => (
    <ListItemButton
      key={user.id}
      selected={selectedUser?.id === user.id}
      onClick={() => handleSelectUser(user)}
      sx={{ pl: 4 }}
    >
      <ListItemIcon>
        <Iconify
          icon="mdi:account-circle"
          width={24}
          sx={{ color: selectedUser?.id === user.id ? 'primary.main' : 'text.secondary' }}
        />
      </ListItemIcon>
      <ListItemText
        primary={user.name}
        secondary={user.email}
        primaryTypographyProps={{ variant: 'body2', noWrap: true }}
        secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
      />
    </ListItemButton>
  );

  // Render permission item
  const renderPermissionItem = (perm) => {
    const label =
      [perm.subMenu1, perm.subMenu2, perm.subMenu3].filter(Boolean).join(' > ') || perm.path;
    const isEnabled = enabledPermIds.has(perm.id);

    return (
      <ListItem key={perm.id} dense sx={{ pl: 4 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={isEnabled}
              onChange={() => handleTogglePermission(perm.id)}
              size="small"
            />
          }
          label={
            <Box>
              <Typography variant="body2">{label}</Typography>
              <Typography variant="caption" color="text.secondary">
                {perm.path}
              </Typography>
            </Box>
          }
          sx={{ width: '100%' }}
        />
      </ListItem>
    );
  };

  const isLoading = rolesLoading || navLoading || usersLoading;

  return (
    <RoleGuard allowedRoles={['superAdmin', 'admin']}>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h4">Access Control</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage user permissions and dashboard access
            </Typography>
          </Box>
          {activeTab === 0 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="eva:refresh-fill" />}
              disabled={navLoading}
              onClick={async () => {
                try {
                  setNavLoading(true);
                  await refreshNavPermissionsCache();
                  const navData = await fetchNavPermissions();
                  setNavPermissions(navData);
                } catch (err) {
                  setError(err?.message || 'Failed to refresh permissions cache');
                } finally {
                  setNavLoading(false);
                }
              }}
            >
              {navLoading ? 'Refreshing...' : 'Refresh Menu List'}
            </Button>
          )}
          {activeTab === 1 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="eva:refresh-fill" />}
              disabled={appAccessLoading}
              onClick={loadAppAssignments}
            >
              {appAccessLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          )}
        </Stack>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Nav Permissions" />
          <Tab label="App Access" />
        </Tabs>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {usersError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {usersError.message || 'Failed to load Microsoft users'}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        {/* ── App Access Tab ────────────────────────────────────── */}
        {activeTab === 1 && (
          <Card sx={{ p: 3 }}>
            <Stack spacing={1} sx={{ mb: 3 }}>
              <Typography variant="h6">Enterprise App Assignments</Typography>
              <Typography variant="body2" color="text.secondary">
                Users listed here are explicitly granted sign-in access to the IOTA Dashboard via
                Azure AD. Removing a user will block them the next time they try to log in.
              </Typography>
            </Stack>

            {/* Add user row */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
              <Autocomplete
                fullWidth
                loading={usersLoading}
                options={microsoftUsers.filter(
                  (u) => !appAssignments.some((a) => a.principalId === u.id)
                )}
                getOptionLabel={(u) => `${u.name} (${u.email})`}
                value={userToAdd}
                onChange={(_, val) => setUserToAdd(val)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Add a user"
                    placeholder="Search by name or email…"
                    size="small"
                  />
                )}
              />
              <Button
                variant="contained"
                onClick={handleAddEnterpriseUser}
                disabled={!userToAdd || addingUser}
                startIcon={
                  addingUser ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <Iconify icon="eva:person-add-fill" />
                  )
                }
                sx={{ whiteSpace: 'nowrap', minWidth: 140 }}
              >
                Grant Access
              </Button>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {appAccessError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAppAccessError('')}>
                {appAccessError}
              </Alert>
            )}

            {appAccessLoading ? (
              <Stack alignItems="center" sx={{ py: 5 }}>
                <CircularProgress size={28} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  Loading assignments…
                </Typography>
              </Stack>
            ) : appAssignments.length === 0 ? (
              <Stack alignItems="center" sx={{ py: 6 }} spacing={1}>
                <Iconify
                  icon="mdi:account-off-outline"
                  width={48}
                  sx={{ color: 'text.disabled' }}
                />
                <Typography variant="body2" color="text.secondary">
                  No users have been explicitly assigned yet.
                </Typography>
              </Stack>
            ) : (
              <List disablePadding>
                {appAssignments.map((assignment) => (
                  <ListItem
                    key={assignment.id}
                    divider
                    secondaryAction={
                      <Tooltip title="Revoke access">
                        <span>
                          <IconButton
                            edge="end"
                            color="error"
                            onClick={() =>
                              handleRemoveEnterpriseUser(
                                assignment.id,
                                assignment.principalDisplayName
                              )
                            }
                            disabled={removingId === assignment.id}
                          >
                            {removingId === assignment.id ? (
                              <CircularProgress size={20} />
                            ) : (
                              <Iconify icon="eva:person-delete-fill" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    }
                  >
                    <ListItemIcon>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 15 }}>
                        {(assignment.principalDisplayName || '?')[0].toUpperCase()}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={assignment.principalDisplayName || assignment.principalId}
                      secondary={assignment.principalType}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Card>
        )}

        {/* ── Nav Permissions Tab ───────────────────────────────── */}
        {activeTab === 0 &&
          (isLoading ? (
            <Stack alignItems="center" sx={{ py: 10 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Loading users and permissions...
              </Typography>
            </Stack>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', md: '350px 1fr' },
              }}
            >
              {/* Left Pane - Users List */}
              <Card
                sx={{
                  height: 'calc(100vh - 200px)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Users by Role
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Iconify icon="eva:search-fill" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <List
                  sx={{
                    flex: 1,
                    overflow: 'auto',
                    '& .MuiListSubheader-root': {
                      bgcolor: 'background.neutral',
                    },
                  }}
                >
                  {Object.entries(filteredUserGroups).map(([key, group]) => {
                    if (group.users.length === 0) return null;

                    const isExpanded = expandedGroups[key] !== false; // Default expanded

                    return (
                      <Box key={key}>
                        <ListItemButton onClick={() => toggleGroup(key)}>
                          <ListItemIcon>
                            <Iconify
                              icon={isExpanded ? 'eva:chevron-down-fill' : 'eva:chevron-right-fill'}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={group.label}
                            secondary={`${group.users.length} user${group.users.length !== 1 ? 's' : ''}`}
                          />
                        </ListItemButton>
                        <Collapse in={isExpanded}>
                          <List disablePadding>{group.users.map(renderUserItem)}</List>
                        </Collapse>
                      </Box>
                    );
                  })}
                </List>
              </Card>

              {/* Right Pane - Permissions */}
              <Card
                sx={{
                  height: 'calc(100vh - 200px)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {selectedUser ? (
                  <>
                    {/* User Header */}
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="h6">{selectedUser.name}</Typography>
                            {grantedRoleInfo?.role && (
                              <Chip
                                size="small"
                                label={
                                  grantedRoleInfo.role === 'custom'
                                    ? 'Custom'
                                    : grantedRoleInfo.role.charAt(0).toUpperCase() +
                                      grantedRoleInfo.role.slice(1)
                                }
                                color={
                                  grantedRoleInfo.role === 'superAdmin'
                                    ? 'error'
                                    : grantedRoleInfo.role === 'admin'
                                      ? 'warning'
                                      : grantedRoleInfo.role === 'manager'
                                        ? 'info'
                                        : grantedRoleInfo.role === 'custom'
                                          ? 'secondary'
                                          : 'default'
                                }
                                variant="soft"
                              />
                            )}
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {selectedUser.email}
                          </Typography>
                          {grantedRoleInfo?.grantedBy && (
                            <Typography variant="caption" color="text.disabled">
                              Granted by {grantedRoleInfo.grantedBy}
                              {grantedRoleInfo.grantedAt &&
                                ` on ${new Date(grantedRoleInfo.grantedAt).toLocaleDateString()}`}
                            </Typography>
                          )}
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant={grantedRoleInfo?.role === 'regular' ? 'contained' : 'outlined'}
                            onClick={() => handleGrantDefaults('regular')}
                            disabled={saving}
                          >
                            Regular
                          </Button>
                          <Button
                            size="small"
                            variant={grantedRoleInfo?.role === 'manager' ? 'contained' : 'outlined'}
                            onClick={() => handleGrantDefaults('manager')}
                            disabled={saving}
                          >
                            Manager
                          </Button>
                          <Button
                            size="small"
                            variant={grantedRoleInfo?.role === 'admin' ? 'contained' : 'outlined'}
                            onClick={() => handleGrantDefaults('admin')}
                            disabled={saving}
                          >
                            Admin
                          </Button>
                        </Stack>
                      </Stack>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: 'block' }}
                      >
                        Click role buttons to grant default permissions, or customize below
                      </Typography>
                    </Box>

                    {/* Menu Search */}
                    <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Search menu items..."
                        value={menuSearchQuery}
                        onChange={(e) => setMenuSearchQuery(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Iconify icon="eva:search-fill" />
                            </InputAdornment>
                          ),
                          endAdornment: menuSearchQuery ? (
                            <InputAdornment position="end">
                              <Iconify
                                icon="eva:close-fill"
                                onClick={() => setMenuSearchQuery('')}
                                sx={{ cursor: 'pointer', color: 'text.secondary' }}
                              />
                            </InputAdornment>
                          ) : null,
                        }}
                      />
                    </Box>

                    {/* Permissions List */}
                    {userPermsLoading ? (
                      <Stack alignItems="center" sx={{ py: 5, flex: 1 }}>
                        <CircularProgress size={24} />
                      </Stack>
                    ) : (
                      <List sx={{ flex: 1, overflow: 'auto' }}>
                        {filteredNavGroups.length === 0 && menuSearchQuery ? (
                          <Stack alignItems="center" sx={{ py: 6 }} spacing={1}>
                            <Iconify
                              icon="eva:search-fill"
                              width={32}
                              sx={{ color: 'text.disabled' }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              No menu items match &ldquo;{menuSearchQuery}&rdquo;
                            </Typography>
                          </Stack>
                        ) : null}
                        {filteredNavGroups.map((group) => {
                          const isExpanded = menuSearchQuery
                            ? true
                            : expandedMenus[group.mainMenu] !== false;
                          const allEnabled = isMenuFullyEnabled(group.items);
                          const partialEnabled = isMenuPartiallyEnabled(group.items);

                          return (
                            <Box key={group.mainMenu}>
                              <ListItemButton onClick={() => toggleMenu(group.mainMenu)}>
                                <ListItemIcon>
                                  <Checkbox
                                    checked={allEnabled}
                                    indeterminate={partialEnabled}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleMenuGroup(group.items, !allEnabled);
                                    }}
                                    size="small"
                                  />
                                </ListItemIcon>
                                <ListItemText
                                  primary={group.mainMenu}
                                  secondary={`${group.items.filter((i) => enabledPermIds.has(i.id)).length}/${group.items.length} enabled`}
                                />
                                <Iconify
                                  icon={
                                    isExpanded ? 'eva:chevron-down-fill' : 'eva:chevron-right-fill'
                                  }
                                />
                              </ListItemButton>
                              <Collapse in={isExpanded}>
                                <List disablePadding>{group.items.map(renderPermissionItem)}</List>
                              </Collapse>
                              <Divider />
                            </Box>
                          );
                        })}
                      </List>
                    )}

                    {/* Save Button */}
                    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleSavePermissions}
                        disabled={saving || userPermsLoading}
                        startIcon={
                          saving ? <CircularProgress size={20} /> : <Iconify icon="eva:save-fill" />
                        }
                      >
                        {saving ? 'Saving...' : 'Save Permissions'}
                      </Button>
                    </Box>
                  </>
                ) : (
                  <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, p: 3 }}>
                    <Iconify
                      icon="mdi:account-cog"
                      width={64}
                      sx={{ color: 'text.disabled', mb: 2 }}
                    />
                    <Typography variant="h6" color="text.secondary">
                      Select a User
                    </Typography>
                    <Typography variant="body2" color="text.disabled" textAlign="center">
                      Select a user from the left panel to view and manage their navigation
                      permissions
                    </Typography>
                  </Stack>
                )}
              </Card>
            </Box>
          ))}
      </Box>
    </RoleGuard>
  );
}
