'use client';

import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';

import { paths } from 'src/routes/paths';

import { getExpiringDocuments } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

function ExpiryTable({ title, rows, dateField }) {
  return (
    <Card>
      <CardHeader title={`${title} (${rows.length})`} />
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Employee ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Country</TableCell>
            <TableCell>Expiry Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center">
                None expiring soon.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.employeeId}</TableCell>
                <TableCell>{`${e.firstName ?? ''} ${e.lastName ?? ''}`.trim()}</TableCell>
                <TableCell>{e.country ?? '—'}</TableCell>
                <TableCell>{e[dateField] ?? '—'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

export default function ExpiringDocumentsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getExpiringDocuments(60)
      .then(setData)
      .catch((e) => console.error('Failed to load expiring documents:', e));
  }, []);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Expiring Documents (Next 60 Days)"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'ID Management', href: paths.dashboard.hr.idManagement.root },
          { name: 'Expiring Documents' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <ExpiryTable
            title="Expiring Iqamas"
            rows={data?.expiringIqamas ?? []}
            dateField="iqamaExpiryDate"
          />
        </Grid>
        <Grid item xs={12}>
          <ExpiryTable
            title="Expiring Visas"
            rows={data?.expiringVisas ?? []}
            dateField="visaExpiryDate"
          />
        </Grid>
        <Grid item xs={12}>
          <ExpiryTable
            title="Expiring Passports"
            rows={data?.expiringPassports ?? []}
            dateField="passportExpiryDate"
          />
        </Grid>
        <Grid item xs={12}>
          <ExpiryTable
            title="Expiring Emirates IDs"
            rows={data?.expiringEmiratesIds ?? []}
            dateField="emiratesIdExpiryDate"
          />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
