'use client';

import { useState } from 'react';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { RetentionTab } from '../retention-tab';
import { ConsentRecordsTab } from '../consent-records-tab';
import { ConsentWordingTab } from '../consent-wording-tab';
import { WebsiteConsentsTab } from '../website-consents-tab';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'website', label: 'Website visitors' },
  { value: 'leads', label: 'Leads (PDPL)' },
  { value: 'applicants', label: 'Job applicants' },
  { value: 'candidates', label: 'Candidates' },
  { value: 'newHires', label: 'New hires' },
  { value: 'wording', label: 'Wording' },
  { value: 'retention', label: 'Retention' },
];

/**
 * Integrations → Consents: the cookie-banner choices on iotatechnologies.ai and
 * .io, and the PDPL consent of every lead, job applicant, candidate (intake
 * form) and new hire (onboarding form).
 */
export function ConsentsView() {
  const [tab, setTab] = useState('website');

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Consents"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Integrations', href: paths.dashboard.integration.root },
          { name: 'Consents' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2.5 }}
        >
          {TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} />
          ))}
        </Tabs>
      </Card>

      {tab === 'website' ? <WebsiteConsentsTab /> : null}
      {tab === 'wording' ? <ConsentWordingTab /> : null}
      {tab === 'retention' ? <RetentionTab /> : null}
      {!['website', 'wording', 'retention'].includes(tab) ? (
        <ConsentRecordsTab key={tab} kind={tab} />
      ) : null}
    </DashboardContent>
  );
}
