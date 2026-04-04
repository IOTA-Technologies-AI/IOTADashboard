'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';

import { getRequestWithApprovals } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

const LabelValue = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2">{value ?? '—'}</Typography>
  </Box>
);

export default function ReimbursementDetailPage({ params }) {
  const { id } = params;
  const [request, setRequest] = useState(null);

  useEffect(() => {
    getRequestWithApprovals('reimbursementRequests', id)
      .then((data) => setRequest(data.request))
      .catch((e) => console.error('Failed to load reimbursement:', e));
  }, [id]);

  if (!request) return null;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={`Reimbursement #${request.id}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          {
            name: 'Reimbursements',
            href: paths.dashboard.hr.employeeRequests.reimbursement.root,
          },
          { name: `#${request.id}` },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <CardHeader title="Reimbursement Details" />
        <CardContent>
          <Stack spacing={2}>
            <LabelValue label="Employee ID" value={request.employeeId} />
            <LabelValue label="Category" value={request.category} />
            <LabelValue
              label="Amount"
              value={request.amount ? `${request.amount} ${request.currency ?? ''}` : null}
            />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>
              <Box>
                <Chip label={request.status} size="small" variant="soft" />
              </Box>
            </Box>
            <LabelValue label="Notes" value={request.notes} />
            <LabelValue label="Created At" value={request.createdAt?.split('T')[0]} />
          </Stack>
        </CardContent>
      </Card>
    </DashboardContent>
  );
}
