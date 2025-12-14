'use client';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import { LineChart } from '@mui/x-charts/LineChart';
import BusinessIcon from '@mui/icons-material/Business';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';

import { fCurrency } from 'src/utils/format-number';
import {
  getExpenses,
  fetchInvoices,
  getCostCenters,
  fetchAccountsPayable,
  fetchAccountsReceivable,
} from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';

import { BookingWidgetSummary } from 'src/sections/overview/booking/booking-widget-summary';

// ----------------------------------------------------------------------

const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });
const dateFormatter = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' });

const DEFAULT_COST_CENTERS = [
  { id: 'india', name: 'India' },
  { id: 'saudi-arabia', name: 'Saudi Arabia' },
  { id: 'uae', name: 'UAE' },
  { id: 'uk', name: 'UK' },
];

const asNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getInvoiceAmount = (invoice) =>
  asNumber(invoice?.total ?? invoice?.totalAmount ?? invoice?.baseAmount ?? invoice?.amount);

const getExpenseAmount = (expense) =>
  asNumber(expense?.expenseAmount ?? expense?.originalExpenseAmount ?? expense?.amount);

const buildMonthBuckets = (count = 6) => {
  const now = new Date();
  return Array.from({ length: count }).map((_, idx) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - (count - 1 - idx), 1);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    return { key, label: `${monthFormatter.format(dt)} ${dt.getFullYear()}` };
  });
};

const buildTimeSeries = (items, dateKey, amountGetter, buckets) => {
  const series = buckets.map(() => 0);
  items.forEach((item) => {
    const raw = item?.[dateKey];
    if (!raw) return;
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const idx = buckets.findIndex((b) => b.key === key);
    if (idx === -1) return;
    series[idx] += amountGetter(item);
  });
  return series;
};

