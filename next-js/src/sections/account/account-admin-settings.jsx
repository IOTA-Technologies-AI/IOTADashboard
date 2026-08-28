'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import LinearProgress from '@mui/material/LinearProgress';

import { fDateTime } from 'src/utils/format-time';

import { useEditMode, setEditMode, useEditAudit } from 'src/actions/admin-edit-mode';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EditAuditChanges } from 'src/components/edit-audit';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------
// Account > Admin Settings
//
// Super-admin only. Hosts the Record Edit Mode switch — the break-glass control
// that lets super-admins edit invoices and expenses after they have left the
// pending stage — together with the audit trail of every toggle and every
// field change made while it was open.
// ----------------------------------------------------------------------

const roleIdToName = { 1: 'regular', 2: 'manager', 3: 'admin', 4: 'superAdmin' };

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
];

const ACTION_LABELS = {
  edit_mode_enabled: { text: 'Edit mode on', color: 'warning' },
  edit_mode_disabled: { text: 'Edit mode off', color: 'default' },
  edit_mode_expired: { text: 'Edit mode expired', color: 'default' },
  record_updated: { text: 'Record edited', color: 'info' },
};

// ----------------------------------------------------------------------

export function AccountAdminSettings() {
  const { user } = useAuthContext();
  const normalizedRole = user?.role || roleIdToName[user?.roleId] || 'regular';
  const isSuperAdmin = normalizedRole === 'superAdmin';

  const { editMode, editModeActive, editModeLoading } = useEditMode();
  const { auditEntries, auditLoading } = useEditAudit({ limit: 200, enabled: isSuperAdmin });

  const [saving, setSaving] = useState(false);
  const [duration, setDuration] = useState(null);

  // The stored window is the source of truth until the admin picks another.
  const selectedDuration = duration ?? editMode.durationMinutes ?? 60;

  if (!isSuperAdmin) {
    return (
      <Alert severity="error">
        Admin settings are restricted to super-admins. You do not have access to this page.
      </Alert>
    );
  }

  const handleToggle = async (event) => {
    const enabled = event.target.checked;
    setSaving(true);
    try {
      await setEditMode({ enabled, durationMinutes: selectedDuration, user });
      toast.success(
        enabled
          ? `Record edit mode is on for the next ${selectedDuration} minutes.`
          : 'Record edit mode is off.'
      );
    } catch (error) {
      console.error('Failed to change edit mode:', error);
      toast.error(error?.message || 'Failed to change edit mode.');
    } finally {
      setSaving(false);
    }
  };

  const renderStatus = () => {
    if (editModeLoading) {
      return (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Checking current status…
        </Typography>
      );
    }

    if (!editModeActive) {
      return (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Edit mode is off. Approved, rejected and paid records are locked for everyone.
        </Typography>
      );
    }

    return (
      <Alert severity="warning" icon={<Iconify icon="solar:danger-triangle-bold" />}>
        <Typography variant="subtitle2">
          Edit mode is ON — expires in {editMode.minutesRemaining}{' '}
          {editMode.minutesRemaining === 1 ? 'minute' : 'minutes'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Switched on by {editMode.enabledByName || editMode.enabledBy} at{' '}
          {fDateTime(editMode.enabledAt)}. Every change made now is recorded in the audit trail
          below.
        </Typography>
      </Alert>
    );
  };

  const renderSwitch = () => (
    <Card>
      <CardHeader
        title="Record edit mode"
        subheader="Lets super-admins edit invoices and expenses at any approval stage. Switches itself off when the window expires."
        avatar={<Iconify icon="solar:lock-keyhole-unlocked-bold" width={24} />}
      />

      <Stack spacing={2.5} sx={{ p: 3 }}>
        {renderStatus()}

        <Box
          sx={{
            gap: 2,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch
              checked={editModeActive}
              onChange={handleToggle}
              disabled={saving || editModeLoading}
              slotProps={{ input: { id: 'record-edit-mode-switch' } }}
            />
            <Typography variant="subtitle2">
              {editModeActive ? 'Enabled' : 'Disabled'}
            </Typography>
          </Box>

          <FormControl size="small" sx={{ minWidth: 180 }} disabled={editModeActive || saving}>
            <InputLabel id="edit-mode-duration-label">Auto-off after</InputLabel>
            <Select
              labelId="edit-mode-duration-label"
              label="Auto-off after"
              value={selectedDuration}
              onChange={(event) => setDuration(Number(event.target.value))}
            >
              {DURATION_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {saving && <LinearProgress />}

        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          Only super-admins can see or change this switch, and the backend re-checks the role and
          the expiry on every save — turning it off immediately re-locks every record.
        </Typography>
      </Stack>
    </Card>
  );

  const renderAudit = () => (
    <Card>
      <CardHeader
        title="Audit trail"
        subheader="Every edit-mode toggle and every field changed while it was open."
        avatar={<Iconify icon="solar:clipboard-list-bold" width={24} />}
      />

      {auditLoading && <LinearProgress />}

      <Scrollbar sx={{ maxHeight: 640 }}>
        <Table size="small" sx={{ minWidth: 880 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>When</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>Action</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>Who</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>Record</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {!auditLoading && !auditEntries.length && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" sx={{ py: 3, color: 'text.secondary' }}>
                    Nothing recorded yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {auditEntries.map((entry) => {
              const action = ACTION_LABELS[entry.action] || {
                text: entry.action,
                color: 'default',
              };

              return (
                <TableRow key={entry.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {fDateTime(entry.occurredAt)}
                  </TableCell>

                  <TableCell>
                    <Label variant="soft" color={action.color}>
                      {action.text}
                    </Label>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {entry.actorName || entry.actorEmail}
                    </Typography>
                    {entry.actorName && (
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        {entry.actorEmail}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    {entry.entityId ? (
                      <>
                        <Typography variant="body2">
                          {entry.entityLabel || entry.entityId}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          {entry.entityType}
                          {entry.entityStage ? ` · ${entry.entityStage}` : ''}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        —
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    {entry.action === 'record_updated' ? (
                      <EditAuditChanges changes={entry.changes} dense />
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {entry.action === 'edit_mode_enabled' && entry.metadata?.expiresAt
                          ? `Window of ${entry.metadata.durationMinutes} min, until ${fDateTime(
                              entry.metadata.expiresAt
                            )}`
                          : '—'}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Scrollbar>
    </Card>
  );

  return (
    <Stack spacing={3}>
      {renderSwitch()}
      {renderAudit()}
    </Stack>
  );
}
