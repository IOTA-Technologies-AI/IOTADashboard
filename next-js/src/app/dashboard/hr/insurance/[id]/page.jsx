'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getInsuranceRecord } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

const LabelValue = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2">{value || '—'}</Typography>
  </Box>
);

export default function InsuranceDetailPage({ params }) {
  const { id } = params;
  const [record, setRecord] = useState(null);
  const [dependents, setDependents] = useState([]);

  useEffect(() => {
    getInsuranceRecord(id)
      .then((data) => {
        setRecord(data.record);
        setDependents(data.dependents ?? []);
      })
      .catch((e) => console.error('Failed to load insurance record:', e));
  }, [id]);

  if (!record) return null;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={`Policy: ${record.policyNumber}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Insurance', href: paths.dashboard.hr.insurance.root },
          { name: record.policyNumber },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.hr.insurance.edit(id)}
            variant="contained"
            startIcon={<Iconify icon="solar:pen-bold" />}
          >
            Edit
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Policy Details" />
            <CardContent>
              <Stack spacing={2}>
                <LabelValue label="Policy Number" value={record.policyNumber} />
                <LabelValue label="Provider" value={record.providerName} />
                <LabelValue label="Policy Class" value={record.policyClass} />
                <LabelValue label="Start Date" value={record.startDate} />
                <LabelValue label="Expiry Date" value={record.expiryDate} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Box>
                    <Chip label={record.status} size="small" variant="soft" />
                  </Box>
                </Box>
                <LabelValue label="Notes" value={record.notes} />
                {record.networkCoverageDetails && (
                  <LabelValue
                    label="Network Coverage Details"
                    value={record.networkCoverageDetails}
                  />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title={`Dependents (${dependents.length})`} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Relationship</TableCell>
                  <TableCell>DOB</TableCell>
                  <TableCell>Eligible</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dependents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No dependents added.
                    </TableCell>
                  </TableRow>
                ) : (
                  dependents.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.name}</TableCell>
                      <TableCell>{d.relationship}</TableCell>
                      <TableCell>{d.dateOfBirth ?? '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={d.isEligible ? 'Yes' : 'No'}
                          color={d.isEligible ? 'success' : 'default'}
                          size="small"
                          variant="soft"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
