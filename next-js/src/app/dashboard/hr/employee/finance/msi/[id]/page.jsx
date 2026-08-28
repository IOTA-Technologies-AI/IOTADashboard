'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getMsiRequest, submitApproval } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// Once a decision exists the figures are what the approver signed off on, so
// the request is read-only from here on.
const SETTLED = ['approved', 'rejected', 'cancelled'];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (v) => num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fDay = (v) => (v ? new Date(v).toLocaleDateString('en-GB') : '-');

export default function MsiDetailPage({ params }) {
  const router = useRouter();
  const { id } = params;

  const [msi, setMsi] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [notes, setNotes] = useState('');
  const [deciding, setDeciding] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { request, approvals: history } = await getMsiRequest(id);
      setMsi(request);
      setApprovals(history);
    } catch (error) {
      console.error('Failed to load increment', error);
      toast.error('Failed to load increment');
      setMsi(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDecision = async () => {
    setDeciding(true);
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const user = userStr ? JSON.parse(userStr) : {};
      await submitApproval({
        requestTable: 'employeeMsiRequests',
        requestId: Number(id),
        // MSI is single-level, so level 1 is the only decision there is.
        level: 1,
        approverEmail: user.email ?? '',
        approverRole: user.role ?? '',
        decision: dialog.decision,
        notes,
      });
      const approved = dialog.decision === 'approved';
      toast.success(`Increment ${dialog.decision}`);
      setDialog(null);
      setNotes('');

      // Approving is what brings the letter into existence, so hand it over
      // straight away. The window.open is outside the click's gesture context
      // by now and a strict popup blocker may swallow it — the Download Letter
      // button above is the fallback, not the only route.
      if (approved) {
        window.open(`/msi-print/${id}`, '_blank');
      }

      await load();
    } catch (error) {
      console.error('Failed to record decision', error);
      toast.error('Failed to record decision');
    } finally {
      setDeciding(false);
    }
  };

  if (loading) {
    return (
      <DashboardContent>
        <Typography>Loading…</Typography>
      </DashboardContent>
    );
  }

  if (!msi) {
    return (
      <DashboardContent>
        <Alert severity="error">Increment not found.</Alert>
      </DashboardContent>
    );
  }

  const isSettled = SETTLED.includes(msi.status);
  const isApproved = msi.status === 'approved';
  const currency = msi.currencyCode || 'SAR';

  const rows = [
    { label: 'Basic Salary', current: msi.currentBasic, revised: msi.revisedBasic },
    { label: 'Housing Allowance', current: msi.currentHousing, revised: msi.revisedHousing },
    {
      label: 'Transportation Allowance',
      current: msi.currentTransport,
      revised: msi.revisedTransport,
    },
    { label: 'Other Allowances', current: msi.currentOther, revised: msi.revisedOther },
  ].filter((r) => num(r.current) > 0 || num(r.revised) > 0);

  const statusText = isApproved && msi.appliedAt ? 'Applied' : msi.status;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={`Increment — ${msi.employeeName || `#${msi.id}`}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee', href: paths.dashboard.hr.employee.root },
          { name: 'Finance' },
          { name: 'MSI', href: paths.dashboard.hr.employee.finance.msi.root },
          { name: msi.letterRef || `#${msi.id}` },
        ]}
        action={
          <Stack direction="row" spacing={1.5}>
            {!isSettled && (
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:pen-bold" />}
                onClick={() => router.push(paths.dashboard.hr.employee.finance.msi.edit(msi.id))}
              >
                Edit
              </Button>
            )}
            {isApproved && (
              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:file-download-bold" />}
                onClick={() => window.open(`/msi-print/${msi.id}`, '_blank')}
              >
                Download Letter
              </Button>
            )}
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {!isSettled && (
        <Alert severity="info" sx={{ mb: 3 }}>
          This increment is awaiting a decision. It can still be edited; once approved or
          rejected it is locked and the letter becomes available.
        </Alert>
      )}

      {isApproved && !msi.appliedAt && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Approved. The revised salary will be written to the employee record on{' '}
          {fDay(msi.effectiveDate)}.
        </Alert>
      )}

      {isApproved && msi.appliedAt && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Applied to the employee record on {fDay(msi.appliedAt)}.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Revision" />
            <TableContainer sx={{ px: 3, pb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Component</TableCell>
                    <TableCell align="right">{`Current (${currency})`}</TableCell>
                    <TableCell align="right">{`Revised (${currency})`}</TableCell>
                    <TableCell align="right">Change</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => {
                    const delta = num(r.revised) - num(r.current);
                    return (
                      <TableRow key={r.label}>
                        <TableCell>{r.label}</TableCell>
                        <TableCell align="right">{fmt(r.current)}</TableCell>
                        <TableCell align="right">{fmt(r.revised)}</TableCell>
                        <TableCell align="right" sx={{ color: delta > 0 ? 'primary.main' : 'text.secondary' }}>
                          {delta > 0 ? `+${fmt(delta)}` : fmt(delta)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Gross Monthly Salary</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {fmt(msi.currentGross)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {fmt(msi.revisedGross)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {`+${fmt(num(msi.revisedGross) - num(msi.currentGross))} (${num(
                        msi.increasePercent
                      ).toFixed(2)}%)`}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {(msi.reason || msi.notes) && (
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Justification" />
              <Stack spacing={2} sx={{ p: 3 }}>
                {msi.reason && <Typography variant="body2">{msi.reason}</Typography>}
                {msi.notes && (
                  <Typography variant="body2" color="text.secondary">
                    {msi.notes}
                  </Typography>
                )}
              </Stack>
            </Card>
          )}

          <Card>
            <CardHeader title="Approval History" />
            <Box sx={{ p: 3 }}>
              {approvals.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No decision recorded yet.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {approvals.map((a) => (
                    <Stack key={a.id} direction="row" spacing={2} alignItems="center">
                      <Chip
                        size="small"
                        color={a.decision === 'approved' ? 'success' : 'error'}
                        label={a.decision}
                      />
                      <Box>
                        <Typography variant="body2">{a.approverEmail}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {a.decidedAt ? new Date(a.decidedAt).toLocaleString('en-GB') : ''}
                          {a.notes ? ` — ${a.notes}` : ''}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, mb: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">Status</Typography>
                <Label
                  variant="soft"
                  color={
                    msi.status === 'approved'
                      ? 'success'
                      : msi.status === 'rejected'
                        ? 'error'
                        : 'warning'
                  }
                  sx={{ textTransform: 'capitalize' }}
                >
                  {statusText}
                </Label>
              </Stack>
              <Divider sx={{ borderStyle: 'dashed' }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Employee
                </Typography>
                <Typography variant="body2">{msi.employeeName || '-'}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Employee ID
                </Typography>
                <Typography variant="body2">{msi.employeeCode || '-'}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Designation
                </Typography>
                <Typography variant="body2">{msi.designation || '-'}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Effective date
                </Typography>
                <Typography variant="body2">{fDay(msi.effectiveDate)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Letter reference
                </Typography>
                <Typography variant="body2">{msi.letterRef || '-'}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Raised by
                </Typography>
                <Typography variant="body2">{msi.createdBy || '-'}</Typography>
              </Stack>
            </Stack>
          </Card>

          {!isSettled && (
            <Card sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Decision
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  onClick={() => setDialog({ decision: 'approved' })}
                >
                  Approve
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  onClick={() => setDialog({ decision: 'rejected' })}
                >
                  Reject
                </Button>
              </Stack>
            </Card>
          )}
        </Grid>
      </Grid>

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ textTransform: 'capitalize' }}>
          {dialog?.decision === 'approved' ? 'Approve increment' : 'Reject increment'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {dialog?.decision === 'approved'
              ? `The letter becomes available immediately, and the revised salary is written to the employee record on ${fDay(msi.effectiveDate)}. This cannot be undone or edited afterwards.`
              : 'The increment is closed and can no longer be edited.'}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={dialog?.decision === 'approved' ? 'success' : 'error'}
            disabled={deciding}
            onClick={handleDecision}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
