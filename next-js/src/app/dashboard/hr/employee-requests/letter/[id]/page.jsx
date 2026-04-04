'use client';

import { use, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import {
  updateLetterRequest,
  getRequestWithApprovals,
  generateLetterDocument,
} from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

const STATUS_COLORS = {
  submitted: 'info',
  under_review: 'warning',
  approved: 'success',
  rejected: 'error',
  completed: 'success',
  cancelled: 'default',
  pending: 'default',
};

function LabelValue({ label, value }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Stack>
  );
}

export default function LetterRequestDetailPage({ params }) {
  const { id } = use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await getRequestWithApprovals('employeeLetterRequests', id);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const markComplete = async () => {
    try {
      await updateLetterRequest(id, { status: 'completed' });
      toast.success('Marked as completed');
      load();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleGenerateDocument = async () => {
    try {
      const html = await generateLetterDocument(id);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      }
    } catch {
      toast.error('Failed to generate document');
    }
  };

  if (loading || !data) return null;
  const req = data.request;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={`Letter Request #${id}`}
        links={[
          { name: 'Letter Requests', href: paths.dashboard.hr.employeeRequests.letter.root },
          { name: `#${id}` },
        ]}
        sx={{ mb: 3 }}
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Request Details</Typography>
              <Stack direction="row" spacing={1}>
                <Chip label={req.status} color={STATUS_COLORS[req.status] || 'default'} />
                {req.status === 'approved' && (
                  <>
                    <Button variant="outlined" size="small" onClick={handleGenerateDocument}>
                      Generate Document
                    </Button>
                    <Button variant="outlined" size="small" onClick={markComplete}>
                      Mark Complete
                    </Button>
                  </>
                )}
              </Stack>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
              <LabelValue label="Employee ID" value={req.employeeId} />
              <LabelValue label="Letter Type" value={req.requestType} />
              <LabelValue label="Purpose" value={req.purposeOfLetter} />
              <LabelValue label="Addressed To" value={req.addressedTo} />
              <LabelValue label="Delivery Method" value={req.deliveryMethod} />
              <LabelValue label="Copies" value={req.numberOfCopies} />
              <LabelValue label="Language" value={req.languageRequired} />
              <LabelValue
                label="SLA Deadline"
                value={req.slaDeadlineAt ? new Date(req.slaDeadlineAt).toLocaleDateString() : '—'}
              />
            </Box>
            {req.notes && (
              <>
                <Divider sx={{ my: 2 }} />
                <LabelValue label="Notes" value={req.notes} />
              </>
            )}
            {req.generatedDocumentUrl && (
              <>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Generated Document
                  </Typography>
                  <Button
                    variant="text"
                    size="small"
                    href={req.generatedDocumentUrl}
                    target="_blank"
                  >
                    Download Document
                  </Button>
                </Stack>
              </>
            )}
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>
              Approval History
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Level</TableCell>
                  <TableCell>Approver</TableCell>
                  <TableCell>Decision</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.approvals || []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.level}</TableCell>
                    <TableCell>{a.approverEmail}</TableCell>
                    <TableCell>
                      <Chip
                        label={a.decision}
                        size="small"
                        color={
                          a.decision === 'approved'
                            ? 'success'
                            : a.decision === 'rejected'
                              ? 'error'
                              : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {a.decidedAt ? new Date(a.decidedAt).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {!data.approvals?.length && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No approvals yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
