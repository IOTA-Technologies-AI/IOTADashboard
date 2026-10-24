'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { FahGate, useFahT } from '../fah-gate';
import { PostingsRules } from '../postings-rules';
import { PostingsEvents } from '../postings-events';
import { PostingsTagging } from '../postings-tagging';
import { PostingsBackfill } from '../postings-backfill';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'events', label: 'Events', icon: 'solar:inbox-in-bold-duotone' },
  { value: 'tagging', label: 'Tagging queue', icon: 'solar:tag-horizontal-bold-duotone' },
  { value: 'rules', label: 'Posting rules', icon: 'solar:settings-bold-duotone' },
  { value: 'backfill', label: 'Backfill', icon: 'solar:sort-by-time-bold-duotone' },
];

/**
 * ERP postings: the events the ERP's invoices, expenses, payroll, wallets,
 * bank and VAT produce, how they post (rules and type maps), the practice
 * tagging queue, and the one-off backfill of history.
 */
export function PostingsView() {
  const { t } = useFahT();
  const [tab, setTab] = useState('events');

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('postings.title', 'ERP postings')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('postings.title', 'ERP postings') },
        ]}
        sx={{ mb: { xs: 3, md: 4 } }}
      />
      <FahGate minRank={1}>
        {(me) => (
          <>
            <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" sx={{ mb: 3 }}>
              {TABS.map((tb) => (
                <Tab
                  key={tb.value}
                  value={tb.value}
                  iconPosition="start"
                  icon={<Iconify icon={tb.icon} width={20} />}
                  label={t(`postings.tabs.${tb.value}`, tb.label)}
                />
              ))}
            </Tabs>
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={tab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {tab === 'events' && <PostingsEvents me={me} />}
                {tab === 'tagging' && <PostingsTagging me={me} />}
                {tab === 'rules' && <PostingsRules me={me} />}
                {tab === 'backfill' && <PostingsBackfill me={me} />}
              </m.div>
            </AnimatePresence>
          </>
        )}
      </FahGate>
    </DashboardContent>
  );
}
