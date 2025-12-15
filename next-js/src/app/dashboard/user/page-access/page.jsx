'use client';

import { useEffect, useMemo, useState } from 'react';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import ListItem from '@mui/material/ListItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import ListItemText from '@mui/material/ListItemText';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';

import {
  getPageAccessForUser,
  savePageAccessForUser,
  removePageAccessForUser,
  getPageAccessForRole,
  savePageAccessForRole,
  removePageAccessForRole,
} from 'src/utils/pageAccess';

import { navData as dashboardNavData } from 'src/layouts/nav-config-dashboard';

import { RoleGuard } from 'src/auth/guard';

const flattenNav = (items, prefix = []) =>
  items.flatMap((item) => {
    const labelParts = [...prefix, item.title];
    const current = item.path
      ? [{ title: labelParts.join(' / '), path: item.path, allowedRoles: item.allowedRoles }]
      : [];
    const children = item.children ? flattenNav(item.children, labelParts) : [];
    return [...current, ...children];
  });

const computeRoleDefaults = (role, navItems) => {
  if (!role) return [];
  const base = ['/dashboard', '/dashboard/', '/dashboard/app'];
  const list = flattenNav(navItems).filter((item) => {
    if (!item.path) return false;
    const allowed = item.allowedRoles;
    return !allowed || allowed.includes(role);
  });
  return Array.from(new Set([...base, ...list.map((i) => i.path)]));
};

export default function UserPageAccess() {
  const [userId, setUserId] = useState('');
  const [selectedPaths, setSelectedPaths] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rolePreset, setRolePreset] = useState('');

  const [roleDefaultsRole, setRoleDefaultsRole] = useState('regular');
  const [rolePaths, setRolePaths] = useState([]);
  const [roleMessage, setRoleMessage] = useState('');

  const allPages = useMemo(() => flattenNav(dashboardNavData), []);

  useEffect(() => {
    try {
      const existing = getPageAccessForRole(roleDefaultsRole);
      setRolePaths(
        Array.isArray(existing) ? existing : computeRoleDefaults(roleDefaultsRole, dashboardNavData)
      );
    } catch (err) {
      setError('Failed to load role defaults');
    }
  }, [roleDefaultsRole]);

  useEffect(() => {
    if (!userId) {
      setSelectedPaths([]);
      return;
    }
    try {
      const existing = getPageAccessForUser(userId);
      setSelectedPaths(Array.isArray(existing) ? existing : []);
    } catch (err) {
      setError('Failed to load user access');
    }
  }, [userId]);

  const togglePath = (path) => {
    setSelectedPaths((prev) => {
      if (prev.includes(path)) {
        return prev.filter((item) => item !== path);
      }
      return [...prev, path];
    });
  };

  const handleSave = () => {
    setError('');
    setMessage('');
    if (!userId) {
      setError('User ID is required');
      return;
    }
    savePageAccessForUser(userId, selectedPaths);
    setMessage('Saved page access');
  };

  const applyPreset = () => {
    if (!rolePreset) {
      setError('Select a role preset first');
      return;
    }
    try {
      const preset = getPageAccessForRole(rolePreset);
      const fallback = computeRoleDefaults(rolePreset, dashboardNavData);
      const next = preset?.length ? preset : fallback;
      setSelectedPaths(next);
      setMessage(`Applied ${rolePreset} defaults`);
    } catch (err) {
      setError('Failed to apply role defaults');
    }
  };

  const handleClear = () => {
    if (!userId) return;
    removePageAccessForUser(userId);
    setSelectedPaths([]);
    setMessage('Cleared page access for user');
  };

  const handleSaveRoleDefaults = () => {
    setRoleMessage('');
    savePageAccessForRole(roleDefaultsRole, rolePaths);
    setRoleMessage('Saved role defaults');
  };

  const handleClearRoleDefaults = () => {
    removePageAccessForRole(roleDefaultsRole);
    setRolePaths(computeRoleDefaults(roleDefaultsRole, dashboardNavData));
    setRoleMessage('Cleared role defaults');
  };

  const toggleRolePath = (path) => {
    setRolePaths((prev) => {
      if (prev.includes(path)) return prev.filter((p) => p !== path);
      return [...prev, path];
    });
  };

  const selectAll = () => setSelectedPaths(allPages.map((item) => item.path));
  const selectNone = () => setSelectedPaths([]);

  return (
    <RoleGuard allowedRoles={['superAdmin', 'admin']}>
      <Grid container spacing={3} sx={{ p: { xs: 2, md: 3 } }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="User" subheader="Who should receive this page access?" />
            <Divider />
            <Stack spacing={2} sx={{ p: 3 }}>
              <TextField
                label="User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                helperText="Paste the Supabase user id"
              />
              <TextField
                select
                label="Role preset"
                value={rolePreset}
                onChange={(e) => setRolePreset(e.target.value)}
                helperText="Optional: load defaults for a role"
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="regular">Regular</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="superAdmin">Super Admin</MenuItem>
              </TextField>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={selectAll} size="small">
                  Select all
                </Button>
                <Button variant="outlined" onClick={selectNone} size="small">
                  Clear selection
                </Button>
              </Stack>
              <Button variant="outlined" onClick={applyPreset} disabled={!rolePreset}>
                Apply role defaults
              </Button>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={handleSave}>
                  Save
                </Button>
                <Button variant="text" color="error" onClick={handleClear}>
                  Remove
                </Button>
              </Stack>
              {message && (
                <Alert severity="success" variant="outlined">
                  {message}
                </Alert>
              )}
              {error && (
                <Alert severity="error" variant="outlined">
                  {error}
                </Alert>
              )}
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Allowed pages" subheader="Toggle which pages this user may open" />
            <Divider />
            <List dense disablePadding sx={{ maxHeight: 620, overflow: 'auto' }}>
              {allPages.map((item) => (
                <ListItem key={item.path} divider>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedPaths.includes(item.path)}
                        onChange={() => togglePath(item.path)}
                      />
                    }
                    label={<ListItemText primary={item.title} secondary={item.path} />}
                    sx={{ width: '100%' }}
                  />
                </ListItem>
              ))}
            </List>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title="Role defaults" subheader="Pages granted to everyone in a role" />
            <Divider />
            <Stack spacing={2} sx={{ p: 3 }}>
              <TextField
                select
                label="Role"
                value={roleDefaultsRole}
                onChange={(e) => setRoleDefaultsRole(e.target.value)}
              >
                <MenuItem value="regular">Regular</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="superAdmin">Super Admin</MenuItem>
              </TextField>
              <List dense disablePadding sx={{ maxHeight: 320, overflow: 'auto' }}>
                {allPages.map((item) => (
                  <ListItem key={`role-${item.path}`} divider>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={rolePaths.includes(item.path)}
                          onChange={() => toggleRolePath(item.path)}
                        />
                      }
                      label={<ListItemText primary={item.title} secondary={item.path} />}
                      sx={{ width: '100%' }}
                    />
                  </ListItem>
                ))}
              </List>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={handleSaveRoleDefaults}>
                  Save role defaults
                </Button>
                <Button variant="text" color="error" onClick={handleClearRoleDefaults}>
                  Clear role defaults
                </Button>
              </Stack>
              {roleMessage && (
                <Alert severity="success" variant="outlined">
                  {roleMessage}
                </Alert>
              )}
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </RoleGuard>
  );
}
