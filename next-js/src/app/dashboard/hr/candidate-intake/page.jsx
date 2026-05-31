'use client';

import { z } from 'zod';
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';

import {
  listCandidateIntakeTokens,
  generateCandidateIntakeToken,
  listCandidateIntakeSubmissions,
  revokeCandidateIntakeToken,
} from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { toast } from 'src/components/snackbar';

// ─── Schema ───────────────────────────────────────────────────────────────────

const GenerateLinkSchema = z.object({
  candidateName: z.string().min(1, 'Name is required'),
  candidateEmail: z.string().email('Invalid email'),
  positionTitle: z.string().optional(),
  jobType: z.enum(['new_joiner', 'candidate']),
  expiresInHours: z.coerce.number().min(1).max(720).default(168),
  notes: z.string().optional(),
});

// ─── Status chip helper ───────────────────────────────────────────────────────

function StatusChip({ status }) {
  const map = {
    active: { label: 'Active', color: 'success' },
    used: { label: 'Used', color: 'default' },
    expired: { label: 'Expired', color: 'warning' },
    revoked: { label: 'Revoked', color: 'error' },
  };
  const { label, color } = map[status] || { label: status, color: 'default' };
  return <Chip label={label} color={color} size="small" />;
}

function JobTypeChip({ jobType }) {
  return (
    <Chip
      label={jobType === 'new_joiner' ? 'New Joiner' : 'Candidate'}
      color={jobType === 'new_joiner' ? 'primary' : 'info'}
      size="small"
      variant="outlined"
    />
  );
}

// ─── Generate Link Dialog ─────────────────────────────────────────────────────

