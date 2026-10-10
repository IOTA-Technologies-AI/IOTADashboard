'use client';

import { useState, useEffect } from 'react';

import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';

import { RouterLink } from 'src/routes/components';

import { apiHelper, getAzureBilling } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';
import { SeoIllustration } from 'src/assets/illustrations';
import { useDashboardOverview } from 'src/actions/dashboard';

import { useAuthContext } from 'src/auth/hooks';

import { AppWelcome } from '../app-welcome';
import { DashboardHr } from '../dashboard-hr';
import { AppQuranVerse } from '../app-quran-verse';
import { AppAzureBilling } from '../app-azure-billing';
import { DashboardActions } from '../dashboard-actions';
import { AppAreaInstalled } from '../app-area-installed';
import { AppWidgetSummary } from '../app-widget-summary';
import { DashboardPipeline } from '../dashboard-pipeline';
import { DashboardRankedList } from '../dashboard-ranked-list';
import { DashboardRecentInvoices } from '../dashboard-recent-invoices';

// ----------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Change against last year, or null when last year is zero (no comparison). */
const change = (now, before) => (before > 0 ? ((now - before) / before) * 100 : null);

/** Running monthly totals up to the current month, for the sparkline. */
const monthsToDate = (months = []) => months.slice(0, new Date().getMonth() + 1);

/**
 * The IOTA home dashboard. Every figure is real: finance, sales and HR come
 * from /dashboard/overview (each section only for users with access to that
 * module); money is in SAR. "Waiting for you" lists the caller's own pending
 * signatures and decisions.
 */
