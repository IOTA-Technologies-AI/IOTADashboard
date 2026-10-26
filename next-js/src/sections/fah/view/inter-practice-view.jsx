'use client';

import { useState } from 'react';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { IpCharges } from '../ip-charges';
import { IpResults } from '../ip-results';
import { FahGate, useFahT } from '../fah-gate';
import { IpProfitShare } from '../ip-profit-share';
import { IpRateCards, IpAgreements } from '../ip-setup';

// ----------------------------------------------------------------------

/**
 * Accounting → Inter-practice (Phase 4, requirements §9): charges between
 * practices with approval by both sides, their agreements and rate cards,
 * profit share on engagements, and each practice's result with the
 * inter-practice matrix.
 */
export function InterPracticeView() {
  const { t } = useFahT();
  const [tab, setTab] = useState('charges');
  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('ip.title', 'Inter-practice')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('ip.title', 'Inter-practice') },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <FahGate minRank={1}>
        {(me) => (
          <Stack spacing={3}>
            <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable">
              <Tab value="charges" label={t('ip.tabCharges', 'Charges')} />
              <Tab value="profit" label={t('ip.tabProfit', 'Profit share')} />
              <Tab value="results" label={t('ip.tabResults', 'Practice results')} />
              <Tab value="agreements" label={t('ip.tabAgreements', 'Agreements')} />
              <Tab value="rates" label={t('ip.tabRates', 'Rate cards')} />
            </Tabs>
            {tab === 'charges' && <IpCharges me={me} />}
            {tab === 'profit' && <IpProfitShare me={me} />}
            {tab === 'results' && <IpResults />}
            {tab === 'agreements' && <IpAgreements me={me} />}
            {tab === 'rates' && <IpRateCards me={me} />}
          </Stack>
        )}
      </FahGate>
    </DashboardContent>
  );
}
