'use client';

import { useMemo } from 'react';
import PropTypes from 'prop-types';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { BDMCardList } from '../bdm-card-list';

export function BDMListView({ bdms }) {
  const totals = useMemo(() => {
    const dealsCount = bdms.reduce((sum, b) => sum + (b.dealsCount || 0), 0);
    const activeDeals = bdms.reduce((sum, b) => sum + (b.activeDeals || 0), 0);
    const pendingCommission = bdms.reduce((sum, b) => sum + (b.pendingCommission || 0), 0);
    const paidCommission = bdms.reduce((sum, b) => sum + (b.paidCommission || 0), 0);
    return { dealsCount, activeDeals, pendingCommission, paidCommission };
  }, [bdms]);

  const summary = [
    {
      title: 'Total BDMs',
      value: bdms.length,
      color: 'primary',
      icon: 'solar:users-group-rounded-bold',
    },
    {
      title: 'Active Deals',
      value: totals.activeDeals,
      color: 'info',
      icon: 'solar:case-minimalistic-bold-duotone',
    },
    {
      title: 'Pending Commission',
      value: fCurrency(totals.pendingCommission, { currency: 'SAR' }),
      color: 'warning',
      icon: 'solar:clock-circle-bold-duotone',
    },
    {
      title: 'Paid Commission',
      value: fCurrency(totals.paidCommission, { currency: 'SAR' }),
      color: 'success',
      icon: 'solar:check-circle-bold-duotone',
    },
  ];

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="BDM Management"
        links={[
          { name: 'Dashboard', href: '/' },
          { name: 'BDMs' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {summary.map((item) => (
          <Grid key={item.title} xs={12} sm={6} md={3}>
            <Card sx={{ p: 3, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Iconify icon={item.icon} width={36} />
              <Stack spacing={0.5}>
                <Typography variant="h5">{item.value}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.title}
                </Typography>
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>

      <BDMCardList bdms={bdms} />
    </DashboardContent>
  );
}

BDMListView.propTypes = {
  bdms: PropTypes.array,
};
