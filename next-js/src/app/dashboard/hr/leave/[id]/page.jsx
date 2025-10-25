'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { fDate } from 'src/utils/format-time';
import { getEmployees, getLeaveRequestById } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export default function LeaveDetailsPage() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [employeeName, setEmployeeName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [req, emps] = await Promise.all([getLeaveRequestById(id), getEmployees()]);
        if (!mounted) return;
        setRequest(req);
        const emp = emps?.find((e) => e.id === req?.employeeId);
        setEmployeeName(emp ? `${emp.firstName} ${emp.lastName}` : req?.employeeId);
      } catch (e) {
        console.error('Failed to load details:', e);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const renderInfo = () => (
    <Card>
      <CardHeader
        title="Leave Request Information"
        action={
          <IconButton>
            <Iconify icon="solar:pen-bold" />
          </IconButton>
        }
      />

      <Stack spacing={1.5} sx={{ p: 3, typography: 'body2' }}>
        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Request Number
          </Box>
          <Box component="span" sx={{ fontWeight: 'fontWeightMedium' }}>
            {request?.requestNumber}
          </Box>
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Employee
          </Box>
          {employeeName || 'N/A'}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Leave Type
          </Box>
          {request?.leaveType}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Status
          </Box>
          <Label
            variant="soft"
            color={
              (request?.status === 'Approved' && 'success') ||
              (request?.status === 'Pending' && 'warning') ||
              (request?.status === 'Rejected' && 'error') ||
              'default'
            }
          >
            {request?.status}
          </Label>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Created At
          </Box>
          {request?.createdAt ? fDate(request.createdAt) : 'N/A'}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Updated At
          </Box>
          {request?.updatedAt ? fDate(request.updatedAt) : 'N/A'}
        </Box>
      </Stack>
    </Card>
  );

  const renderDates = () => (
    <Card>
      <CardHeader title="Leave Period" />

      <Stack spacing={1.5} sx={{ p: 3, typography: 'body2' }}>
        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            From Date
          </Box>
          {request?.fromDate ? fDate(request.fromDate) : 'N/A'}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            To Date
          </Box>
          {request?.toDate ? fDate(request.toDate) : 'N/A'}
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
            Days Count
          </Box>
          <Box component="span" sx={{ fontWeight: 'fontWeightMedium' }}>
            {request?.daysCount || 0} day(s)
          </Box>
        </Box>
      </Stack>
    </Card>
  );

  const renderReason = () => (
    <Card>
      <CardHeader title="Request Details" />

      <Stack spacing={1.5} sx={{ p: 3, typography: 'body2' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Reason
          </Typography>
          <Typography variant="body2">{request?.reason || 'No reason provided'}</Typography>
        </Box>
      </Stack>
    </Card>
  );

  const renderApproval = () => (
    <Card>
      <CardHeader title="Approval Information" />

      <Stack spacing={1.5} sx={{ p: 3, typography: 'body2' }}>
        {request?.approvedBy && (
          <>
            <Box sx={{ display: 'flex' }}>
              <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
                Approved By
              </Box>
              {request.approvedBy}
            </Box>

            <Box sx={{ display: 'flex' }}>
              <Box component="span" sx={{ color: 'text.secondary', width: 160, flexShrink: 0 }}>
                Approved Date
              </Box>
              {request.approvedDate ? fDate(request.approvedDate) : 'N/A'}
            </Box>
          </>
        )}

        {request?.rejectionReason && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
              Rejection Reason
            </Typography>
            <Typography variant="body2" sx={{ color: 'error.main' }}>
              {request.rejectionReason}
            </Typography>
          </Box>
        )}

        {!request?.approvedBy && !request?.rejectionReason && (
          <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
            No approval information yet
          </Typography>
        )}
      </Stack>
    </Card>
  );

  if (loading) {
    return (
      <DashboardContent>
        <Typography>Loading...</Typography>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={request?.requestNumber || 'Leave Request Details'}
        backHref={paths.dashboard.hr.leave.root}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Leave', href: paths.dashboard.hr.leave.root },
          { name: request?.requestNumber || 'Details' },
        ]}
        sx={{ mb: 3 }}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={3}>
            {renderInfo()}
            {renderDates()}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={3}>
            {renderReason()}
            {renderApproval()}
          </Stack>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
