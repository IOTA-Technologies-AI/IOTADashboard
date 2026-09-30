'use client';

import useSWR from 'swr';
import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButton from '@mui/material/ToggleButton';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';
import { getEmployees } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  revokeOnboardingToken,
  generateOnboardingLink,
  listOnboardingSubmissions,
} from 'src/actions/employee-onboarding';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const TOKEN_STATUS = {
  active: { label: 'Active', color: 'success' },
  used: { label: 'Submitted', color: 'info' },
  expired: { label: 'Expired', color: 'warning' },
  revoked: { label: 'Revoked', color: 'error' },
};

const SUBMISSION_STATUS = {
  submitted: { label: 'Awaiting review', color: 'warning' },
  reviewed: { label: 'Reviewed', color: 'info' },
  applied: { label: 'Applied to record', color: 'success' },
  archived: { label: 'Archived', color: 'default' },
};

const ONBOARDING_STATUS = {
  not_sent: { label: 'Not sent', color: 'default' },
  link_sent: { label: 'Link sent', color: 'info' },
  submitted: { label: 'Submitted', color: 'warning' },
  completed: { label: 'Completed', color: 'success' },
};

function StatusLabel({ map, value }) {
  const entry = map[value] || { label: value || '—', color: 'default' };
  return (
    <Label variant="soft" color={entry.color}>
      {entry.label}
    </Label>
  );
}

// ----------------------------------------------------------------------

const EMPTY_JOINER = { fullName: '', designation: '', department: '', joiningDate: '' };
const isEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v || '').trim());

/**
 * Two kinds of recipient:
 *  - a NEW JOINER with no HR record yet — HR types the name and the PERSONAL
 *    email; the employee record is created when the submission is accepted
 *    and the company mailbox is added later
 *  - an EXISTING employee — picked from HR > Employees; the link goes to the
 *    personal email if one is on record, and the address can be overridden
 */
function SendLinkDialog({ open, onClose, onSent, employees }) {
  const [mode, setMode] = useState('new_joiner');
  const [employee, setEmployee] = useState(null);
  const [joiner, setJoiner] = useState(EMPTY_JOINER);
  const [email, setEmail] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(168);
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  const handleClose = () => {
    setEmployee(null);
    setJoiner(EMPTY_JOINER);
    setEmail('');
    setNotes('');
    onClose();
  };

  const handlePickEmployee = (_, value) => {
    setEmployee(value);
    setEmail(value?.personalEmail || value?.email || '');
  };

  const setJoinerField = (key) => (e) => setJoiner((prev) => ({ ...prev, [key]: e.target.value }));

  const isNew = mode === 'new_joiner';
  const canSend = isEmail(email) && (isNew ? joiner.fullName.trim().length > 1 : !!employee);

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const payload = isNew
        ? {
            fullName: joiner.fullName.trim(),
            email: email.trim(),
            ...(joiner.designation ? { designation: joiner.designation.trim() } : {}),
            ...(joiner.department ? { department: joiner.department.trim() } : {}),
            ...(joiner.joiningDate ? { joiningDate: joiner.joiningDate } : {}),
          }
        : { employeeId: employee.id, email: email.trim() };
      await generateOnboardingLink({ ...payload, expiresInHours, notes });
      toast.success(`Onboarding link sent to ${email.trim()}`);
      onSent();
      handleClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to send link');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Send Onboarding Link</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            color="primary"
            value={mode}
            onChange={(_, v) => {
              if (!v) return;
              setMode(v);
              setEmail(v === 'existing' ? employee?.personalEmail || employee?.email || '' : '');
            }}
          >
            <ToggleButton value="new_joiner">New joiner</ToggleButton>
            <ToggleButton value="existing">Existing employee</ToggleButton>
          </ToggleButtonGroup>

          <Alert severity="info">
            {isNew
              ? 'For someone joining who is not in HR > Employees yet. The link goes to their personal email; the employee record is created when you accept their form, and the company email is added afterwards.'
              : 'For someone already in HR > Employees. The link goes to the address below — their personal email if one is on record.'}{' '}
            It can be used once and opens only after a one-time code is verified.
          </Alert>

          {isNew ? (
            <>
              <TextField
                label="Full name *"
                value={joiner.fullName}
                onChange={setJoinerField('fullName')}
              />
              <TextField
                label="Personal email *"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!email && !isEmail(email)}
                helperText="The link and the verification code are sent here."
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Designation"
                  value={joiner.designation}
                  onChange={setJoinerField('designation')}
                />
                <TextField
                  fullWidth
                  label="Department"
                  value={joiner.department}
                  onChange={setJoinerField('department')}
                />
              </Stack>
              <TextField
                label="Expected joining date"
                type="date"
                value={joiner.joiningDate}
                onChange={setJoinerField('joiningDate')}
                InputLabelProps={{ shrink: true }}
              />
            </>
          ) : (
            <>
              <Autocomplete
                options={employees}
                value={employee}
                onChange={handlePickEmployee}
                getOptionLabel={(o) =>
                  `${o.firstName || ''} ${o.lastName || ''}`.trim() +
                  (o.employeeId ? ` (${o.employeeId})` : '') +
                  (o.email ? ` — ${o.email}` : '')
                }
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} label="Employee *" />}
              />
              <TextField
                label="Send to *"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!email && !isEmail(email)}
                helperText="Defaults to the personal email on record, then the work email. Change it if needed."
              />
              {employee?.onboardingStatus && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Current onboarding status:
                  </Typography>
                  <StatusLabel map={ONBOARDING_STATUS} value={employee.onboardingStatus} />
                </Stack>
              )}
            </>
          )}

          <TextField
            select
            label="Link validity"
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(Number(e.target.value))}
          >
            <MenuItem value={72}>3 days</MenuItem>
            <MenuItem value={168}>7 days</MenuItem>
            <MenuItem value={336}>14 days</MenuItem>
            <MenuItem value={720}>30 days</MenuItem>
          </TextField>
          <TextField
            label="Internal notes (HR only)"
            multiline
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <LoadingButton
          variant="contained"
          loading={sending}
          disabled={!canSend}
          onClick={handleSend}
        >
          Send Link
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

