'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import ListItem from '@mui/material/ListItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemButton from '@mui/material/ListItemButton';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { RoleGuard } from 'src/auth/guard';
import { useAuthContext } from 'src/auth/hooks';
import { useMicrosoftUsers } from 'src/auth/hooks/use-microsoft-users';

import { Iconify } from 'src/components/iconify';

import {
  fetchRoles,
  fetchNavPermissions,
  fetchUserNavPermissions,
  setUserNavPermissions,
  grantDefaultPermissions,
} from 'src/utils/apiHelper';

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

  // Selected user
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [userPermsLoading, setUserPermsLoading] = useState(false);

  // Permission changes tracking
  const [enabledPermIds, setEnabledPermIds] = useState(new Set());
  const [saving, setSaving] = useState(false);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedMenus, setExpandedMenus] = useState({});

  // Load roles and nav permissions on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setRolesLoading(true);
        setNavLoading(true);

        const [rolesData, navData] = await Promise.all([fetchRoles(), fetchNavPermissions()]);

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
    } catch (err) {
      setError(err?.message || 'Failed to load user permissions');
    } finally {
      setUserPermsLoading(false);
    }
  }, []);

  // Handle user selection
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
      loadUserPermissions(user.id);
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
        userId: selectedUser.id,
        userName: selectedUser.name,
        email: selectedUser.email,
        enabledCount: permissions.filter((p) => p.enabled).length,
        totalCount: permissions.length,
      });

      await setUserNavPermissions({
        userId: selectedUser.id,
        permissions,
        grantedBy: currentUser?.id || currentUser?.email,
      });

      setSuccessMessage(`Permissions saved successfully for ${selectedUser.name}`);
      await loadUserPermissions(selectedUser.id);
    } catch (err) {
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

        await grantDefaultPermissions({
          userId: selectedUser.id,
          role,
          grantedBy: currentUser?.id || currentUser?.email,
        });

        setSuccessMessage(`Default ${role} permissions granted to ${selectedUser.name}`);
        await loadUserPermissions(selectedUser.id);
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
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4">Access Control</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage user permissions for navigation menu items
            </Typography>
          </Box>
        </Stack>

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

        {isLoading ? (
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
                        <Typography variant="h6">{selectedUser.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedUser.email}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleGrantDefaults('regular')}
                          disabled={saving}
                        >
                          Regular
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleGrantDefaults('manager')}
                          disabled={saving}
                        >
                          Manager
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
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

                  {/* Permissions List */}
                  {userPermsLoading ? (
                    <Stack alignItems="center" sx={{ py: 5, flex: 1 }}>
                      <CircularProgress size={24} />
                    </Stack>
                  ) : (
                    <List sx={{ flex: 1, overflow: 'auto' }}>
                      {navGroups.map((group) => {
                        const isExpanded = expandedMenus[group.mainMenu] !== false;
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
        )}
      </Box>
    </RoleGuard>
  );
}
