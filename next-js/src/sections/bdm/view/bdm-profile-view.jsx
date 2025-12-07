'use client';

import PropTypes from 'prop-types';
import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import {
  Avatar,
  Button,
  Card,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { updateDeal } from 'src/actions/deals';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export function BDMProfileView({ bdm, deals }) {
  const [localDeals, setLocalDeals] = useState(deals || []);
  const router = useRouter();

  const stats = useMemo(() => {
    const totalDeals = localDeals.length;
    const activeDeals = localDeals.filter((d) => d.status === 'active').length;
    const completedDeals = localDeals.filter((d) => d.status === 'completed').length;
    const paidDeals = localDeals.filter((d) => d.bdmCommissionPaid).length;
    const pendingDeals = totalDeals - paidDeals;

    const totalCommission = localDeals.reduce((sum, d) => sum + (d.bdmCommissionAmount || 0), 0);
    const paidCommission = localDeals
      .filter((d) => d.bdmCommissionPaid)
      .reduce((sum, d) => sum + (d.bdmCommissionAmount || 0), 0);
    const pendingCommission = totalCommission - paidCommission;

    return {
      totalDeals,
      activeDeals,
      completedDeals,
      paidDeals,
      pendingDeals,
      totalCommission,
      paidCommission,
      pendingCommission,
    };
  }, [localDeals]);

  const handleMarkPaid = useCallback(async (dealId) => {
    try {
      await updateDeal(dealId, { bdmCommissionPaid: true });
      setLocalDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, bdmCommissionPaid: true } : d)));
      toast.success('Marked as paid');
      router.push('/dashboard/bdm');
    } catch (error) {
      console.error('Failed to mark paid', error);
      toast.error('Failed to mark as paid');
    }
  }, [router]);

  const summaryCards = [
    { label: 'Total Deals', value: stats.totalDeals, color: 'info' },
    { label: 'Active Deals', value: stats.activeDeals, color: 'primary' },
    { label: 'Completed Deals', value: stats.completedDeals, color: 'success' },
    {
      label: 'Commission Pending',
      value: fCurrency(stats.pendingCommission, {
        currency: 'SAR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      color: 'warning',
    },
  ];

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="BDM Profile"
        links={[
          { name: 'Dashboard', href: '/' },
          { name: 'BDMs', href: '/dashboard/bdm' },
          { name: bdm?.name || 'BDM' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Avatar sx={{ width: 64, height: 64, fontSize: 28 }}>{bdm?.name?.[0] || '?'}</Avatar>
        <Stack spacing={0.5}>
          <Typography variant="h5">{bdm?.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {bdm?.email}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip size="small" label={`${stats.activeDeals} active`} color="info" variant="soft" />
            <Chip size="small" label={`${stats.totalDeals} deals`} variant="outlined" />
            <Chip size="small" label={`${stats.paidDeals} paid`} color="success" variant="soft" />
          </Stack>
        </Stack>
      </Card>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {summaryCards.map((card) => (
          <Grid key={card.label} xs={12} sm={6} md={3}>
            <Card sx={{ p: 2.5 }}>
              <Typography variant="body2" color="text.secondary">
                {card.label}
              </Typography>
              <Typography variant="h5" color={`${card.color}.main`} sx={{ mt: 0.5 }}>
                {card.value}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <Scrollbar>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Deal #</TableCell>
                  <TableCell>Deal Name</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Commission</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Payment</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {localDeals.map((deal) => (
                  <TableRow key={deal.id} hover>
                    <TableCell>{deal.dealNumber}</TableCell>
                    <TableCell>{deal.dealName}</TableCell>
                    <TableCell>{fDate(deal.dealDate)}</TableCell>
                    <TableCell align="right" style={{ whiteSpace: 'nowrap' }}>
                      {fCurrency(deal.bdmCommissionAmount || 0, {
                        currency: 'SAR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell align="center">
                      <Label color={deal.status === 'completed' ? 'success' : deal.status === 'active' ? 'info' : 'default'}>
                        {deal.status}
                      </Label>
                    </TableCell>
                    <TableCell align="center">
                      <Label color={deal.bdmCommissionPaid ? 'success' : 'warning'}>
                        {deal.bdmCommissionPaid ? 'Paid' : 'Pending'}
                      </Label>
                    </TableCell>
                    <TableCell align="center">
                      {!deal.bdmCommissionPaid ? (
                        <Button size="small" variant="outlined" onClick={() => handleMarkPaid(deal.id)}>
                          Mark Paid
                        </Button>
                      ) : (
                        <Chip size="small" label="Settled" color="success" variant="soft" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>
      </Card>
    </DashboardContent>
  );
}

BDMProfileView.propTypes = {
  bdm: PropTypes.object,
  deals: PropTypes.array,
};
