'use client';

import { useEffect, useMemo, useState } from 'react';

import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { RoleGuard } from 'src/auth/guard';
import { _userList } from 'src/_mock';
import { supabase } from 'src/lib/supabase';
import { navData as dashboardNavData } from 'src/layouts/nav-config-dashboard';
import { paths } from 'src/routes/paths';
import {
  getPageAccessForUser,
  removePageAccessForUser,
  savePageAccessForUser,
} from 'src/utils/pageAccess';

const baseFromPath = (path) => {
  const parts = (path || '').split('/').filter(Boolean);
  if (!parts.length) return '';
  if (parts[0] === 'dashboard' && parts.length >= 2) return `/${parts[0]}/${parts[1]}`;
  return `/${parts.slice(0, 2).join('/')}`;
};

const flattenNav = (items, prefix = []) =>
  items.flatMap((item) => {
    const labelParts = [...prefix, item.title];
    const current = item.path
      ? [
          {
            title: labelParts.join(' / '),
            path: item.path,
            allowedRoles: item.allowedRoles,
            depth: labelParts.length,
            basePath: baseFromPath(item.path),
          },
        ]
      : [];
    const children = item.children ? flattenNav(item.children, labelParts) : [];
    return [...current, ...children];
  });

const computeRoleDefaults = (role, pages) => {
  if (!role) return [];
  const base = ['/dashboard', '/dashboard/', '/dashboard/app'];
  const list = pages.filter((item) => {
    if (!item.path) return false;
    const allowed = item.allowedRoles;
    return !allowed || allowed.includes(role);
  });
  return Array.from(new Set([...base, ...list.map((i) => i.path)]));
};

const roleOptions = ['regular', 'manager', 'admin', 'superAdmin'];

const normalizeRole = (role, roleId) => {
  if (roleOptions.includes(role)) return role;
  if (roleId === 3) return 'admin';
  if (roleId === 4) return 'superAdmin';
  return 'regular';
};

const keyToLabel = (key) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

const flattenRoutes = (node, trail = []) => {
  const out = [];
  if (!node || typeof node !== 'object') return out;

  Object.entries(node).forEach(([key, value]) => {
    if (typeof value === 'string') {
      const titleParts = [...trail, keyToLabel(key)];
      out.push({
        title: titleParts.join(' / '),
        path: value,
        depth: titleParts.length,
        basePath: baseFromPath(value),
      });
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...flattenRoutes(value, [...trail, keyToLabel(key)]));
    }
  });

  return out;
};

const buildMockRows = (pages) =>
  _userList.map((user) => {
    const role = normalizeRole(user.role, user.roleId);
    const storedPaths = getPageAccessForUser(user.id);
    const paths = storedPaths?.length
      ? storedPaths
      : user.paths || computeRoleDefaults(role, pages);
    return { ...user, role, paths };
  });

