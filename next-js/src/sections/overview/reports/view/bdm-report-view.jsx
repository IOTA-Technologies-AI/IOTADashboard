'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import CardHeader from '@mui/material/CardHeader';
import FormControl from '@mui/material/FormControl';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { fetchBdmReport } from 'src/actions/reports';
import { getBDMs } from 'src/actions/bdm';
import { DashboardContent } from 'src/layouts/dashboard';

import { useAuthContext } from 'src/auth/hooks';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const DEFAULT_CURRENCY = 'SAR';
const CURRENT_YEAR = new Date().getFullYear();

// Helper: format currency using per-deal or per-BDM currency code
function fc(value, currency) {
  return fCurrency(value, { currencyCode: currency || DEFAULT_CURRENCY });
}
const YEAR_OPTIONS = [
  { value: 0, label: 'All Time' },
  ...Array.from({ length: 5 }, (_, i) => ({
    value: CURRENT_YEAR - i,
    label: String(CURRENT_YEAR - i),
  })),
];

// ----------------------------------------------------------------------

function KpiCard({ title, value, color = 'primary', icon }) {
  return (
    <Card sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${color}.lighter`,
            color: `${color}.dark`,
            flexShrink: 0,
          }}
        >
          <Iconify icon={icon} width={24} />
        </Box>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h5">{value}</Typography>
        </Box>
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

function downloadCSV(rows, filename) {
  const headers = [
    'Deal #',
    'Deal Name',
    'Date',
    'Currency',
    'Revenue',
    'Gross Profit',
    'Net Profit Before BDM',
    'Commission',
    'Paid Commission',
    'Net Profit After BDM',
    'Commission Paid',
    'Status',
  ];
  const csvRows = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.dealNumber,
        `"${r.dealName}"`,
        r.dealDate,
        r.currency || DEFAULT_CURRENCY,
        r.arInvoiceAmount.toFixed(2),
        r.grossProfit.toFixed(2),
        r.netProfitBeforeBDM.toFixed(2),
        r.bdmCommissionAmount.toFixed(2),
        r.bdmCommissionPaidAmount.toFixed(2),
        r.netProfitAfterBDM.toFixed(2),
        r.bdmCommissionPaid ? 'Yes' : 'No',
        r.status,
      ].join(',')
    ),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ----------------------------------------------------------------------

function BDMDealsTable({ deals, bdmName }) {
  return (
    <Scrollbar>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Deal #</TableCell>
            <TableCell>Deal Name</TableCell>
            <TableCell>Date</TableCell>
            <TableCell align="right">Revenue</TableCell>
            <TableCell align="right">Gross Profit</TableCell>
            <TableCell align="right">Commission</TableCell>
            <TableCell align="right">Paid</TableCell>
            <TableCell align="right">Net Profit After BDM</TableCell>
            <TableCell align="center">Comm. Status</TableCell>
            <TableCell align="center">Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {deals.map((deal) => (
            <TableRow key={deal.dealId} hover>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {deal.dealNumber || '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{deal.dealName}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {fDate(deal.dealDate)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight={600}>
                  {fc(deal.arInvoiceAmount, deal.currency)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="body2"
                  color={deal.grossProfit >= 0 ? 'success.main' : 'error.main'}
                >
                  {fc(deal.grossProfit, deal.currency)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color="warning.main">
                  {fc(deal.bdmCommissionAmount, deal.currency)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color="text.secondary">
                  {fc(deal.bdmCommissionPaidAmount, deal.currency)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="body2"
                  color={deal.netProfitAfterBDM >= 0 ? 'success.main' : 'error.main'}
                  fontWeight={600}
                >
                  {fc(deal.netProfitAfterBDM, deal.currency)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Label
                  color={deal.bdmCommissionPaid ? 'success' : 'warning'}
                  variant="soft"
                  sx={{ fontSize: 11 }}
                >
                  {deal.bdmCommissionPaid ? 'Paid' : 'Pending'}
                </Label>
              </TableCell>
              <TableCell align="center">
                <Chip
                  size="small"
                  label={deal.status || '—'}
                  color={
                    deal.status === 'completed'
                      ? 'success'
                      : deal.status === 'cancelled'
                        ? 'error'
                        : 'default'
                  }
                  variant="soft"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Scrollbar>
  );
}

// ----------------------------------------------------------------------

// Derive primary currency for a BDM: majority currency among their deals, fallback SAR
function getPrimaryCurrency(deals) {
  if (!deals?.length) return DEFAULT_CURRENCY;
  const counts = {};
  for (const d of deals) {
    const c = d.currency || DEFAULT_CURRENCY;
    counts[c] = (counts[c] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// ----------------------------------------------------------------------

function BDMCard({ report, expanded, onToggle }) {
  const { summary } = report;
  const currency = getPrimaryCurrency(report.deals);

  return (
    <Card sx={{ mb: 2 }}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Iconify icon="mdi:account-tie" width={22} color="primary.main" />
            <Typography variant="subtitle1" fontWeight={700}>
              {report.bdmName}
            </Typography>
            <Chip
              size="small"
              label={`${summary.dealCount} deals`}
              variant="soft"
              color="primary"
            />
          </Stack>
        }
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              variant="outlined"
              startIcon={<Iconify icon="eva:download-fill" />}
              onClick={(e) => {
                e.stopPropagation();
                downloadCSV(report.deals, `bdm-report-${report.bdmName}.csv`);
              }}
            >
              CSV
            </Button>
            <Button
              size="small"
              endIcon={
                <Iconify icon={expanded ? 'eva:chevron-up-fill' : 'eva:chevron-down-fill'} />
              }
              onClick={onToggle}
            >
              {expanded ? 'Hide Deals' : 'View Deals'}
            </Button>
          </Stack>
        }
        sx={{ cursor: 'pointer' }}
        onClick={onToggle}
      />

      {/* Summary row */}
      <CardContent sx={{ pt: 0, pb: expanded ? 1 : 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="caption" color="text.secondary">
              Total Revenue
            </Typography>
            <Typography variant="subtitle2" fontWeight={700}>
              {fc(summary.totalRevenue, currency)}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="caption" color="text.secondary">
              Gross Profit
            </Typography>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              color={summary.totalGrossProfit >= 0 ? 'success.main' : 'error.main'}
            >
              {fc(summary.totalGrossProfit, currency)}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="caption" color="text.secondary">
              Net Profit After BDM
            </Typography>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              color={summary.totalNetProfit >= 0 ? 'success.main' : 'error.main'}
            >
              {fc(summary.totalNetProfit, currency)}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="caption" color="text.secondary">
              Total Commission
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} color="warning.main">
              {fc(summary.totalCommission, currency)}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="caption" color="text.secondary">
              Paid Commission
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} color="success.main">
              {fc(summary.paidCommission, currency)}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="caption" color="text.secondary">
              Pending Commission
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} color="error.main">
              {fc(summary.pendingCommission, currency)}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>

      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ px: 2, pb: 2 }}>
          <BDMDealsTable deals={report.deals} bdmName={report.bdmName} />
        </Box>
      </Collapse>
    </Card>
  );
}

// ----------------------------------------------------------------------

const roleIdToName = { 1: 'regular', 2: 'manager', 3: 'admin', 4: 'superAdmin' };

export function BdmReportView() {
  const { user } = useAuthContext();
  const normalizedRole = user?.role || roleIdToName[user?.roleId] || 'regular';
  const isPrivileged = normalizedRole === 'superAdmin' || normalizedRole === 'admin';

  const [year, setYear] = useState(CURRENT_YEAR);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedBdm, setExpandedBdm] = useState(null);
  // null = not resolved yet, false = no BDM found, string = bdmId
  const [ownBdmId, setOwnBdmId] = useState(null);

  // Resolve the current user's BDM record (non-admin path only)
  useEffect(() => {
    if (isPrivileged) {
      setOwnBdmId('*'); // sentinel: admin sees all
      return;
    }
    let cancelled = false;
    getBDMs().then((bdms) => {
      if (cancelled) return;
      const match = bdms.find((b) => b.email?.toLowerCase() === user?.email?.toLowerCase());
      setOwnBdmId(match ? match.id : false);
    });
    return () => {
      cancelled = true;
    };
  }, [isPrivileged, user?.email]);

  const fetchData = useCallback(async () => {
    // Wait until BDM identity is resolved
    if (ownBdmId === null) return;
    // Non-admin with no BDM record — nothing to fetch
    if (ownBdmId === false) return;
    setLoading(true);
    setError(null);
    const bdmFilter = ownBdmId === '*' ? undefined : ownBdmId;
    const result = await fetchBdmReport({ bdmId: bdmFilter, year: year || undefined });
    if (result?.error) {
      setError(result.error);
    } else {
      setData(result);
    }
    setLoading(false);
  }, [year, ownBdmId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Aggregate totals across all BDMs
  const totals =
    data?.reports?.reduce(
      (acc, r) => {
        acc.revenue += r.summary.totalRevenue;
        acc.grossProfit += r.summary.totalGrossProfit;
        acc.netProfit += r.summary.totalNetProfit;
        acc.commission += r.summary.totalCommission;
        acc.paid += r.summary.paidCommission;
        acc.pending += r.summary.pendingCommission;
        acc.deals += r.summary.dealCount;
        // Track dominant currency across all BDMs
        const c = getPrimaryCurrency(r.deals);
        acc.currencies[c] = (acc.currencies[c] || 0) + r.summary.dealCount;
        return acc;
      },
      {
        revenue: 0,
        grossProfit: 0,
        netProfit: 0,
        commission: 0,
        paid: 0,
        pending: 0,
        deals: 0,
        currencies: {},
      }
    ) ?? null;

  const totalsCurrency = totals
    ? (Object.entries(totals.currencies).sort((a, b) => b[1] - a[1])[0]?.[0] ?? DEFAULT_CURRENCY)
    : DEFAULT_CURRENCY;

  // ── Access control ─────────────────────────────────────────────────────────
  // Still resolving which BDM this user is
  if (ownBdmId === null) {
    return (
      <DashboardContent maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  // Non-admin user with no matching BDM record → deny
  if (ownBdmId === false) {
    return (
      <DashboardContent maxWidth="xl">
        <CustomBreadcrumbs
          heading="BDM Report"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Reports', href: paths.dashboard.general.reports.root },
            { name: 'BDM Report' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <EmptyContent
          filled
          title="Access Restricted"
          description="Your account is not linked to a BDM profile. Contact an administrator if you believe this is a mistake."
          sx={{ py: 10 }}
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading="BDM Report"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Reports', href: paths.dashboard.general.reports.root },
          { name: 'BDM Report' },
        ]}
        action={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Year</InputLabel>
              <Select value={year} label="Year" onChange={(e) => setYear(Number(e.target.value))}>
                {YEAR_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="eva:refresh-fill" />}
              onClick={fetchData}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {!loading && !error && (
        <>
          {/* KPI cards */}
          {totals && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KpiCard
                  title="Total Revenue"
                  value={fc(totals.revenue, totalsCurrency)}
                  icon="mdi:cash-multiple"
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KpiCard
                  title="Gross Profit"
                  value={fc(totals.grossProfit, totalsCurrency)}
                  icon="mdi:trending-up"
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KpiCard
                  title="Net Profit After BDM"
                  value={fc(totals.netProfit, totalsCurrency)}
                  icon="mdi:chart-line"
                  color={totals.netProfit >= 0 ? 'success' : 'error'}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KpiCard
                  title="Total Commission"
                  value={fc(totals.commission, totalsCurrency)}
                  icon="mdi:hand-coin-outline"
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KpiCard
                  title="Paid Commission"
                  value={fc(totals.paid, totalsCurrency)}
                  icon="mdi:check-circle-outline"
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KpiCard
                  title="Pending Commission"
                  value={fc(totals.pending, totalsCurrency)}
                  icon="mdi:clock-outline"
                  color="error"
                />
              </Grid>
            </Grid>
          )}

          {/* BDM cards */}
          {!data?.reports?.length ? (
            <EmptyContent
              filled
              title="No BDM data found"
              description="No deals with a BDM assigned were found for the selected period."
              sx={{ py: 10 }}
            />
          ) : (
            data.reports.map((report) => (
              <BDMCard
                key={report.bdmId}
                report={report}
                expanded={expandedBdm === report.bdmId}
                onToggle={() =>
                  setExpandedBdm((prev) => (prev === report.bdmId ? null : report.bdmId))
                }
              />
            ))
          )}
        </>
      )}
    </DashboardContent>
  );
}
