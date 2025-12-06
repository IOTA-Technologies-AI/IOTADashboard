'use client';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

export function BDMManagementView({ deals, bdms }) {
  // Calculate BDM commission summaries
  const bdmSummaries = bdms.map((bdm) => {
    const bdmDeals = deals.filter((deal) => deal.bdmId === bdm.id);
    const totalCommission = bdmDeals.reduce((sum, deal) => sum + (deal.bdmCommissionAmount || 0), 0);
    const paidCommission = bdmDeals
      .filter((deal) => deal.bdmCommissionPaid)
      .reduce((sum, deal) => sum + (deal.bdmCommissionAmount || 0), 0);
    const pendingCommission = totalCommission - paidCommission;
    const dealsCount = bdmDeals.length;
    const activeDeals = bdmDeals.filter((deal) => deal.status === 'active').length;

    return {
      ...bdm,
      totalCommission,
      paidCommission,
      pendingCommission,
      dealsCount,
      activeDeals,
      deals: bdmDeals,
    };
  });

  // Calculate totals
  const totalCommissions = bdmSummaries.reduce((sum, bdm) => sum + bdm.totalCommission, 0);
  const totalPaid = bdmSummaries.reduce((sum, bdm) => sum + bdm.paidCommission, 0);
  const totalPending = bdmSummaries.reduce((sum, bdm) => sum + bdm.pendingCommission, 0);
  const totalDeals = bdmSummaries.reduce((sum, bdm) => sum + bdm.dealsCount, 0);

  const renderSummary = (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid xs={12} sm={6} md={3}>
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Box sx={{ mb: 1 }}>
            <Iconify
              icon="solar:hand-money-bold-duotone"
              width={48}
              sx={{ color: 'primary.main' }}
            />
          </Box>
          <Typography variant="h4">{fCurrency(totalCommissions)}</Typography>
          <Typography variant="body2" color="text.secondary">
            Total Commissions
          </Typography>
        </Card>
      </Grid>

      <Grid xs={12} sm={6} md={3}>
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Box sx={{ mb: 1 }}>
            <Iconify
              icon="solar:check-circle-bold-duotone"
              width={48}
              sx={{ color: 'success.main' }}
            />
          </Box>
          <Typography variant="h4" color="success.main">
            {fCurrency(totalPaid)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Paid Commissions
          </Typography>
        </Card>
      </Grid>

      <Grid xs={12} sm={6} md={3}>
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Box sx={{ mb: 1 }}>
            <Iconify
              icon="solar:clock-circle-bold-duotone"
              width={48}
              sx={{ color: 'warning.main' }}
            />
          </Box>
          <Typography variant="h4" color="warning.main">
            {fCurrency(totalPending)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pending Commissions
          </Typography>
        </Card>
      </Grid>

      <Grid xs={12} sm={6} md={3}>
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Box sx={{ mb: 1 }}>
            <Iconify
              icon="solar:document-text-bold-duotone"
              width={48}
              sx={{ color: 'info.main' }}
            />
          </Box>
          <Typography variant="h4">{totalDeals}</Typography>
          <Typography variant="body2" color="text.secondary">
            Total Deals
          </Typography>
        </Card>
      </Grid>
    </Grid>
  );

  const renderBDMTable = (
    <Card>
      <Scrollbar>
        <TableContainer component={Paper} sx={{ minWidth: 800 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>BDM</TableCell>
                <TableCell align="center">Active Deals</TableCell>
                <TableCell align="center">Total Deals</TableCell>
                <TableCell align="right">Total Commission</TableCell>
                <TableCell align="right">Paid</TableCell>
                <TableCell align="right">Pending</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bdmSummaries.map((bdm) => (
                <TableRow key={bdm.id} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar alt={bdm.name} sx={{ width: 40, height: 40 }}>
                        {bdm.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">{bdm.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {bdm.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="subtitle2">{bdm.activeDeals}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="subtitle2">{bdm.dealsCount}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" color="primary.main">
                      {fCurrency(bdm.totalCommission)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="success.main">
                      {fCurrency(bdm.paidCommission)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="warning.main">
                      {fCurrency(bdm.pendingCommission)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Label color={bdm.pendingCommission > 0 ? 'warning' : 'success'}>
                      {bdm.pendingCommission > 0 ? 'Pending Payments' : 'All Paid'}
                    </Label>
                  </TableCell>
                </TableRow>
              ))}
              {bdmSummaries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No BDMs found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Scrollbar>
    </Card>
  );

  const renderDetailedCommissions = (
    <Card sx={{ mt: 3 }}>
      <Stack spacing={3} sx={{ p: 3 }}>
        <Typography variant="h6">Detailed Commission Breakdown</Typography>

        {bdmSummaries.map((bdm) =>
          bdm.deals.length > 0 ? (
            <Box key={bdm.id}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                {bdm.name}
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Deal #</TableCell>
                      <TableCell>Deal Name</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Commission</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Payment</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bdm.deals.map((deal) => (
                      <TableRow key={deal.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {deal.dealNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>{deal.dealName}</TableCell>
                        <TableCell>{fDate(deal.dealDate)}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="warning.main">
                            {fCurrency(deal.bdmCommissionAmount || 0)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Label
                            color={
                              deal.status === 'completed'
                                ? 'success'
                                : deal.status === 'active'
                                ? 'info'
                                : 'default'
                            }
                          >
                            {deal.status}
                          </Label>
                        </TableCell>
                        <TableCell align="center">
                          <Label color={deal.bdmCommissionPaid ? 'success' : 'warning'}>
                            {deal.bdmCommissionPaid ? 'Paid' : 'Pending'}
                          </Label>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : null
        )}
      </Stack>
    </Card>
  );

  return (
    <>
      <CustomBreadcrumbs
        heading="BDM Management"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Deals', href: paths.dashboard.deals.root },
          { name: 'BDM Management' },
        ]}
        sx={{ mb: 3 }}
      />

      {renderSummary}
      {renderBDMTable}
      {renderDetailedCommissions}
    </>
  );
}