function GenerateLinkDialog({ open, onClose, onGenerated, createdBy }) {
  const methods = useForm({
    resolver: zodResolver(GenerateLinkSchema),
    defaultValues: {
      candidateName: '',
      candidateEmail: '',
      positionTitle: '',
      jobType: 'candidate',
      expiresInHours: 168,
      notes: '',
    },
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values) => {
    try {
      const res = await generateCandidateIntakeToken({ ...values, createdBy });
      toast.success(`Link generated and sent to ${values.candidateEmail}`);
      onGenerated(res);
      handleClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to generate link');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate Candidate Intake Link</DialogTitle>
      <Form methods={methods} onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              A secure one-time link will be generated and emailed directly to the candidate. The
              link expires after a single use or when the expiry time is reached.
            </Alert>
            <Field.Text name="candidateName" label="Candidate Full Name *" />
            <Field.Text name="candidateEmail" label="Candidate Email *" type="email" />
            <Field.Text name="positionTitle" label="Position Title" />
            <Field.Select name="jobType" label="Type *">
              <MenuItem value="candidate">Interview Candidate</MenuItem>
              <MenuItem value="new_joiner">New Joiner</MenuItem>
            </Field.Select>
            <Field.Text
              name="expiresInHours"
              label="Link Validity (hours)"
              type="number"
              helperText="Default: 168 hours (7 days). Max: 720 hours (30 days)."
            />
            <Field.Text name="notes" label="Internal Notes (HR only)" multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
            Generate & Send Link
          </LoadingButton>
        </DialogActions>
      </Form>
    </Dialog>
  );
}

// ─── Copy Link Snackbar ───────────────────────────────────────────────────────

function CopySnackbar({ open, onClose }) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={3000}
      onClose={onClose}
      message="Link copied to clipboard"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CandidateIntakePage() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [tokens, setTokens] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copySnackbar, setCopySnackbar] = useState(false);
  const [revoking, setRevoking] = useState(null);

  // Read HR user from localStorage
  const createdBy = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.email || 'hr@iotatechnologies.io';
    } catch {
      return 'hr@iotatechnologies.io';
    }
  })();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tokRes, subRes] = await Promise.all([
        listCandidateIntakeTokens({}),
        listCandidateIntakeSubmissions({}),
      ]);
      setTokens(tokRes.tokens || []);
      setSubmissions(subRes.submissions || []);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRevoke = useCallback(
    async (id) => {
      setRevoking(id);
      try {
        await revokeCandidateIntakeToken(id, createdBy);
        toast.success('Link revoked');
        fetchAll();
      } catch (e) {
        toast.error('Failed to revoke link');
      } finally {
        setRevoking(null);
      }
    },
    [createdBy, fetchAll]
  );

  const handleCopyLink = useCallback((tokenSlug) => {
    const url = `${window.location.origin}/candidate-intake/${tokenSlug}`;
    navigator.clipboard.writeText(url).then(() => setCopySnackbar(true));
  }, []);

  // ─── Tokens table ───────────────────────────────────────────────────────────

  const tokenColumns = [
    { field: 'candidateName', headerName: 'Candidate', flex: 1, minWidth: 160 },
    { field: 'candidateEmail', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'positionTitle', headerName: 'Position', flex: 1, minWidth: 140 },
    {
      field: 'jobType',
      headerName: 'Type',
      width: 140,
      renderCell: ({ value }) => <JobTypeChip jobType={value} />,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: ({ value }) => <StatusChip status={value} />,
    },
    {
      field: 'expiresAt',
      headerName: 'Expires',
      width: 150,
      valueFormatter: ({ value }) => (value ? new Date(value).toLocaleDateString('en-GB') : '—'),
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 150,
      valueFormatter: ({ value }) => (value ? new Date(value).toLocaleDateString('en-GB') : '—'),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: ({ row }) => [
        <GridActionsCellItem
          key="copy"
          icon={
            <Tooltip title="Copy Link">
              <span>
                <Iconify icon="eva:copy-fill" />
              </span>
            </Tooltip>
          }
          label="Copy Link"
          onClick={() => handleCopyLink(row.token)}
          disabled={row.status !== 'active'}
        />,
        <GridActionsCellItem
          key="revoke"
          icon={
            <Tooltip title="Revoke Link">
              <span>
                <Iconify icon="eva:slash-fill" />
              </span>
            </Tooltip>
          }
          label="Revoke"
          onClick={() => handleRevoke(row.id)}
          disabled={row.status !== 'active' || revoking === row.id}
          showInMenu
        />,
      ],
    },
  ];

  // ─── Submissions table ──────────────────────────────────────────────────────

  const submissionColumns = [
    { field: 'candidateName', headerName: 'Candidate', flex: 1, minWidth: 160 },
    { field: 'candidateEmail', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'positionTitle', headerName: 'Position', flex: 1, minWidth: 140 },
    {
      field: 'jobType',
      headerName: 'Type',
      width: 140,
      renderCell: ({ value }) => <JobTypeChip jobType={value} />,
    },
    { field: 'nationality', headerName: 'Nationality', width: 130 },
    { field: 'countryOfResidence', headerName: 'Country', width: 130 },
    {
      field: 'expectedTotalPackage',
      headerName: 'Expected Total',
      width: 140,
      valueFormatter: ({ value, row }) =>
        value ? `${row.currencyCode || 'SAR'} ${Number(value).toLocaleString()}` : '—',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: ({ value }) => (
        <Chip
          label={value}
          color={value === 'submitted' ? 'info' : value === 'reviewed' ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'submittedAt',
      headerName: 'Submitted',
      width: 150,
      valueFormatter: ({ value }) => (value ? new Date(value).toLocaleDateString('en-GB') : '—'),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'View',
      width: 80,
      getActions: ({ row }) => [
        <GridActionsCellItem
          key="view"
          icon={<Iconify icon="eva:eye-fill" />}
          label="View"
          onClick={() => router.push(paths.dashboard.hr.candidateIntake.details(row.id))}
        />,
      ],
    },
  ];

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Candidate Intake"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Candidate Intake' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="eva:plus-fill" />}
            onClick={() => setDialogOpen(true)}
          >
            Generate Link
          </Button>
        }
        sx={{ mb: 3 }}
      />

      {/* Stats summary */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Links', value: tokens.length, color: 'primary.main' },
          {
            label: 'Active',
            value: tokens.filter((t) => t.status === 'active').length,
            color: 'success.main',
          },
          {
            label: 'Used',
            value: tokens.filter((t) => t.status === 'used').length,
            color: 'text.secondary',
          },
          { label: 'Submissions', value: submissions.length, color: 'info.main' },
        ].map((s) => (
          <Card key={s.label} sx={{ p: 2, minWidth: 120, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700} sx={{ color: s.color }}>
              {s.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {s.label}
            </Typography>
          </Card>
        ))}
      </Stack>

      {/* Tabs */}
      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Links (${tokens.length})`} />
          <Tab label={`Submissions (${submissions.length})`} />
        </Tabs>

        {tab === 0 && (
          <DataGrid
            rows={tokens}
            columns={tokenColumns}
            loading={loading}
            autoHeight
            pageSizeOptions={[25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            sx={{ border: 'none' }}
            getRowId={(r) => r.id}
          />
        )}

        {tab === 1 && (
          <DataGrid
            rows={submissions}
            columns={submissionColumns}
            loading={loading}
            autoHeight
            pageSizeOptions={[25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            sx={{ border: 'none' }}
            getRowId={(r) => r.id}
          />
        )}
      </Card>

      {/* Generate dialog */}
      <GenerateLinkDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onGenerated={fetchAll}
        createdBy={createdBy}
      />

      <CopySnackbar open={copySnackbar} onClose={() => setCopySnackbar(false)} />
    </DashboardContent>
  );
}
