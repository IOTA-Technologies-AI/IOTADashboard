'use client';

import PropTypes from 'prop-types';
import { useMemo, useState, useCallback } from 'react';

import {
  Avatar,
  Button,
  Card,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
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
  const [paymentInputs, setPaymentInputs] = useState({});
  const [paymentDialog, setPaymentDialog] = useState({ open: false, dealId: null });

  const getPaidAmount = useCallback((deal) => {
    if (!deal) return 0;
    if (typeof deal.bdmCommissionPaidAmount === 'number' && !Number.isNaN(deal.bdmCommissionPaidAmount)) {
      return Math.max(deal.bdmCommissionPaidAmount, 0);
    }
    if (deal.bdmCommissionPaid) {
      return deal.bdmCommissionAmount || 0;
    }
    return 0;
  }, []);

  const handleRecordPayment = useCallback(
    async (dealId, rawAmount) => {
      const amount = Number(rawAmount);
      if (Number.isNaN(amount) || amount <= 0) {
        toast.error('Enter a positive amount');
        return;
      }

      const deal = localDeals.find((d) => d.id === dealId);
      if (!deal) {
        toast.error('Deal not found');
        return;
      }

      const total = deal.bdmCommissionAmount || 0;
      const currentPaid = getPaidAmount(deal);
      const remaining = Math.max(total - currentPaid, 0);

      if (remaining <= 0) {
        toast.error('Commission already fully paid');
        return;
      }

      if (amount > remaining) {
        toast.error('Amount exceeds remaining commission');
        return;
      }

      const newPaid = Math.round((currentPaid + amount) * 100) / 100;

      try {
        await updateDeal(dealId, {
          bdmCommissionPaidAmount: newPaid,
          bdmCommissionPaid: newPaid >= total,
        });

        setLocalDeals((prev) =>
          prev.map((d) =>
            d.id === dealId
              ? {
                  ...d,
                  bdmCommissionPaidAmount: newPaid,
                  bdmCommissionPaid: newPaid >= total,
                }
              : d
          )
        );

        setPaymentInputs((prev) => ({ ...prev, [dealId]: '' }));
        setPaymentDialog({ open: false, dealId: null });
        toast.success('Payment recorded');
      } catch (error) {
        console.error('Failed to record payment', error);
        toast.error('Failed to record payment');
      }
    },
    [getPaidAmount, localDeals]
  );

  const stats = useMemo(() => {
    const totalDeals = localDeals.length;
    const activeDeals = localDeals.filter((d) => d.status === 'active').length;
    const completedDeals = localDeals.filter((d) => d.status === 'completed').length;
    const paidDeals = localDeals.filter((d) => {
      const total = d.bdmCommissionAmount || 0;
      return total > 0 ? getPaidAmount(d) >= total : d.bdmCommissionPaid;
    }).length;
    const pendingDeals = totalDeals - paidDeals;

    const totalCommission = localDeals.reduce((sum, d) => sum + (d.bdmCommissionAmount || 0), 0);
    const paidCommission = localDeals.reduce((sum, d) => sum + getPaidAmount(d), 0);
    const pendingCommission = localDeals.reduce((sum, d) => {
      const total = d.bdmCommissionAmount || 0;
      const paid = getPaidAmount(d);
      return sum + Math.max(total - paid, 0);
    }, 0);

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
  }, [getPaidAmount, localDeals]);

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

  const selectedDeal = paymentDialog.dealId ? localDeals.find((d) => d.id === paymentDialog.dealId) : null;
  const selectedTotal = selectedDeal ? selectedDeal.bdmCommissionAmount || 0 : 0;
  const selectedPaid = selectedDeal ? getPaidAmount(selectedDeal) : 0;
  const selectedRemaining = Math.max(selectedTotal - selectedPaid, 0);
  const selectedInput = selectedDeal ? paymentInputs[selectedDeal.id] ?? '' : '';
  const selectedInvalid =
    !selectedDeal ||
    selectedInput === '' ||
    Number.isNaN(Number(selectedInput)) ||
    Number(selectedInput) <= 0 ||
    Number(selectedInput) > selectedRemaining;

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
                  <TableCell align="center">Payment Status</TableCell>
                  <TableCell align="center">Amount</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {localDeals.map((deal) => {
                  const total = deal.bdmCommissionAmount || 0;
                  const paid = getPaidAmount(deal);
                  const remaining = Math.max(total - paid, 0);
                  const paymentStatus = paid >= total && total > 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Pending';
                  const paymentColor = paymentStatus === 'Paid' ? 'success' : paymentStatus === 'Partially Paid' ? 'warning' : 'default';

                  return (
                    <TableRow key={deal.id} hover>
                      <TableCell>{deal.dealNumber}</TableCell>
                      <TableCell>{deal.dealName}</TableCell>
                      <TableCell>{fDate(deal.dealDate)}</TableCell>
                      <TableCell align="right" style={{ whiteSpace: 'nowrap' }}>
                        {fCurrency(total, {
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
                        <Label color={paymentColor}>{paymentStatus}</Label>
                      </TableCell>
                      <TableCell align="center" style={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" color="text.secondary">
                          {fCurrency(paid, {
                            currency: 'SAR',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          {` / ${fCurrency(total, {
                            currency: 'SAR',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {remaining <= 0 ? (
                          <Chip size="small" label="Settled" color="success" variant="soft" />
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setPaymentDialog({ open: true, dealId: deal.id })}
                          >
                            Record Payment
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>
      </Card>

      <Dialog
        open={paymentDialog.open}
        onClose={() => setPaymentDialog({ open: false, dealId: null })}
        fullWidth
        maxWidth="xs"
      >
        {selectedDeal ? (
          <>
            <DialogTitle>Record Partial Payment</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Deal: {selectedDeal.dealName} ({selectedDeal.dealNumber})
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Total Commission
                    </Typography>
                    <Typography variant="subtitle2">
                      {fCurrency(selectedTotal, {
                        currency: 'SAR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Stack>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Paid to Date
                    </Typography>
                    <Typography variant="subtitle2">
                      {fCurrency(selectedPaid, {
                        currency: 'SAR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Stack>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Remaining
                    </Typography>
                    <Typography variant="subtitle2" color="warning.main">
                      {fCurrency(selectedRemaining, {
                        currency: 'SAR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Stack>
                </Stack>

                <TextField
                  autoFocus
                  size="small"
                  type="number"
                  label="Pay amount (SAR)"
                  value={selectedInput}
                  onChange={(e) =>
                    setPaymentInputs((prev) => ({
                      ...prev,
                      [selectedDeal.id]: e.target.value,
                    }))
                  }
                  inputProps={{ min: 0, step: '0.01', max: selectedRemaining }}
                  fullWidth
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setPaymentDialog({ open: false, dealId: null })}>Cancel</Button>
              <Button
                variant="contained"
                disabled={selectedInvalid}
                onClick={() => handleRecordPayment(selectedDeal.id, Number(selectedInput))}
              >
                Save Payment
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>
    </DashboardContent>
  );
}

BDMProfileView.propTypes = {
  bdm: PropTypes.object,
  deals: PropTypes.array,
};