export function OverviewAppView() {
  const { user } = useAuthContext();
  const theme = useTheme();
  const { overview, error, loading } = useDashboardOverview();

  const [partnerBilling, setPartnerBilling] = useState(null);
  const isSuperAdmin = user?.role === 'superAdmin' || user?.roleId === 4;
  const [azureBilling, setAzureBilling] = useState({ data: [], currency: 'USD', error: undefined });
  const [azureBillingLoading, setAzureBillingLoading] = useState(false);

  const finance = overview?.finance;
  const sales = overview?.sales;
  const hr = overview?.hr;
  const actions = overview?.actions ?? [];
  const year = new Date().getFullYear();

  useEffect(() => {
    // Partner billing: last month's period, e.g. "September_2026".
    if (!finance) return;
    const lastMonth = new Date();
    lastMonth.setDate(1);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const period = `${lastMonth.toLocaleString('en-US', { month: 'long' })}_${lastMonth.getFullYear()}`;
    apiHelper
      .fetchTotalPartnerBilling(period)
      .then((res) =>
        setPartnerBilling({
          period,
          totalPaid: res.totalPaid || 0,
          totalPending: res.totalPending || 0,
        })
      )
      .catch((err) => console.error('Partner billing fetch failed:', err));
  }, [finance]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    setAzureBillingLoading(true);
    getAzureBilling()
      .then((res) => setAzureBilling(res))
      .catch((err) => console.error('Azure billing fetch failed:', err))
      .finally(() => setAzureBillingLoading(false));
  }, [isSuperAdmin]);

  const firstName = (user?.displayName || '').split(' ')[0];
  const welcomeText = actions.length
    ? `${actions.length} item${actions.length === 1 ? ' is' : 's are'} waiting for your signature or decision.`
    : 'Nothing is waiting for your signature or decision.';

  return (
    <DashboardContent maxWidth="xl">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <AppWelcome
            title={`Welcome back 👋 \n ${firstName || user?.displayName || ''}`}
            description={welcomeText}
            img={<SeoIllustration hideBackground />}
            action={
              actions.length ? (
                <Button
                  variant="contained"
                  color="primary"
                  component={RouterLink}
                  href={actions[0].href}
                >
                  {actions[0].title}
                </Button>
              ) : null
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <AppQuranVerse />
        </Grid>

        {loading ? (
          <Grid size={12}>
            <LinearProgress />
          </Grid>
        ) : null}
        {error ? (
          <Grid size={12}>
            <Alert severity="error">
              The dashboard figures could not be loaded:{' '}
              {error?.response?.data?.message || error.message}
            </Alert>
          </Grid>
        ) : null}
        {overview?.notConverted?.length ? (
          <Grid size={12}>
            <Alert severity="info">
              Amounts in {overview.notConverted.join(', ')} are left out of the SAR totals (no
              exchange rate available).
            </Alert>
          </Grid>
        ) : null}

        {/* ── Finance ─────────────────────────────────────────────── */}
        {finance ? (
          <>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <AppWidgetSummary
                title={`Billed in ${year}`}
                unit="SAR"
                total={finance.billedYtd}
                percent={change(finance.billedYtd, finance.billedPreviousYtd)}
                caption="vs same period last year"
                chart={{
                  categories: MONTHS,
                  series: monthsToDate(finance.monthly.find((m) => m.year === year)?.months),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <AppWidgetSummary
                title={`Collected in ${year}`}
                unit="SAR"
                total={finance.collectedYtd}
                caption={
                  finance.billedYtd
                    ? `${Math.round((finance.collectedYtd / finance.billedYtd) * 100)}% of billed`
                    : 'Nothing billed yet'
                }
                chart={{ colors: [theme.palette.success.main], categories: MONTHS, series: [] }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <AppWidgetSummary
                title="Receivables outstanding"
                unit="SAR"
                total={finance.receivablesOutstanding}
                caption={`${finance.receivablesCount} open invoice${finance.receivablesCount === 1 ? '' : 's'}`}
                chart={{ colors: [theme.palette.warning.main], categories: MONTHS, series: [] }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <AppWidgetSummary
                title="Payables outstanding"
                unit="SAR"
                total={finance.payablesOutstanding}
                caption={`${finance.payablesCount} unpaid bill${finance.payablesCount === 1 ? '' : 's'}`}
                chart={{ colors: [theme.palette.error.main], categories: MONTHS, series: [] }}
              />
            </Grid>

            <Grid size={{ xs: 12, lg: 8 }}>
              <AppAreaInstalled
                title="Monthly billing"
                subheader={`SAR, ${year} compared with ${year - 1}`}
                chart={{
                  categories: MONTHS,
                  series: [
                    {
                      name: 'Billed',
                      data: finance.monthly
                        .slice()
                        .sort((a, b) => a.year - b.year)
                        .map((m) => ({ name: String(m.year), data: m.months })),
                    },
                  ],
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <DashboardRankedList
                title="Top customers"
                subheader={`Billed in ${year}, SAR`}
                items={finance.topCustomers.map((c) => ({
                  key: c.name,
                  label: c.name,
                  secondary: `${c.invoices} invoice${c.invoices === 1 ? '' : 's'}`,
                  value: c.billed,
                }))}
                empty="No invoices billed this year yet."
              />
            </Grid>

            <Grid size={{ xs: 12, lg: 8 }}>
              <DashboardRecentInvoices invoices={finance.recentInvoices} />
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <DashboardActions actions={actions} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppWidgetSummary
                title={`Expenses in ${year}`}
                unit="SAR"
                total={finance.expensesYtd}
                caption="approved expenses"
                chart={{ colors: [theme.palette.info.main], categories: MONTHS, series: [] }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <AppWidgetSummary
                title="Partner billing"
                total={(partnerBilling?.totalPaid || 0) + (partnerBilling?.totalPending || 0)}
                caption={
                  partnerBilling
                    ? `${partnerBilling.period.replace('_', ' ')}: paid ${Math.round(partnerBilling.totalPaid)}, pending ${Math.round(partnerBilling.totalPending)}`
                    : 'Loading from the partner system…'
                }
                chart={{ colors: [theme.palette.info.dark], categories: MONTHS, series: [] }}
              />
            </Grid>
          </>
        ) : (
          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <DashboardActions actions={actions} />
          </Grid>
        )}

        {isSuperAdmin ? (
          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <AppAzureBilling
              data={azureBilling.data}
              currency={azureBilling.currency}
              loading={azureBillingLoading}
              error={azureBilling.error}
            />
          </Grid>
        ) : null}

        {/* ── Sales ───────────────────────────────────────────────── */}
        {sales ? (
          <>
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <DashboardPipeline sales={sales} />
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <DashboardRankedList
                title="Top BDMs"
                subheader={`Gross profit in ${year}, SAR`}
                items={sales.topBdms.map((b) => ({
                  key: b.name,
                  label: b.name,
                  secondary: `${b.deals} deal${b.deals === 1 ? '' : 's'}`,
                  value: b.grossProfit,
                }))}
                empty="No commissioned deals this year yet."
              />
            </Grid>
          </>
        ) : null}

        {/* ── HR & compliance ─────────────────────────────────────── */}
        {hr ? (
          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <DashboardHr hr={hr} />
          </Grid>
        ) : null}
      </Grid>
    </DashboardContent>
  );
}
