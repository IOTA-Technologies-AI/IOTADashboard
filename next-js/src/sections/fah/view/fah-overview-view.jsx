'use client';

import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { useJournals, useFahCatalog } from 'src/actions/fah';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { varFade, varContainer, AnimateCountUp } from 'src/components/animate';

import { FAH_ROLE } from '../fah-labels';
import { FahGate, useFahT } from '../fah-gate';

// ----------------------------------------------------------------------

const A = paths.dashboard.finance.accounting;

const LINKS = [
  {
    key: 'journals',
    href: A.journals,
    icon: 'solar:notebook-bold-duotone',
    title: 'Journals',
    help: 'Prepare, approve and post journal entries; reverse posted ones.',
  },
  {
    key: 'accounts',
    href: A.accounts,
    icon: 'solar:list-bold',
    title: 'Chart of accounts',
    help: 'Accounts by class, with the dimensions each one requires.',
  },
  {
    key: 'tb',
    href: A.trialBalance,
    icon: 'solar:transfer-horizontal-bold-duotone',
    title: 'Trial balance',
    help: 'Per book or consolidated, by account, practice or cost centre.',
  },
  {
    key: 'ledger',
    href: A.ledger,
    icon: 'solar:bill-list-bold-duotone',
    title: 'General ledger',
    help: 'Every posted line, filtered by account, period and dimension.',
  },
  {
    key: 'periods',
    href: A.periods,
    icon: 'solar:calendar-date-bold',
    title: 'Periods',
    help: 'Open and soft-close months per book.',
  },
  {
    key: 'dims',
    href: A.dimensions,
    icon: 'solar:users-group-rounded-bold-duotone',
    title: 'Dimensions',
    help: 'Practices, cost centres, engagements and who works where.',
  },
  {
    key: 'rates',
    href: A.rates,
    icon: 'solar:wad-of-money-bold',
    title: 'Exchange rates',
    help: 'Rates to SAR used for foreign-currency lines.',
  },
  {
    key: 'access',
    href: A.access,
    icon: 'solar:shield-keyhole-bold-duotone',
    title: 'Access',
    help: 'Who holds which finance role.',
  },
];

export function FahOverviewView() {
  const { t } = useFahT();
  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('overview.title', 'Accounting')}
        links={[{ name: t('nav.finance', 'Finance') }, { name: t('nav.accounting', 'Accounting') }]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <FahGate minRank={1}>{(me) => <Overview me={me} />}</FahGate>
    </DashboardContent>
  );
}

function Overview({ me }) {
  const { t, nameOf } = useFahT();
  const { entities, accounts, practices } = useFahCatalog();
  const awaiting = useJournals({ status: 'SUBMITTED', limit: 1 });
  const approved = useJournals({ status: 'APPROVED', limit: 1 });
  const drafts = useJournals({ status: 'DRAFT', mine: true, limit: 1 });
  const posted = useJournals({ status: 'POSTED', limit: 1 });

  const tiles = [
    {
      key: 'awaiting',
      label: t('overview.awaiting', 'Awaiting approval'),
      value: awaiting.total,
      color: 'warning',
      icon: 'solar:clock-circle-bold',
      status: 'SUBMITTED',
    },
    {
      key: 'approved',
      label: t('overview.toPost', 'Approved, to post'),
      value: approved.total,
      color: 'info',
      icon: 'solar:check-circle-bold',
      status: 'APPROVED',
    },
    {
      key: 'drafts',
      label: t('overview.myDrafts', 'My drafts'),
      value: drafts.total,
      color: 'secondary',
      icon: 'solar:pen-bold',
      status: 'DRAFT',
    },
    {
      key: 'posted',
      label: t('overview.posted', 'Posted journals'),
      value: posted.total,
      color: 'success',
      icon: 'solar:verified-check-bold',
      status: 'POSTED',
    },
  ];

  return (
    <Stack
      spacing={3}
      component={m.div}
      variants={varContainer()}
      initial="initial"
      animate="animate"
    >
      <Card component={m.div} variants={varFade('inUp')} sx={{ p: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
          <Box>
            <Typography variant="h5">{t('overview.hello', 'Financial Accounting Hub')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
              {t(
                'overview.intro',
                'The general ledger beside the ERP: one chart of accounts, a book per legal entity in SAR, practices as revenue centres. Invoicing, expenses, payroll and VAT keep working exactly as before.'
              )}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="flex-start">
            {me.roles.map((r) => (
              <Chip
                key={r}
                color="primary"
                variant="soft"
                label={t(`role.${r}`, FAH_ROLE[r]?.label ?? r)}
              />
            ))}
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
          {entities.map((e) => (
            <Chip
              key={e.id}
              size="small"
              variant="outlined"
              color={e.isActive ? 'default' : 'warning'}
              label={`${e.shortCode} · ${nameOf(e)}${e.isActive ? '' : ` (${t('overview.inactive', 'not yet billing')})`}`}
            />
          ))}
          <Chip
            size="small"
            variant="outlined"
            label={t('overview.accounts', '{{n}} accounts', { n: accounts.length })}
          />
          <Chip
            size="small"
            variant="outlined"
            label={t('overview.practices', '{{n}} practices', {
              n: practices.filter((p) => p.isRevenueCentre).length,
            })}
          />
        </Stack>
      </Card>

      <Box
        sx={{
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        }}
      >
        {tiles.map((tile) => (
          <Card key={tile.key} component={m.div} variants={varFade('inUp')}>
            <CardActionArea component={RouterLink} href={`${A.journals}`} sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h3" sx={{ color: `${tile.color}.main` }}>
                    <AnimateCountUp to={tile.value} />
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tile.label}
                  </Typography>
                </Box>
                <Iconify
                  icon={tile.icon}
                  width={36}
                  sx={{ color: `${tile.color}.main`, opacity: 0.4 }}
                />
              </Stack>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      <Alert severity="info" component={m.div} variants={varFade('inUp')}>
        {t(
          'overview.phase',
          'Phase 1: the ledger, manual journals, opening balances and the trial balance. Journals from invoices, expenses, payroll and banking arrive in Phase 2, without changing those modules.'
        )}
      </Alert>

      <Box
        sx={{
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        }}
      >
        {LINKS.filter((l) => l.key !== 'access' || me.isCfo).map((l) => (
          <Card key={l.key} component={m.div} variants={varFade('inUp')} whileHover={{ y: -4 }}>
            <CardActionArea
              component={RouterLink}
              href={l.href}
              sx={{ p: 2.5, height: '100%', alignItems: 'flex-start' }}
            >
              <Iconify icon={l.icon} width={32} sx={{ color: 'primary.main', mb: 1.5 }} />
              <Typography variant="subtitle1">{t(`overview.link.${l.key}`, l.title)}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t(`overview.linkHelp.${l.key}`, l.help)}
              </Typography>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Stack>
  );
}
