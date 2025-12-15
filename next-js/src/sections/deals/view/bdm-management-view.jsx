'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
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
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

export function BDMManagementView({ deals, bdms }) {
  // Calculate BDM commission summaries
  const bdmSummaries = useMemo(
    () =>
      bdms.map((bdm) => {
        const bdmDeals = deals.filter((deal) => deal.bdmId === bdm.id);
        const totalCommission = bdmDeals.reduce(
          (sum, deal) => sum + (deal.bdmCommissionAmount || 0),
          0
        );
        const paidCommission = bdmDeals
          .filter((deal) => deal.bdmCommissionPaid)
          .reduce((sum, deal) => sum + (deal.bdmCommissionAmount || 0), 0);
        const pendingCommission = totalCommission - paidCommission;
        const dealsCount = bdmDeals.length;
        const activeDeals = bdmDeals.filter((deal) => deal.status === 'active').length;

        return {
          ...bdm,
          totalCommission,
              const bdmDeals = deals.filter((deal) => String(deal.bdmId) === String(bdm.id));

              const totalCommission = bdmDeals.reduce((sum, deal) => sum + (deal.bdmCommissionAmount || 0), 0);

              const paidCommission = bdmDeals.reduce((sum, deal) => {
                const total = deal.bdmCommissionAmount || 0;
                if (typeof deal.bdmCommissionPaidAmount === 'number' && !Number.isNaN(deal.bdmCommissionPaidAmount)) {
                  return sum + Math.min(Math.max(deal.bdmCommissionPaidAmount, 0), total);
                }
                if (deal.bdmCommissionPaid) {
                  return sum + total;
                }
                return sum;
              }, 0);

              const pendingCommission = Math.max(totalCommission - paidCommission, 0);

  // Calculate totals
  const totalCommissions = bdmSummaries.reduce((sum, bdm) => sum + bdm.totalCommission, 0);
  const totalPaid = bdmSummaries.reduce((sum, bdm) => sum + bdm.paidCommission, 0);
  const totalPending = bdmSummaries.reduce((sum, bdm) => sum + bdm.pendingCommission, 0);
  const totalDeals = bdmSummaries.reduce((sum, bdm) => sum + bdm.dealsCount, 0);

  const renderSummary = (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {[{
        title: 'Total Commissions',
        value: fCurrency(totalCommissions, { currency: 'SAR' }),
        icon: 'solar:hand-money-bold-duotone',
        color: 'primary',
      },
      {
        title: 'Paid Commissions',
        value: fCurrency(totalPaid, { currency: 'SAR' }),
        icon: 'solar:check-circle-bold-duotone',
        color: 'success',
      },
      {
        title: 'Pending Commissions',
        value: fCurrency(totalPending, { currency: 'SAR' }),
        icon: 'solar:clock-circle-bold-duotone',
        color: 'warning',
      },
      {
        title: 'Total Deals',
        value: totalDeals,
        icon: 'solar:document-text-bold-duotone',
        color: 'info',
      }].map((item) => (
        <Grid key={item.title} xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: 3,
              height: '100%',
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette[item.color].light}22 0%, ${theme.palette.background.paper} 100%)`,
            }}
          >
            <Stack spacing={1.5} alignItems="flex-start">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 1.5,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: (theme) => theme.palette[item.color].lighter,
                  color: (theme) => theme.palette[item.color].main,
                }}
              >
                <Iconify icon={item.icon} width={24} />
              </Box>
              <Typography variant="h4">{item.value}</Typography>
              <Typography variant="body2" color="text.secondary">
                {item.title}
              </Typography>
            </Stack>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderBdmCards = (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {bdmSummaries.map((bdm) => (
        <Grid key={bdm.id} xs={12} sm={6} md={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar alt={bdm.name} sx={{ width: 44, height: 44 }}>
                  {bdm.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1">{bdm.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {bdm.email}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={2} alignItems="center">
                <Chip size="small" label={`${bdm.activeDeals} active`} color="info" variant="soft" />
                <Chip size="small" label={`${bdm.dealsCount} total deals`} variant="outlined" />
              </Stack>

              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Commission Paid
                  </Typography>
                  <Typography variant="subtitle2" color="success.main">
                    {fCurrency(bdm.paidCommission, { currency: 'SAR' })}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.round(bdm.paidRatio * 100)}
                  sx={{ height: 8, borderRadius: 999 }}
                />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    Pending
                  </Typography>
                  <Typography variant="caption" color="warning.main">
                    {fCurrency(bdm.pendingCommission, { currency: 'SAR' })}
                  </Typography>
                </Stack>
              </Stack>

              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Commission
                  </Typography>
                  <Typography variant="subtitle1" color="primary.main">
                    {fCurrency(bdm.totalCommission, { currency: 'SAR' })}
                  </Typography>
                </Box>
                <Label color={bdm.pendingCommission > 0 ? 'warning' : 'success'}>
                  {bdm.pendingCommission > 0 ? 'Pending' : 'All Paid'}
                </Label>
              </Stack>
            </Stack>
          </Card>
        </Grid>
      ))}
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
                      {fCurrency(bdm.totalCommission, { currency: 'SAR' })}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="success.main">
                      {fCurrency(bdm.paidCommission, { currency: 'SAR' })}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="warning.main">
                      {fCurrency(bdm.pendingCommission, { currency: 'SAR' })}
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
                            {fCurrency(deal.bdmCommissionAmount || 0, { currency: 'SAR' })}
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
    <DashboardContent>
      <CustomBreadcrumbs
        heading="BDM Management"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Deals', href: paths.dashboard.deals.root },
          { name: 'BDM Management' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {renderSummary}
      {renderBdmCards}
      {renderBDMTable}
      {renderDetailedCommissions}
    </DashboardContent>
  );
}
