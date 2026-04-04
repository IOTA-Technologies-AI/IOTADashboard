'use client';

import { useState, useEffect } from 'react';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { paths } from 'src/routes/paths';

import { submitApproval, listPendingApprovals } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

function RequestsTable({ rows, tableKey, onApprove, onReject }) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>#</TableCell>
          <TableCell>Employee ID</TableCell>
          <TableCell>Type</TableCell>
          <TableCell>Submitted</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} align="center">
              No pending requests.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.id}</TableCell>
              <TableCell>{r.employeeId}</TableCell>
              <TableCell>{r.requestType ?? r.category ?? '—'}</TableCell>
              <TableCell>
                {r.submittedAt?.split('T')[0] ?? r.createdAt?.split('T')[0] ?? '—'}
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    color="success"
                    variant="contained"
                    onClick={() => onApprove(tableKey, r.id, r.approverLevel ?? 1)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => onReject(tableKey, r.id, r.approverLevel ?? 1)}
                  >
                    Reject
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export default function PendingApprovalsPage() {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [dialog, setDialog] = useState(null); // { table, id, level, decision }
  const [notes, setNotes] = useState('');

  const reload = () => {
    // Use empty email to get all pending (approver filter applied server-side in real usage)
    listPendingApprovals('')
      .then(setData)
      .catch((e) => console.error('Failed to load pending approvals:', e));
  };

  useEffect(() => {
    reload();
  }, []);

  const handleApprove = (table, id, level) => {
    setDialog({ table, id, level, decision: 'approved' });
    setNotes('');
  };

  const handleReject = (table, id, level) => {
    setDialog({ table, id, level, decision: 'rejected' });
    setNotes('');
  };

  const handleConfirm = async () => {
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const user = userStr ? JSON.parse(userStr) : {};
      await submitApproval({
        requestTable: dialog.table,
        requestId: dialog.id,
        level: dialog.level,
        approverEmail: user.email ?? '',
        approverRole: user.role ?? '',
        decision: dialog.decision,
        notes,
      });
      toast.success(`Request ${dialog.decision}`);
      setDialog(null);
      reload();
    } catch {
      toast.error('Failed to submit decision');
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Pending Approvals"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee Requests', href: paths.dashboard.hr.employeeRequests.root },
          { name: 'Pending Approvals' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Visa (${data?.pendingVisaRequests?.length ?? 0})`} />
        <Tab label={`Service (${data?.pendingServiceRequests?.length ?? 0})`} />
        <Tab label={`Reimbursements (${data?.pendingReimbursements?.length ?? 0})`} />
      </Tabs>

      <Card>
        {tab === 0 && (
          <RequestsTable
            rows={data?.pendingVisaRequests ?? []}
            tableKey="employeeVisaRequests"
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
        {tab === 1 && (
          <RequestsTable
            rows={data?.pendingServiceRequests ?? []}
            tableKey="employeeServiceRequests"
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
        {tab === 2 && (
          <RequestsTable
            rows={data?.pendingReimbursements ?? []}
            tableKey="reimbursementRequests"
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </Card>

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {dialog?.decision === 'approved' ? 'Approve Request' : 'Reject Request'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Notes (optional)"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={dialog?.decision === 'approved' ? 'success' : 'error'}
            onClick={handleConfirm}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
