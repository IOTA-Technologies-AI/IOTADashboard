'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import { fahError, useFahCatalog } from 'src/actions/fah';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useFahT, FahGate } from '../fah-gate';
import { DimensionBooks } from '../dimension-books';
import { DimensionPractices } from '../dimension-practices';
import { DimensionEmployees } from '../dimension-employees';
import { DimensionEngagements } from '../dimension-engagements';
import { DimensionCostCentres } from '../dimension-cost-centres';

// ----------------------------------------------------------------------

const TABS = [
  {
    value: 'practices',
    key: 'dims.practices',
    label: 'Practices',
    icon: 'solar:case-minimalistic-bold',
  },
  {
    value: 'costCentres',
    key: 'dims.costCentres',
    label: 'Cost centres',
    icon: 'solar:tag-horizontal-bold-duotone',
  },
  {
    value: 'engagements',
    key: 'dims.engagements',
    label: 'Engagements',
    icon: 'solar:suitcase-tag-bold',
  },
  {
    value: 'employees',
    key: 'dims.employeesTab',
    label: 'Employees → practice',
    icon: 'solar:users-group-rounded-bold-duotone',
  },
  {
    value: 'books',
    key: 'dims.booksTab',
    label: 'Books & locations',
    icon: 'solar:notebook-bold-duotone',
  },
];

export function DimensionsView() {
  const { t } = useFahT();

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('dims.title', 'Dimensions')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('dims.title', 'Dimensions') },
        ]}
        sx={{ mb: 2 }}
      />
      <FahGate minRank={1}>{(me) => <DimensionsBoard me={me} />}</FahGate>
    </DashboardContent>
  );
}

function DimensionsBoard({ me }) {
  const { t } = useFahT();
  const [tab, setTab] = useState('practices');
  const { entities, practices, costCentres, locations, engagements, loading, error } =
    useFahCatalog();

  return (
    <>
      <Tabs
        value={tab}
        onChange={(e, value) => setTab(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 3 }}
      >
        {TABS.map((tb) => (
          <Tab
            key={tb.value}
            value={tb.value}
            label={t(tb.key, tb.label)}
            icon={<Iconify icon={tb.icon} width={20} />}
            iconPosition="start"
          />
        ))}
      </Tabs>

      <Box sx={{ height: 2, mb: 1 }}>{loading && <LinearProgress />}</Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {fahError(error)}
        </Alert>
      )}

      <AnimatePresence mode="wait">
        <m.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'practices' && <DimensionPractices me={me} practices={practices} />}
          {tab === 'costCentres' && (
            <DimensionCostCentres
              me={me}
              costCentres={costCentres}
              practices={practices}
              locations={locations}
            />
          )}
          {tab === 'engagements' && (
            <DimensionEngagements
              me={me}
              engagements={engagements}
              practices={practices}
              entities={entities}
            />
          )}
          {tab === 'employees' && (
            <DimensionEmployees
              me={me}
              practices={practices}
              costCentres={costCentres}
              locations={locations}
            />
          )}
          {tab === 'books' && <DimensionBooks entities={entities} locations={locations} />}
        </m.div>
      </AnimatePresence>
    </>
  );
}
