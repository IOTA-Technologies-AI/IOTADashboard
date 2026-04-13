'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';

import { apiHelper } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';
import { SeoIllustration } from 'src/assets/illustrations';
import { _appAuthors, _appRelated, _appInvoices, _appInstalled } from 'src/_mock';

import { svgColorClasses } from 'src/components/svg-color';

//import { useMockedUser } from 'src/auth/hooks';
import { useAuthContext } from 'src/auth/hooks';

import { AppWidget } from '../app-widget';
import { AppWelcome } from '../app-welcome';
import { AppQuranVerse } from '../app-quran-verse';
import { AppTopAuthors } from '../app-top-authors';
import { AppTopRelated } from '../app-top-related';
import { AppNewInvoices } from '../app-new-invoices';
import { AppAreaInstalled } from '../app-area-installed';
import { AppWidgetSummary } from '../app-widget-summary';
import { AppCurrentDownload } from '../app-current-download';
import { AppTopInstalledCountries } from '../app-top-installed-countries';

// ----------------------------------------------------------------------

export function OverviewAppView() {
  const { user } = useAuthContext();
  //const { user } = useMockedUser();

  const theme = useTheme();
  const [totalIotaBilling, setTotalIotaBilling] = useState(0);
  //const [totalPartnerBilling, setTotalPartnerBilling] = useState(0);
  const [totalPartnerBilling, setTotalPartnerBilling] = useState({
    totalPaid: 0,
    totalPending: 0,
  });

  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  const nextYear = currentYear + 1;

  useEffect(() => {
    apiHelper
      .fetchTotalIotaBilling()
      .then((total) => {
        setTotalIotaBilling(total);
      })
      .catch((error) => {
        console.error('Error fetching total IOTA billing:', error);
      });
    // Similarly, you can fetch and set totalPartnerBilling if needed
    // I want to get last month name and year in the format of "Month_Year"
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - 1); // Go to last month
    console.log(currentDate);
    // Get the full month name
    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    var invoicePeriod = monthName + '_' + currentYear;
    apiHelper
      .fetchTotalPartnerBilling(invoicePeriod)
      .then((apiResponse) => {
        setTotalPartnerBilling({
          totalPaid: apiResponse.totalPaid,
          totalPending: apiResponse.totalPending,
        });
      })
      .catch((error) => {
        console.error('Error fetching total Partner billing:', error);
      });
  }, []);

  return (
    <DashboardContent maxWidth="xl">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <AppWelcome
            title={`Welcome back 👋 \n ${user?.displayName}`}
            description="If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything."
            img={<SeoIllustration hideBackground />}
            action={
              <Button variant="contained" color="primary">
                Go now
              </Button>
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <AppQuranVerse />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <AppWidgetSummary
            title="Total IOTA Billing"
            percent={2.6}
            total={totalIotaBilling}
            chart={{
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
              series: [15, 18, 12, 51, 68, 11, 39, 37],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <AppWidgetSummary
            title="Total Partner Billing"
            percent={0.2}
            total={totalPartnerBilling.totalPaid + totalPartnerBilling.totalPending}
            chart={{
              colors: [theme.palette.info.main],
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
              series: [20, 41, 63, 33, 28, 35, 50, 46],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <AppWidgetSummary
            title="Collective Total"
            percent={-0.1}
            total={
              totalIotaBilling + totalPartnerBilling.totalPaid + totalPartnerBilling.totalPending
            }
            chart={{
              colors: [theme.palette.error.main],
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
              series: [18, 19, 31, 8, 16, 37, 12, 33],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AppCurrentDownload
            title="Current Monthly Billing"
            subheader="As per existing Invoices"
            chart={{
              series: [
                { label: 'IOTA Paid', value: 12244 },
                { label: 'Partner Paid', value: totalPartnerBilling.totalPaid },
                { label: 'IOTA Pending', value: 44313 },
                { label: 'Partner Pending', value: totalPartnerBilling.totalPending },
              ],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <AppAreaInstalled
            title="Billing Pattern"
            subheader="(+43%) than last year"
            chart={{
              categories: [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
              ],
              series: [
                {
                  name: previousYear.toString(),
                  data: [
                    { name: 'IOTA', data: [12, 10, 18, 22, 20, 12, 8, 21, 20, 14, 15, 16] },
                    { name: 'Partner', data: [12, 10, 18, 22, 20, 12, 8, 21, 20, 14, 15, 16] },
                  ],
                },
                {
                  name: currentYear.toString(),
                  data: [
                    { name: 'IOTA', data: [6, 18, 14, 9, 20, 6, 22, 19, 8, 22, 8, 17] },
                    { name: 'Partner', data: [6, 18, 14, 9, 20, 6, 22, 19, 8, 22, 8, 17] },
                  ],
                },
                {
                  name: nextYear.toString(),
                  data: [
                    { name: 'IOTA', data: [6, 20, 15, 18, 7, 24, 6, 10, 12, 17, 18, 10] },
                    { name: 'Partner', data: [6, 20, 15, 18, 7, 24, 6, 10, 12, 17, 18, 10] },
                  ],
                },
              ],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <AppNewInvoices
            title="New Invoices"
            tableData={_appInvoices}
            headCells={[
              { id: 'id', label: 'Invoice ID' },
              { id: 'category', label: 'Category' },
              { id: 'price', label: 'Price' },
              { id: 'status', label: 'Status' },
              { id: '' },
            ]}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AppTopRelated title="Resources Card" list={_appRelated} />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AppTopInstalledCountries title="Top Billing Customers" list={_appInstalled} />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AppTopAuthors title="Top Resources" list={_appAuthors} />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
            <AppWidget
              title="Accounts Receivable"
              total={38566}
              icon="solar:user-rounded-bold"
              chart={{ series: 48 }}
            />

            <AppWidget
              title="Accounts Payable"
              total={55566}
              icon="solar:letter-bold"
              chart={{
                series: 75,
                colors: [theme.vars.palette.info.light, theme.vars.palette.info.main],
              }}
              sx={{ bgcolor: 'info.dark', [`& .${svgColorClasses.root}`]: { color: 'info.light' } }}
            />
          </Box>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