export default function UserPageAccess() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  const navPages = useMemo(() => flattenNav(dashboardNavData), []);
  const routePages = useMemo(() => flattenRoutes(paths.dashboard), []);
  const allPages = useMemo(() => {
    const merged = new Map();
    [...navPages, ...routePages].forEach((item) => {
      if (!item.path) return;
      if (!merged.has(item.path)) {
        merged.set(item.path, item);
      }
    });
    return merged ? Array.from(merged.values()) : [];
  }, [navPages, routePages]);

  const mainPages = useMemo(
    () => allPages.filter((item) => item.path && item.basePath === item.path),
    [allPages]
  );
  const subPages = useMemo(
    () => allPages.filter((item) => item.path && item.basePath && item.basePath !== item.path),
    [allPages]
  );

  const unionPaths = (a, b) => Array.from(new Set([...(a || []), ...(b || [])]));

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError('');

      try {
        const { data, error: dbError } = await supabase
          .from('users')
          .select('id, full_name, email, role, role_id, allowed_paths')
          .order('full_name', { ascending: true });

        if (dbError) throw dbError;

        const mapped = (data || []).map((user) => {
          const role = normalizeRole(user.role, user.role_id);
          const storedPaths = getPageAccessForUser(user.id);
          const dbPaths = Array.isArray(user.allowed_paths) ? user.allowed_paths : [];
          const paths = storedPaths?.length
            ? storedPaths
            : dbPaths.length
              ? dbPaths
              : computeRoleDefaults(role, allPages);

          return {
            id: user.id,
            name: user.full_name || user.email || 'User',
            email: user.email,
            role,
            roleId: user.role_id,
            paths,
          };
        });

        if (!mapped.length) {
          setRows(buildMockRows(allPages));
          setError('No users found in Supabase. Showing mock data.');
        } else {
          setRows(mapped);
        }
      } catch (err) {
        console.error('Failed to load users from Supabase', err);
        setError('Unable to load users from Supabase. Showing mock data.');
        setRows(buildMockRows(allPages));
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  useEffect(() => {
    if (!selectedUserId && rows.length) {
      setSelectedUserId(rows[0].id);
    }
  }, [rows, selectedUserId]);

  const handleRoleChange = (userId, role) => {
    setRows((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, role, paths: computeRoleDefaults(role, allPages) } : user
      )
    );
    removePageAccessForUser(userId);
  };

  const handlePathsChange = (userId, paths) => {
    setRows((prev) => prev.map((user) => (user.id === userId ? { ...user, paths } : user)));
  };

  const handleResetUser = (userId) => {
    setRows((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, paths: computeRoleDefaults(user.role, allPages) } : user
      )
    );
    removePageAccessForUser(userId);
  };

  const handleSaveUser = async (userId) => {
    const user = rows.find((u) => u.id === userId);
    if (!user) return;

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const { error: dbError } = await supabase
        .from('users')
        .update({
          role: user.role,
          role_id: user.roleId,
          allowed_paths: user.paths,
        })
        .eq('id', user.id);

      if (dbError) throw dbError;

      savePageAccessForUser(user.id, user.paths);
      setMessage('Access updated successfully.');
    } catch (err) {
      console.error('Failed to save user access', err);
      setError('Unable to save to Supabase. Changes are saved locally only.');
      savePageAccessForUser(user.id, user.paths);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['superAdmin', 'admin']}>
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h4">Access Control</Typography>
            <Typography variant="body2" color="text.secondary">
              Pick a user, set their role and menus, then save. Designed to match other dashboard
              flows.
            </Typography>
          </Stack>

          {message && (
            <Alert severity="success" variant="outlined" onClose={() => setMessage('')}>
              {message}
            </Alert>
          )}
          {error && (
            <Alert severity="error" variant="outlined" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Card variant="outlined">
            <CardHeader title="Select user" subheader="Pick a user to configure access" />
            <Divider />
            <Stack spacing={3} sx={{ p: { xs: 2.5, md: 3 } }}>
              <Autocomplete
                fullWidth
                options={rows}
                loading={loading}
                getOptionLabel={(option) => option.name || option.email || 'User'}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={rows.find((u) => u.id === selectedUserId) || null}
                onChange={(_, value) => setSelectedUserId(value?.id || '')}
                renderInput={(params) => (
                  <TextField {...params} label="User" placeholder="Search users" />
                )}
              />

              {selectedUserId ? (
                <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                  <Stack spacing={2.5} sx={{ p: { xs: 2, md: 3 } }}>
                    <TextField
                      select
                      fullWidth
                      label="Role"
                      value={rows.find((r) => r.id === selectedUserId)?.role || ''}
                      onChange={(e) => handleRoleChange(selectedUserId, e.target.value)}
                    >
                      {roleOptions.map((role) => (
                        <MenuItem key={role} value={role}>
                          {role}
                        </MenuItem>
                      ))}
                    </TextField>

                    <Autocomplete
                      multiple
                      disableCloseOnSelect
                      options={mainPages}
                      getOptionLabel={(option) => option.title}
                      isOptionEqualToValue={(option, value) => option.path === value.path}
                      value={mainPages.filter((page) =>
                        rows.find((r) => r.id === selectedUserId)?.paths.includes(page.path)
                      )}
                      onChange={(_, value) => {
                        const currentPaths = rows.find((r) => r.id === selectedUserId)?.paths || [];
                        const selectedBases = new Set(value.map((v) => v.basePath));
                        const subSelected = subPages
                          .filter((page) => page.basePath && selectedBases.has(page.basePath))
                          .filter((page) => currentPaths.includes(page.path))
                          .map((p) => p.path);
                        handlePathsChange(
                          selectedUserId,
                          unionPaths(
                            value.map((v) => v.path),
                            subSelected
                          )
                        );
                      }}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            {...getTagProps({ index })}
                            key={option.path}
                            label={option.title}
                            size="small"
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField {...params} label="Main menus" placeholder="Select main menus" />
                      )}
                    />

                    <Autocomplete
                      multiple
                      disableCloseOnSelect
                      options={subPages.filter((page) => {
                        const mainSelected = rows.find((r) => r.id === selectedUserId)?.paths || [];
                        const bases = new Set(
                          mainPages
                            .filter((p) => mainSelected.includes(p.path))
                            .map((p) => p.basePath)
                        );
                        return page.basePath && bases.has(page.basePath);
                      })}
                      getOptionLabel={(option) => option.title}
                      isOptionEqualToValue={(option, value) => option.path === value.path}
                      value={subPages.filter((page) => {
                        const userPaths = rows.find((r) => r.id === selectedUserId)?.paths || [];
                        if (!userPaths.includes(page.path)) return false;
                        const mainSelected = mainPages.filter((p) => userPaths.includes(p.path));
                        const bases = new Set(mainSelected.map((p) => p.basePath));
                        return page.basePath && bases.has(page.basePath);
                      })}
                      onChange={(_, value) => {
                        const currentPaths = rows.find((r) => r.id === selectedUserId)?.paths || [];
                        const mainSelected = mainPages.filter((page) =>
                          currentPaths.includes(page.path)
                        );
                        const bases = new Set(mainSelected.map((p) => p.basePath));
                        const mainPaths = mainSelected.map((p) => p.path);
                        const filteredSubs = value
                          .filter((v) => v.basePath && bases.has(v.basePath))
                          .map((v) => v.path);
                        handlePathsChange(selectedUserId, unionPaths(mainPaths, filteredSubs));
                      }}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            {...getTagProps({ index })}
                            key={option.path}
                            label={option.title}
                            size="small"
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Sub menus"
                          placeholder="Select sub-level menus"
                        />
                      )}
                    />

                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      justifyContent="flex-end"
                    >
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleResetUser(selectedUserId)}
                        disabled={loading}
                      >
                        Reset to role defaults
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleSaveUser(selectedUserId)}
                        disabled={loading}
                      >
                        Save
                      </Button>
                    </Stack>

                    <Typography variant="caption" color="text.secondary">
                      {`Selected (${rows.find((r) => r.id === selectedUserId)?.paths.length || 0}): ${
                        rows.find((r) => r.id === selectedUserId)?.paths.join(', ') || ''
                      }`}
                    </Typography>
                  </Stack>
                </Card>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Choose a user to continue.
                </Typography>
              )}
            </Stack>
          </Card>
        </Stack>
      </Container>
    </RoleGuard>
  );
}
