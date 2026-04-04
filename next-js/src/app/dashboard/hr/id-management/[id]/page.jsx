'use client';

import { useState, useEffect } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
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

import { paths } from 'src/routes/paths';

import { getEmployeeIdRecord } from 'src/utils/apiHelper';

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

export default function IdManagementDetailPage({ params }) {
  const { id } = params;
  const [employee, setEmployee] = useState(null);
  const [sceMemberships, setSceMemberships] = useState([]);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    getEmployeeIdRecord(id)
      .then((data) => {
        setEmployee(data.employee);
        setSceMemberships(data.sceMemberships ?? []);
      })
      .catch((e) => console.error('Failed to load employee ID record:', e));
  }, [id]);

  if (!employee) return null;

  const fullName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim();

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={fullName}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'ID Management', href: paths.dashboard.hr.idManagement.root },
          { name: fullName },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Identity Documents" />
        <Tab label="SCE Memberships" />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Iqama / Visa" />
              <CardContent>
                <Stack spacing={2}>
                  <LabelValue label="Iqama Number" value={employee.iqamaNumber} />
                  <LabelValue label="Iqama Status" value={employee.iqamaStatus} />
                  <LabelValue label="Iqama Expiry Date" value={employee.iqamaExpiryDate} />
                  <LabelValue label="Visa Issue Date" value={employee.visaIssueDate} />
                  <LabelValue label="Visa Expiry Date" value={employee.visaExpiryDate} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Passport" />
              <CardContent>
                <Stack spacing={2}>
                  <LabelValue label="Passport Number" value={employee.passportNumber} />
                  <LabelValue label="Passport Expiry Date" value={employee.passportExpiryDate} />
                  <LabelValue label="Nationality" value={employee.nationality} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {employee.country === 'UAE' && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Emirates ID" />
                <CardContent>
                  <Stack spacing={2}>
                    <LabelValue label="Emirates ID" value={employee.emiratesId} />
                    <LabelValue label="Expiry Date" value={employee.emiratesIdExpiryDate} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {tab === 1 && (
        <Card>
          <CardHeader title="SCE Memberships" />
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Membership #</TableCell>
                <TableCell>Profession Category</TableCell>
                <TableCell>Expiry Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sceMemberships.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No SCE memberships found.
                  </TableCell>
                </TableRow>
              ) : (
                sceMemberships.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.membershipNumber}</TableCell>
                    <TableCell>{m.professionCategory ?? '—'}</TableCell>
                    <TableCell>{m.expiryDate ?? '—'}</TableCell>
                    <TableCell>
                      <Chip label={m.renewalStatus} size="small" variant="soft" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </DashboardContent>
  );
}
