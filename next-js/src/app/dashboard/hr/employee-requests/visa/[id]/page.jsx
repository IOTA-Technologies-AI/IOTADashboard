'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';

import { getRequestWithApprovals, updateVisaRequest } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

const LabelValue = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2">{value || '—'}</Typography>
  </Box>
);

export default function VisaRequestDetailPage({ params }) {
  const { id } = params;
  const [request, setRequest] = useState(null);
  const [approvals, setApprovals] = useState([]);

  const load = () => {
    getRequestWithApprovals('employeeVisaRequests', id)
      .then((data) => {
        setRequest(data.request);
        setApprovals(data.approvals ?? []);
      })
      .catch((e) => console.error('Failed to load visa request:', e));
  };

  useEffect(() => {
    load();
  }, [id]);

  const markComplete = async () => {
    try {
      await updateVisaRequest(id, { status: 'completed' });
      toast.success('Marked as completed');
      load();
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (!request) return null;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={`Visa Request #${request.id}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Visa Requests', href: paths.dashboard.hr.employeeRequests.visa.root },
          { name: `#${request.id}` },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <Card>
          <CardHeader title="Request Details" />
          <CardContent>
            <Stack spacing={2}>
              <LabelValue label="Employee ID" value={request.employeeId} />
              <LabelValue label="Request Type" value={request.requestType} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Box>
                  <Chip label={request.status} size="small" variant="soft" />
                </Box>
              </Box>
              <LabelValue label="Notes" value={request.notes} />
              <LabelValue label="Submitted At" value={request.submittedAt?.split('T')[0]} />
              {request.status === 'approved' && (
                <Button variant="outlined" size="small" onClick={markComplete}>
                  Mark Complete
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Approval History" />
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Level</TableCell>
                <TableCell>Approver</TableCell>
                <TableCell>Decision</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>Decided At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {approvals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No approvals yet.
                  </TableCell>
                </TableRow>
              ) : (
                approvals.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.level}</TableCell>
                    <TableCell>{a.approverEmail}</TableCell>
                    <TableCell>
                      <Chip
                        label={a.decision}
                        color={
                          a.decision === 'approved'
                            ? 'success'
                            : a.decision === 'rejected'
                              ? 'error'
                              : 'default'
                        }
                        size="small"
                        variant="soft"
                      />
                    </TableCell>
                    <TableCell>{a.notes ?? '—'}</TableCell>
                    <TableCell>{a.decidedAt?.split('T')[0] ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </Stack>
    </DashboardContent>
  );
}
