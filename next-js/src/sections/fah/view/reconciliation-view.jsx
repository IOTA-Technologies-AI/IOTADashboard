'use client';

import { useState } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  fahError,
  refreshFah,
  usePlBridge,
  useFahCatalog,
  useReconciliation,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { fAmount } from '../fah-labels';
import { FahGate, useFahT } from '../fah-gate';

// ----------------------------------------------------------------------

const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

export function ReconciliationView() {
  const { t } = useFahT();
  const [tab, setTab] = useState('control');
  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('recon.title', 'Reconciliation')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('recon.title', 'Reconciliation') },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <FahGate minRank={1}>
        {() => (
          <Stack spacing={3}>
            <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable">
              <Tab value="control" label={t('recon.tabControl', 'Control accounts')} />
              <Tab value="pl" label={t('recon.tabPl', 'GL vs ERP P&L')} />
            </Tabs>
            {tab === 'control' ? <ControlAccounts /> : <PlBridge />}
          </Stack>
        )}
      </FahGate>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function DiffLabel({ value, tolerance }) {
  const { t } = useFahT();
  if (value === null || value === undefined)
    return <Typography color="text.disabled">—</Typography>;
  const ok = Math.abs(Number(value)) <= tolerance;
  return (
    <Label variant="soft" color={ok ? 'success' : 'warning'} sx={num}>
      {ok ? t('recon.agrees', 'Agrees') : fAmount(value)}
    </Label>
  );
}

function ControlAccounts() {
  const { t } = useFahT();
  const { accounts } = useFahCatalog();
  const { cutover, rows, error, loading, validating } = useReconciliation();
  const idOf = (code) => accounts.find((a) => a.code === code)?.id;

  return (
    <Card component={m.div} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2.5 }}>
        <Typography variant="body2" color="text.secondary">
          {cutover
            ? t('recon.since', 'ERP figures since {{date}}', { date: cutover })
            : t('recon.loading', 'Loading…')}
        </Typography>
        <Button
          size="small"
          color="inherit"
          startIcon={<Iconify icon="solar:restart-bold" />}
          onClick={() => refreshFah()}
        >
          {t('recon.refresh', 'Refresh')}
        </Button>
      </Stack>
      <Box sx={{ height: 2 }}>{(loading || validating) && <LinearProgress />}</Box>
      {error && (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
          {fahError(error)}
        </Alert>
      )}
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 820 }}>
          <TableHead>
            <TableRow>
              <TableCell>{t('recon.account', 'Account')}</TableCell>
              <TableCell>{t('recon.what', 'Reconciliation')}</TableCell>
              <TableCell align="right">{t('recon.gl', 'Ledger')}</TableCell>
              <TableCell align="right">{t('recon.erp', 'ERP')}</TableCell>
              <TableCell align="right">{t('recon.difference', 'Difference')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => {
              const code = String(r.accounts).split(/[,/ ]/)[0];
              const id = idOf(code);
              return (
                <TableRow
                  key={r.key}
                  component={m.tr}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i, 12) * 0.03 }}
                >
                  <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {id ? (
                      <Link
                        component={RouterLink}
                        href={`${paths.dashboard.finance.accounting.ledger}?accountId=${id}`}
                      >
                        {r.accounts}
                      </Link>
                    ) : (
                      r.accounts
                    )}
                  </TableCell>
                  <TableCell sx={{ minWidth: 280 }}>
                    <Typography variant="body2">{r.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.note}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={num}>
                    {fAmount(r.gl)}
                  </TableCell>
                  <TableCell align="right" sx={num}>
                    {r.erp === null ? '—' : fAmount(r.erp)}
                  </TableCell>
                  <TableCell align="right">
                    <DiffLabel value={r.difference} tolerance={0.01} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

// ----------------------------------------------------------------------

function PlBridge() {
  const { t } = useFahT();
  const thisYear = new Date().getFullYear();
  const years = [];
  for (let y = 2025; y <= thisYear; y += 1) years.push(y);
  const [year, setYear] = useState(thisYear);
  const { sections, error, loading } = usePlBridge(year);

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <TextField
          select
          size="small"
          label={t('recon.year', 'Year')}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          sx={{ width: 140 }}
        >
          {years.map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="body2" color="text.secondary">
          {t(
            'recon.plIntro',
            'The ERP P&L report sums invoice totals including VAT, every expense and net payroll. The ledger is on an accrual basis. The bridge explains the difference; what is left is unexplained.'
          )}
        </Typography>
      </Stack>
      {loading && <LinearProgress />}
      {error && <Alert severity="error">{fahError(error)}</Alert>}
      <Box
        sx={{
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        }}
      >
        {sections.map((s, i) => (
          <Card
            key={s.key}
            component={m.div}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            sx={{ p: 2.5 }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t(`recon.section.${s.key}`, s.label)}
            </Typography>
            <Stack spacing={1}>
              <Row label={t('recon.asErp', 'As in the P&L report')} value={s.erp} strong />
              {s.bridge.map((b) => (
                <Row key={b.label} label={b.label} value={b.amount} muted />
              ))}
              <Divider sx={{ borderStyle: 'dashed' }} />
              <Row label={t('recon.expected', 'Expected in the ledger')} value={s.expectedGl} />
              <Row label={t('recon.ledger', 'Ledger')} value={s.gl} strong />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {t('recon.unexplained', 'Unexplained')}
                </Typography>
                <DiffLabel value={s.unexplained} tolerance={1} />
              </Stack>
            </Stack>
          </Card>
        ))}
      </Box>
    </Stack>
  );
}

function Row({ label, value, strong, muted }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="baseline">
      <Typography variant="body2" color={muted ? 'text.secondary' : 'text.primary'}>
        {label}
      </Typography>
      <Typography variant={strong ? 'subtitle2' : 'body2'} sx={num}>
        {fAmount(value)}
      </Typography>
    </Stack>
  );
}
