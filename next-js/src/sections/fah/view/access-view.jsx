'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { fahError, grantRole, revokeRole, useFahRoles, useFahCatalog } from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { FAH_ROLE } from '../fah-labels';
import { useFahT, FahGate } from '../fah-gate';

// ----------------------------------------------------------------------

const ROLE_COLOR = {
  'finance.viewer': 'default',
  auditor: 'default',
  'practice.lead': 'secondary',
  'finance.accountant': 'info',
  'finance.controller': 'warning',
  'finance.cfo': 'error',
  'fah.integration': 'default',
};

export function AccessView() {
  const { t } = useFahT();

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('access.title', 'Finance access')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('access.title', 'Finance access') },
        ]}
        sx={{ mb: 3 }}
      />
      <FahGate minRank={4}>
        <AccessBoard />
      </FahGate>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function AccessBoard() {
  const { t, nameOf } = useFahT();
  const { assignments, roles, loading, error } = useFahRoles();
  const { practices } = useFahCatalog();
  const [open, setOpen] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [busy, setBusy] = useState(false);

  const practiceName = (id) => nameOf(practices.find((p) => p.id === id)) || '—';

  const handleRevoke = async () => {
    setBusy(true);
    try {
      await revokeRole(revoking.id);
      toast.success(t('access.revoked', 'Role revoked'));
      setRevoking(null);
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        gap: 3,
        display: 'grid',
        alignItems: 'start',
        gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
      }}
    >
      <Card component={m.div} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          sx={{ p: 2.5 }}
        >
          <Box>
            <Typography variant="h6">{t('access.assignments', 'Finance roles')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t(
                'access.assignmentsHelp',
                'Who can read, prepare, approve and control the ledger.'
              )}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:user-plus-bold" />}
            onClick={() => setOpen(true)}
            sx={{ flexShrink: 0 }}
          >
            {t('access.give', 'Give a role')}
          </Button>
        </Stack>

        <Box sx={{ height: 2 }}>{loading && <LinearProgress />}</Box>
        {error && (
          <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
            {fahError(error)}
          </Alert>
        )}

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('access.email', 'E-mail')}</TableCell>
                <TableCell>{t('access.role', 'Role')}</TableCell>
                <TableCell>{t('access.practice', 'Practice')}</TableCell>
                <TableCell>{t('access.granted', 'Granted')}</TableCell>
                <TableCell width={56} />
              </TableRow>
            </TableHead>
            <TableBody>
              <AnimatePresence initial={false}>
                {assignments.map((a) => (
                  <TableRow
                    key={a.id}
                    component={m.tr}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    hover
                  >
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {a.userEmail}
                      </Typography>
                      {a.note && (
                        <Typography variant="caption" color="text.secondary">
                          {a.note}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Label variant="soft" color={ROLE_COLOR[a.role] ?? 'default'}>
                        {t(`role.${a.role}`, FAH_ROLE[a.role]?.label ?? a.role)}
                      </Label>
                    </TableCell>
                    <TableCell>
                      {a.role === 'practice.lead' ? practiceName(a.practiceId) : '—'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {a.grantedBy}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {fDateTime(a.grantedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={t('access.revoke', 'Revoke')}>
                        <IconButton color="error" onClick={() => setRevoking(a)}>
                          <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </TableContainer>
        {!loading && !assignments.length && (
          <EmptyContent
            title={t('access.empty', 'No finance roles given yet')}
            description={t('access.emptyHelp', 'Super-admins already act as CFO.')}
            sx={{ py: 6 }}
          />
        )}
      </Card>

      <Card
        component={m.div}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        sx={{ p: 2.5 }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Iconify
            icon="solar:shield-keyhole-bold-duotone"
            width={28}
            sx={{ color: 'primary.main' }}
          />
          <Typography variant="h6">{t('access.rolesTitle', 'What each role can do')}</Typography>
        </Stack>
        <Stack spacing={1.5}>
          {Object.entries(FAH_ROLE).map(([role, info]) => (
            <Box key={role}>
              <Label variant="soft" color={ROLE_COLOR[role] ?? 'default'}>
                {t(`role.${role}`, info.label)}
              </Label>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t(`roleHelp.${role}`, info.help)}
              </Typography>
            </Box>
          ))}
        </Stack>
        <Alert severity="info" sx={{ mt: 2.5 }}>
          {t(
            'access.note',
            'Super-admins are CFO automatically. To see the menu, people also need the Finance → Accounting page in Access Control (Users → Page Access).'
          )}
        </Alert>
      </Card>

      <GrantDialog
        open={open}
        onClose={() => setOpen(false)}
        roles={roles.length ? roles : Object.keys(FAH_ROLE)}
        practices={practices.filter((p) => p.isActive && p.isRevenueCentre)}
      />

      <ConfirmDialog
        open={!!revoking}
        onClose={() => !busy && setRevoking(null)}
        title={t('access.revokeTitle', 'Revoke this role?')}
        content={
          revoking &&
          t('access.revokeContent', '{{email}} loses the {{role}} role at once.', {
            email: revoking.userEmail,
            role: t(`role.${revoking.role}`, FAH_ROLE[revoking.role]?.label ?? revoking.role),
          })
        }
        action={
          <LoadingButton variant="contained" color="error" loading={busy} onClick={handleRevoke}>
            {t('access.revoke', 'Revoke')}
          </LoadingButton>
        }
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

function GrantDialog({ open, onClose, roles, practices }) {
  const { t, nameOf } = useFahT();
  const blank = { email: '', role: 'finance.viewer', practiceId: '', note: '' };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const isLead = form.role === 'practice.lead';
  const valid = /^[^@\s]+@[^@\s]+$/.test(form.email.trim()) && (!isLead || form.practiceId);

  const handleClose = () => {
    if (busy) return;
    setForm(blank);
    onClose();
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await grantRole({
        email: form.email.trim(),
        role: form.role,
        practiceId: isLead ? form.practiceId : null,
        note: form.note.trim() || null,
      });
      toast.success(t('access.grantedToast', 'Role given'));
      setForm(blank);
      onClose();
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('access.give', 'Give a role')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            autoFocus
            label={t('access.email', 'E-mail')}
            value={form.email}
            onChange={set('email')}
            helperText={t('access.emailHelp', 'The address they sign in to the dashboard with.')}
          />
          <TextField
            select
            label={t('access.role', 'Role')}
            value={form.role}
            onChange={set('role')}
            SelectProps={{
              renderValue: (value) => t(`role.${value}`, FAH_ROLE[value]?.label ?? value),
            }}
          >
            {roles.map((role) => (
              <MenuItem key={role} value={role}>
                <Stack>
                  <Typography variant="subtitle2">
                    {t(`role.${role}`, FAH_ROLE[role]?.label ?? role)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t(`roleHelp.${role}`, FAH_ROLE[role]?.help ?? '')}
                  </Typography>
                </Stack>
              </MenuItem>
            ))}
          </TextField>
          {isLead && (
            <TextField
              select
              label={t('access.practice', 'Practice')}
              value={form.practiceId}
              onChange={set('practiceId')}
            >
              {practices.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {nameOf(p)}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            label={t('access.noteLabel', 'Note (optional)')}
            value={form.note}
            onChange={set('note')}
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton variant="contained" loading={busy} disabled={!valid} onClick={handleSave}>
          {t('access.give', 'Give a role')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