export function OnboardingListView() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revoking, setRevoking] = useState(null);

  const { data, isLoading, mutate } = useSWR('employee-onboarding/list', () =>
    listOnboardingSubmissions()
  );
  const { data: employees } = useSWR('employees/all', () => getEmployees(), {
    revalidateOnFocus: false,
  });

  const tokens = useMemo(() => data?.tokens || [], [data]);
  const submissions = useMemo(() => data?.submissions || [], [data]);
  const employeeList = useMemo(
    () => (Array.isArray(employees) ? employees : []).filter((e) => e?.id),
    [employees]
  );

  const handleRevoke = useCallback(
    async (id) => {
      setRevoking(id);
      try {
        await revokeOnboardingToken(id);
        toast.success('Link revoked');
        mutate();
      } catch (e) {
        toast.error(e?.response?.data?.message || 'Failed to revoke link');
      } finally {
        setRevoking(null);
      }
    },
    [mutate]
  );

  const handleCopyLink = useCallback((slug) => {
    const url = `https://aspirants.iotatechnologies.io/onboarding/${slug}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied to clipboard'));
  }, []);

  const tokenColumns = [
    { field: 'employeeName', headerName: 'Name', flex: 1, minWidth: 180 },
    {
      field: 'recipientType',
      headerName: 'Type',
      width: 130,
      renderCell: ({ row }) => (
        <Label variant="soft" color={row.employeeId ? 'default' : 'info'}>
          {row.employeeId ? row.employeeCode || 'Employee' : 'New joiner'}
        </Label>
      ),
    },
    { field: 'employeeEmail', headerName: 'Sent to', flex: 1, minWidth: 200 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: ({ value }) => <StatusLabel map={TOKEN_STATUS} value={value} />,
    },
    {
      field: 'draftSavedAt',
      headerName: 'Draft saved',
      width: 130,
      valueFormatter: (value) => (value ? fDate(value) : '—'),
    },
    {
      field: 'expiresAt',
      headerName: 'Expires',
      width: 130,
      valueFormatter: (value) => (value ? fDate(value) : '—'),
    },
    {
      field: 'createdAt',
      headerName: 'Sent',
      width: 130,
      valueFormatter: (value) => (value ? fDate(value) : '—'),
    },
    { field: 'createdBy', headerName: 'Sent by', width: 200 },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      width: 100,
      getActions: ({ row }) => [
        <GridActionsCellItem
          key="copy"
          icon={
            <Tooltip title="Copy link">
              <span>
                <Iconify icon="eva:copy-fill" />
              </span>
            </Tooltip>
          }
          label="Copy link"
          onClick={() => handleCopyLink(row.token)}
          disabled={row.status !== 'active'}
        />,
        <GridActionsCellItem
          key="revoke"
          icon={<Iconify icon="eva:slash-fill" />}
          label="Revoke"
          onClick={() => handleRevoke(row.id)}
          disabled={row.status !== 'active' || revoking === row.id}
          showInMenu
        />,
      ],
    },
  ];

  const submissionColumns = [
    { field: 'employeeName', headerName: 'Name', flex: 1, minWidth: 180 },
    {
      field: 'employeeCode',
      headerName: 'HR record',
      width: 130,
      renderCell: ({ row }) => (
        <Label variant="soft" color={row.employeeId ? 'default' : 'info'}>
          {row.employeeId ? row.employeeCode || 'Employee' : 'New joiner'}
        </Label>
      ),
    },
    { field: 'nationality', headerName: 'Nationality', width: 130 },
    { field: 'maritalStatus', headerName: 'Marital', width: 100 },
    { field: 'numberOfDependents', headerName: 'Dependants', width: 110, type: 'number' },
    {
      field: 'iban',
      headerName: 'IBAN',
      width: 120,
      valueFormatter: (value) => (value ? `…${String(value).slice(-4)}` : '—'),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 160,
      renderCell: ({ value }) => <StatusLabel map={SUBMISSION_STATUS} value={value} />,
    },
    {
      field: 'submittedAt',
      headerName: 'Submitted',
      width: 130,
      valueFormatter: (value) => (value ? fDate(value) : '—'),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      width: 70,
      getActions: ({ row }) => [
        <GridActionsCellItem
          key="view"
          icon={<Iconify icon="eva:eye-fill" />}
          label="Review"
          onClick={() => router.push(paths.dashboard.hr.employeeOnboarding.details(row.id))}
        />,
      ],
    },
  ];

  const stats = [
    { label: 'Links sent', value: tokens.length, color: 'primary.main' },
    {
      label: 'Awaiting employee',
      value: tokens.filter((t) => t.status === 'active').length,
      color: 'info.main',
    },
    {
      label: 'Awaiting HR review',
      value: submissions.filter((s) => s.status === 'submitted').length,
      color: 'warning.main',
    },
    {
      label: 'Applied to records',
      value: submissions.filter((s) => s.status === 'applied').length,
      color: 'success.main',
    },
  ];

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Employee Onboarding"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee Onboarding' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="eva:paper-plane-fill" />}
            onClick={() => setDialogOpen(true)}
          >
            Send Onboarding Link
          </Button>
        }
        sx={{ mb: 3 }}
      />

      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
        {stats.map((s) => (
          <Card key={s.label} sx={{ p: 2, minWidth: 150, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700} sx={{ color: s.color }}>
              {s.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {s.label}
            </Typography>
          </Card>
        ))}
      </Stack>

      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Submissions (${submissions.length})`} />
          <Tab label={`Links (${tokens.length})`} />
        </Tabs>
        <Box sx={{ minHeight: 300 }}>
          {tab === 0 ? (
            <DataGrid
              rows={submissions}
              columns={submissionColumns}
              loading={isLoading}
              autoHeight
              pageSizeOptions={[25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              sx={{ border: 'none' }}
              getRowId={(r) => r.id}
            />
          ) : (
            <DataGrid
              rows={tokens}
              columns={tokenColumns}
              loading={isLoading}
              autoHeight
              pageSizeOptions={[25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              sx={{ border: 'none' }}
              getRowId={(r) => r.id}
            />
          )}
        </Box>
      </Card>

      <SendLinkDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSent={mutate}
        employees={employeeList}
      />
    </DashboardContent>
  );
}
