'use client';

import { useEffect, useMemo, useState } from 'react';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';

import {
  fetchRoles,
  setUserRoleApi,
  assignManagerApi,
  fetchManagerUsers,
} from 'src/utils/apiHelper';

import { RoleGuard } from 'src/auth/guard';

export default function AccessPage() {
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [error, setError] = useState('');

  const [userId, setUserId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [savingRole, setSavingRole] = useState(false);
  const [roleMessage, setRoleMessage] = useState('');

  const [managerId, setManagerId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState('');
  const [team, setTeam] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setRolesLoading(true);
        const list = await fetchRoles();
        setRoles(list);
      } catch (err) {
        setError(err?.message || 'Failed to load roles');
      } finally {
        setRolesLoading(false);
      }
    };
    load();
  }, []);

  const roleOptions = useMemo(() => roles.map((r) => ({ id: r.id, name: r.name })), [roles]);

  const handleSaveRole = async () => {
    setRoleMessage('');
    setError('');
    if (!userId || !roleId) {
      setError('User ID and Role are required');
      return;
    }
    try {
      setSavingRole(true);
      await setUserRoleApi({ id: userId, roleId });
      setRoleMessage('Role updated');
    } catch (err) {
      setError(err?.message || 'Failed to update role');
    } finally {
      setSavingRole(false);
    }
  };

  const handleAssign = async () => {
    setAssignMessage('');
    setError('');
    if (!managerId || !memberId) {
      setError('Manager ID and User ID are required');
      return;
    }
    try {
      setAssigning(true);
      await assignManagerApi({ managerId, userId: memberId });
      setAssignMessage('Manager assigned');
      await loadTeam(managerId);
    } catch (err) {
      setError(err?.message || 'Failed to assign manager');
    } finally {
      setAssigning(false);
    }
  };

  const loadTeam = async (mgrId) => {
    const target = mgrId || managerId;
    if (!target) return;
    try {
      setTeamLoading(true);
      const list = await fetchManagerUsers(target);
      setTeam(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || 'Failed to load team');
    } finally {
      setTeamLoading(false);
    }
  };

  const renderRoleForm = (
    <Card>
      <CardHeader title="Assign Role" subheader="Set a user's role" />
      <Divider />
      <Stack spacing={2.5} sx={{ p: 3 }}>
        <TextField label="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <TextField
          select
          label="Role"
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          helperText="Pick one of the available roles"
        >
          {roleOptions.map((role) => (
            <MenuItem key={role.id} value={role.id}>
              {role.name}
            </MenuItem>
          ))}
        </TextField>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button variant="contained" onClick={handleSaveRole} disabled={savingRole}>
            {savingRole ? 'Saving…' : 'Save Role'}
          </Button>
          {roleMessage && (
            <Typography variant="body2" color="success.main">
              {roleMessage}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Card>
  );

  const renderManagerForm = (
    <Card>
      <CardHeader title="Assign Manager" subheader="Link a manager to a regular user" />
      <Divider />
      <Stack spacing={2.5} sx={{ p: 3 }}>
        <TextField
          label="Manager ID"
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
          onBlur={(evt) => loadTeam(evt.target.value)}
        />
        <TextField
          label="User ID"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          helperText="Regular user to assign"
        />
        <Stack direction="row" spacing={2} alignItems="center">
          <Button variant="contained" onClick={handleAssign} disabled={assigning}>
            {assigning ? 'Assigning…' : 'Assign'}
          </Button>
          {assignMessage && (
            <Typography variant="body2" color="success.main">
              {assignMessage}
            </Typography>
          )}
        </Stack>
        <Divider />
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle2">Team</Typography>
            {teamLoading && <CircularProgress size={16} />}
          </Stack>
          {team.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No mappings yet for this manager.
            </Typography>
          ) : (
            team.map((row) => (
              <Typography key={`${row.managerId}-${row.userId}`} variant="body2">
                {row.managerId} → {row.userId}
              </Typography>
            ))
          )}
        </Stack>
      </Stack>
    </Card>
  );

  return (
    <RoleGuard allowedRoles={['superAdmin', 'admin']}>
      <Grid container spacing={3} sx={{ p: { xs: 2, md: 3 } }}>
        <Grid item xs={12}>
          <Typography variant="h4">Access Control</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage user roles and manager assignments.
          </Typography>
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}

        <Grid item xs={12} md={6}>
          {rolesLoading ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            renderRoleForm
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          {renderManagerForm}
        </Grid>
      </Grid>
    </RoleGuard>
  );
}