const buildAging = (items, dueKey, balanceGetter) => {
  const buckets = {
    current: 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0,
  };

  const now = new Date();

  items.forEach((item) => {
    const dueValue = item?.[dueKey];
    if (!dueValue) return;
    const due = new Date(dueValue);
    if (Number.isNaN(due.getTime())) return;
    const diffDays = Math.round((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    const balance = balanceGetter(item);

    if (diffDays <= 30) buckets.current += balance;
    else if (diffDays <= 60) buckets['31-60'] += balance;
    else if (diffDays <= 90) buckets['61-90'] += balance;
    else buckets['90+'] += balance;
  });

  return buckets;
};

const percentDelta = (series) => {
  if (!series || series.length < 2) return 0;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  if (!prev) return 0;
  const delta = ((last - prev) / Math.abs(prev)) * 100;
  return Number.isFinite(delta) ? delta : 0;
};

const balanceForInvoice = (invoice) => {
  const total = asNumber(
    invoice?.balance ?? invoice?.balanceDue ?? invoice?.totalAmount ?? invoice?.total
  );
  const paid = asNumber(invoice?.amountPaid);
  if (total && paid) return total - paid < 0 ? 0 : total - paid;
  return total;
};

const balanceForBill = (bill) => {
  const total = asNumber(bill?.balanceDue ?? bill?.totalAmount ?? bill?.total);
  const paid = asNumber(bill?.amountPaid);
  if (total && paid) return total - paid < 0 ? 0 : total - paid;
  return total;
};

export function CompanyPerformanceView() {
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [ar, setAr] = useState([]);
  const [ap, setAp] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const [invoiceRes, expenseRes, arRes, apRes, costCenterRes] = await Promise.all([
          fetchInvoices(),
          getExpenses(),
          fetchAccountsReceivable(),
          fetchAccountsPayable(),
          getCostCenters(),
        ]);

        if (!active) return;

        const invoicesData = Array.isArray(invoiceRes?.invoices)
          ? invoiceRes.invoices
          : Array.isArray(invoiceRes)
            ? invoiceRes
            : invoiceRes?.data || [];

        const expensesData = Array.isArray(expenseRes?.expenses)
          ? expenseRes.expenses
          : Array.isArray(expenseRes)
            ? expenseRes
            : expenseRes?.data || [];

        const arData = Array.isArray(arRes?.invoices)
          ? arRes.invoices
          : Array.isArray(arRes)
            ? arRes
            : arRes?.data || [];

        const apData = Array.isArray(apRes?.bills)
          ? apRes.bills
          : Array.isArray(apRes)
            ? apRes
            : apRes?.data || [];

        setInvoices(invoicesData);
        setExpenses(expensesData);
        setAr(arData);
        setAp(apData);
        const ccList = costCenterRes && costCenterRes.length ? costCenterRes : DEFAULT_COST_CENTERS;
        setCostCenters(ccList);
        setError('');
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Failed to load company data');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const monthBuckets = useMemo(() => buildMonthBuckets(6), []);

  const revenueSeries = useMemo(
    () => buildTimeSeries(invoices, 'invoiceDate', getInvoiceAmount, monthBuckets),
    [invoices, monthBuckets]
  );
  const expenseSeries = useMemo(
    () => buildTimeSeries(expenses, 'expenseDate', getExpenseAmount, monthBuckets),
    [expenses, monthBuckets]
  );

  const totalRevenue = useMemo(
    () => invoices.reduce((sum, inv) => sum + getInvoiceAmount(inv), 0),
    [invoices]
  );
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, exp) => sum + getExpenseAmount(exp), 0),
    [expenses]
  );
  const arOutstanding = useMemo(
    () => ar.reduce((sum, inv) => sum + balanceForInvoice(inv), 0),
    [ar]
  );
  const apOutstanding = useMemo(
    () => ap.reduce((sum, bill) => sum + balanceForBill(bill), 0),
    [ap]
  );

  const arAging = useMemo(() => buildAging(ar, 'dueDate', balanceForInvoice), [ar]);
  const apAging = useMemo(() => buildAging(ap, 'dueDate', balanceForBill), [ap]);

  const costCenterRows = useMemo(() => {
    const nameById = costCenters.reduce((acc, center) => {
      if (center?.id) {
        acc[String(center.id)] = center.name || `Cost Center ${center.id}`;
      }
      return acc;
    }, {});

    const revenueByCc = invoices.reduce((acc, inv) => {
      const id = inv?.costcenterId ?? 'unassigned';
      const key = String(id);
      acc[key] = (acc[key] || 0) + getInvoiceAmount(inv);
      return acc;
    }, {});

    const expenseByCc = expenses.reduce((acc, exp) => {
      const id = exp?.costcenterId ?? 'unassigned';
      const key = String(id);
      acc[key] = (acc[key] || 0) + getExpenseAmount(exp);
      return acc;
    }, {});

    const keys = Array.from(new Set([...Object.keys(revenueByCc), ...Object.keys(expenseByCc)]));

    return keys
      .map((key) => {
        const revenue = revenueByCc[key] || 0;
        const expense = expenseByCc[key] || 0;
        return {
          id: key,
          name: nameById[key] || (key === 'unassigned' ? 'Unassigned' : `Cost Center ${key}`),
          revenue,
          expense,
          net: revenue - expense,
        };
      })
      .sort((a, b) => b.net - a.net);
  }, [costCenters, expenses, invoices]);

  const chartCategories = useMemo(() => monthBuckets.map((m) => m.label), [monthBuckets]);

  const chartSeries = useMemo(
    () => [
      {
        id: 'revenue',
        label: 'Revenue',
        color: '#2E8BFD',
        data: revenueSeries,
        area: true,
        valueFormatter: (val) => fCurrency(val, { currencyCode: 'SAR' }),
      },
      {
        id: 'expenses',
        label: 'Expenses',
        color: '#FF6B6B',
        data: expenseSeries,
        area: true,
        valueFormatter: (val) => fCurrency(val, { currencyCode: 'SAR' }),
      },
    ],
    [expenseSeries, revenueSeries]
  );

  const kpiValues = {
    revenue: totalRevenue,
    expense: totalExpenses,
    net: totalRevenue - totalExpenses,
    ar: arOutstanding,
    ap: apOutstanding,
  };

  const summaryCards = [
    {
      key: 'revenue',
      title: 'Revenue',
      total: kpiValues.revenue,
      percent: percentDelta(revenueSeries),
      icon: <BusinessIcon color="primary" sx={{ width: 64, height: 64 }} />,
    },
    {
      key: 'expense',
      title: 'Expenses',
      total: kpiValues.expense,
      percent: percentDelta(expenseSeries),
      icon: <Iconify icon="solar:wallet-money-bold" width={64} height={64} color="#FF6B6B" />,
    },
    {
      key: 'net',
      title: 'Net',
      total: kpiValues.net,
      percent: kpiValues.revenue ? (kpiValues.net / kpiValues.revenue) * 100 : 0,
      icon: <Iconify icon="solar:chart-bold" width={64} height={64} color="#2E8BFD" />,
    },
    {
      key: 'ar',
      title: 'AR Outstanding',
      total: kpiValues.ar,
      percent: 0,
      icon: <Iconify icon="solar:bill-list-bold" width={64} height={64} color="#6C5CE7" />,
    },
    {
      key: 'ap',
      title: 'AP Outstanding',
      total: kpiValues.ap,
      percent: 0,
      icon: <Iconify icon="solar:wallet-2-bold" width={64} height={64} color="#F3A952" />,
    },
  ];

  const renderAgingCard = (title, data, total) => (
    <Card sx={{ height: '100%', p: { xs: 2.5, md: 3 } }}>
      <CardHeader
        title={title}
        subheader={dateFormatter.format(new Date())}
        sx={{ px: 0, pb: 1.5 }}
      />
      <Divider sx={{ mx: -3, width: 'auto' }} />
      <Stack spacing={2.5} sx={{ pt: 2.5 }}>
        {[
          { label: 'Current', key: 'current' },
          { label: '31-60', key: '31-60' },
          { label: '61-90', key: '61-90' },
          { label: '90+', key: '90+' },
        ].map((bucket) => {
          const value = data[bucket.key] || 0;
          const pct = total ? Math.min((value / total) * 100, 100) : 0;
          return (
            <Stack key={bucket.key} spacing={1.25}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {bucket.label}
                </Typography>
                <Typography variant="subtitle2">
                  {fCurrency(value, { currencyCode: 'SAR' })}
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={pct} />
            </Stack>
          );
        })}
      </Stack>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          <Box
            sx={{
              gap: 3,
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(1, minmax(0, 1fr))',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
                lg: 'repeat(5, minmax(0, 1fr))',
              },
            }}
          >
            {summaryCards.map((item) => (
              <BookingWidgetSummary
                key={item.key}
                title={item.title}
                total={item.total}
                percent={item.percent}
                icon={item.icon}
                sx={{ height: '100%' }}
              />
            ))}
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={7} lg={7}>
              <Box
                sx={{
                  mb: 3,
                  p: { md: 1 },
                  display: 'flex',
                  gap: { xs: 3, md: 1 },
                  borderRadius: { md: 2 },
                  flexDirection: 'column',
                  bgcolor: { md: 'background.neutral' },
                }}
              >
                <Card sx={{ boxShadow: { md: 'none' } }}>
                  <CardHeader title="Revenue vs Expenses" subheader="Last 6 months" />
                  <Box sx={{ px: 1.5, pb: 2 }}>
                    <LineChart
                      height={364}
                      series={chartSeries}
                      xAxis={[{ scaleType: 'band', data: chartCategories }]}
                      slotProps={{
                        legend: {
                          direction: 'row',
                          position: { vertical: 'top', horizontal: 'left' },
                        },
                      }}
                    />
                  </Box>
                </Card>

                <Card sx={{ boxShadow: { md: 'none' } }}>
                  <CardHeader
                    title="Cost Center Performance"
                    subheader="Revenue, expense, and net"
                  />
                  <Divider />
                  <Stack spacing={1.5} sx={{ p: 2 }}>
                    {costCenterRows.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No cost center data yet.
                      </Typography>
                    ) : (
                      costCenterRows.map((row) => (
                        <Stack key={row.id} direction="row" alignItems="center" spacing={2}>
                          <Box sx={{ minWidth: 160 }}>
                            <Typography variant="subtitle2">{row.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {row.id}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={3} sx={{ flex: 1 }}>
                            <Stack spacing={0.25} sx={{ minWidth: 120 }}>
                              <Typography variant="caption" color="text.secondary">
                                Revenue
                              </Typography>
                              <Typography variant="subtitle2">
                                {fCurrency(row.revenue, { currencyCode: 'SAR' })}
                              </Typography>
                            </Stack>
                            <Stack spacing={0.25} sx={{ minWidth: 120 }}>
                              <Typography variant="caption" color="text.secondary">
                                Expense
                              </Typography>
                              <Typography variant="subtitle2">
                                {fCurrency(row.expense, { currencyCode: 'SAR' })}
                              </Typography>
                            </Stack>
                            <Stack spacing={0.25} sx={{ minWidth: 120 }}>
                              <Typography variant="caption" color="text.secondary">
                                Net
                              </Typography>
                              <Typography
                                variant="subtitle2"
                                color={row.net >= 0 ? 'success.main' : 'error.main'}
                              >
                                {fCurrency(row.net, { currencyCode: 'SAR' })}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Stack>
                      ))
                    )}
                  </Stack>
                </Card>
              </Box>
            </Grid>
            <Grid item xs={12} md={5} lg={5}>
              <Box
                sx={{
                  gap: { xs: 3.5, md: 3 },
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: 'stretch',
                  flexWrap: 'wrap',
                  height: '100%',
                }}
              >
                <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 320 } }}>
                  {renderAgingCard('AR Aging', arAging, arOutstanding)}
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 320 } }}>
                  {renderAgingCard('AP Aging', apAging, apOutstanding)}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </>
      )}
    </Stack>
  );
}

export default CompanyPerformanceView;
