'use client';

import { m } from 'framer-motion';
import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import { fahError, exportChart, downloadText, updateAccount, useFahCatalog } from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { varFade } from 'src/components/animate';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { FahGate, useFahT } from '../fah-gate';
import { AccountEditDialog } from '../account-edit-dialog';
import { AccountImportDialog } from '../account-import-dialog';
import {
  ACCOUNT_CLASS,
  NORMAL_BALANCE,
  CONTROL_SUBLEDGER,
  ACCOUNT_CLASS_ORDER,
} from '../fah-labels';

// ----------------------------------------------------------------------

export function AccountListView() {
  const { t } = useFahT();

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('accounts.title', 'Chart of accounts')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('accounts.title', 'Chart of accounts') },
        ]}
        sx={{ mb: 3 }}
      />
      <FahGate minRank={1}>{(me) => <AccountList me={me} />}</FahGate>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function AccountList({ me }) {
  const { t, nameOf, isAr } = useFahT();
  const { accounts, entities, loading, error } = useFahCatalog();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(undefined); // undefined closed, null new, account edit
  const [importOpen, setImportOpen] = useState(false);
  const [toggling, setToggling] = useState('');

  const counts = useMemo(() => {
    const c = {};
    accounts.forEach((a) => {
      c[a.class] = (c[a.class] ?? 0) + 1;
    });
    return c;
  }, [accounts]);

  // Depth in the parent chain, for indenting sub-accounts.
  const depthOf = useMemo(() => {
    const byId = new Map(accounts.map((a) => [a.id, a]));
    return (a) => {
      let d = 0;
      let p = a.parentId ? byId.get(a.parentId) : null;
      while (p && d < 5) {
        d += 1;
        p = p.parentId ? byId.get(p.parentId) : null;
      }
      return d;
    };
  }, [accounts]);

  const q = query.trim().toLowerCase();
  const filtered = accounts.filter(
    (a) =>
      (tab === 'all' || a.class === tab) &&
      (!q ||
        a.code.includes(q) ||
        a.nameEn.toLowerCase().includes(q) ||
        (a.nameAr ?? '').includes(query.trim()))
  );

  const groups = ACCOUNT_CLASS_ORDER.map((cls) => ({
    cls,
    rows: filtered.filter((a) => a.class === cls).sort((x, y) => x.code.localeCompare(y.code)),
  })).filter((g) => g.rows.length);

  const handleExport = async () => {
    try {
      downloadText(await exportChart(), 'chart-of-accounts.csv');
    } catch (err) {
      toast.error(fahError(err));
    }
  };

  const handleToggle = async (account) => {
    setToggling(account.id);
    try {
      await updateAccount(account.id, { isActive: !account.isActive });
      toast.success(
        account.isActive
          ? t('accounts.deactivated', '{{code}} switched off', { code: account.code })
          : t('accounts.activated', '{{code}} switched on', { code: account.code })
      );
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setToggling('');
    }
  };

  const columns = me.canControl ? 9 : 8;

  return (
    <>
      <Card
        component={m.div}
        initial="initial"
        animate="animate"
        variants={varFade('inUp', { distance: 24 }).inUp}
      >
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          variant="scrollable"
          sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}` }}
        >
          <Tab
            value="all"
            iconPosition="end"
            label={t('accounts.all', 'All')}
            icon={<Label variant={tab === 'all' ? 'filled' : 'soft'}>{accounts.length}</Label>}
          />
          {ACCOUNT_CLASS_ORDER.map((cls) => (
            <Tab
              key={cls}
              value={cls}
              iconPosition="end"
              label={t(`class.${cls}`, ACCOUNT_CLASS[cls].label)}
              icon={
                <Label variant={tab === cls ? 'filled' : 'soft'} color="default">
                  {counts[cls] ?? 0}
                </Label>
              }
            />
          ))}
        </Tabs>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ md: 'center' }}
          sx={{ p: 2.5 }}
        >
          <TextField
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('accounts.search', 'Search by code or name…')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<Iconify icon="solar:export-bold" />}
              onClick={handleExport}
            >
              {t('accounts.export', 'Export CSV')}
            </Button>
            {me.canControl && (
              <>
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<Iconify icon="solar:import-bold" />}
                  onClick={() => setImportOpen(true)}
                >
                  {t('accounts.import', 'Import CSV')}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={() => setEditing(null)}
                >
                  {t('accounts.add', 'Add account')}
                </Button>
              </>
            )}
          </Stack>
        </Stack>

        <Box sx={{ height: 2 }}>{loading && <LinearProgress />}</Box>
        {error && (
          <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
            {fahError(error)}
          </Alert>
        )}

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow>
                <TableCell width={120}>{t('accounts.code', 'Code')}</TableCell>
                <TableCell>{t('accounts.name', 'Name')}</TableCell>
                <TableCell>{t('accounts.group', 'Group')}</TableCell>
                <TableCell>{t('accounts.normalBalance', 'Normal balance')}</TableCell>
                <TableCell>{t('accounts.control', 'Control subledger')}</TableCell>
                <TableCell>{t('accounts.required', 'Lines need')}</TableCell>
                <TableCell align="center">{t('accounts.postings', 'Postings')}</TableCell>
                <TableCell align="center">{t('accounts.active', 'Active')}</TableCell>
                {me.canControl && <TableCell width={56} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((g) => [
                <TableRow key={`h-${g.cls}`}>
                  <TableCell colSpan={columns} sx={{ bgcolor: 'background.neutral', py: 1 }}>
                    <Typography variant="subtitle2">
                      {t(`class.${g.cls}`, ACCOUNT_CLASS[g.cls].label)}
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        {ACCOUNT_CLASS[g.cls].range}
                      </Typography>
                    </Typography>
                  </TableCell>
                </TableRow>,
                ...g.rows.map((a) => (
                  <AccountRow
                    key={a.id}
                    account={a}
                    depth={depthOf(a)}
                    me={me}
                    isAr={isAr}
                    nameOf={nameOf}
                    toggling={toggling === a.id}
                    onEdit={() => setEditing(a)}
                    onToggle={() => handleToggle(a)}
                  />
                )),
              ])}
            </TableBody>
          </Table>
        </TableContainer>

        {!loading && !groups.length && (
          <EmptyContent title={t('accounts.empty', 'No accounts match')} sx={{ py: 8 }} />
        )}
      </Card>

      {me.canControl && (
        <>
          <AccountEditDialog
            open={editing !== undefined}
            account={editing ?? null}
            accounts={accounts}
            entities={entities}
            onClose={() => setEditing(undefined)}
          />
          <AccountImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
        </>
      )}
    </>
  );
}

// ----------------------------------------------------------------------

function AccountRow({ account: a, depth, me, isAr, nameOf, toggling, onEdit, onToggle }) {
  const { t } = useFahT();
  const other = isAr ? a.nameEn : a.nameAr;
  const needs = [
    a.requiresPractice && t('accounts.chipPractice', 'Practice'),
    a.requiresCostCentre && t('accounts.chipCostCentre', 'Cost centre'),
    a.requiresEngagement && t('accounts.chipEngagement', 'Engagement'),
    a.requiresIpCounterparty && t('accounts.chipCounterparty', 'Counterparty'),
  ].filter(Boolean);

  return (
    <TableRow hover sx={{ opacity: a.isActive ? 1 : 0.55 }}>
      <TableCell>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            pl: depth * 2,
            fontWeight: a.type === 'SUMMARY' ? 700 : 400,
          }}
        >
          {a.code}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography
          variant="body2"
          sx={{ pl: depth * 2, fontWeight: a.type === 'SUMMARY' ? 600 : 400 }}
        >
          {nameOf(a)}
          {a.isSystem && (
            <Label variant="soft" color="info" sx={{ ml: 1 }}>
              {t('accounts.system', 'System')}
            </Label>
          )}
          {a.type === 'SUMMARY' && (
            <Label variant="soft" sx={{ ml: 1 }}>
              {t('accounts.summary', 'Summary')}
            </Label>
          )}
        </Typography>
        {other && (
          <Typography variant="caption" color="text.secondary" sx={{ pl: depth * 2 }} dir="auto">
            {other}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {a.accountGroup}
        </Typography>
      </TableCell>
      <TableCell>
        {t(`normal.${a.normalBalance}`, NORMAL_BALANCE[a.normalBalance] ?? a.normalBalance)}
      </TableCell>
      <TableCell>
        {a.controlSubledger && (
          <Chip
            size="small"
            variant="outlined"
            color="warning"
            label={t(
              `subledger.${a.controlSubledger}`,
              CONTROL_SUBLEDGER[a.controlSubledger] ?? a.controlSubledger
            )}
          />
        )}
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {needs.map((n) => (
            <Chip key={n} size="small" label={n} />
          ))}
        </Stack>
      </TableCell>
      <TableCell align="center">
        {a.firstPostedAt && (
          <Tooltip title={t('accounts.hasPostings', 'Has postings: code and class are fixed')}>
            <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
          </Tooltip>
        )}
      </TableCell>
      <TableCell align="center">
        {me.canControl ? (
          <Switch size="small" checked={a.isActive} disabled={toggling} onChange={onToggle} />
        ) : (
          <Label variant="soft" color={a.isActive ? 'success' : 'default'}>
            {a.isActive ? t('accounts.active', 'Active') : t('accounts.inactive', 'Inactive')}
          </Label>
        )}
      </TableCell>
      {me.canControl && (
        <TableCell>
          <IconButton size="small" onClick={onEdit}>
            <Iconify icon="solar:pen-bold" />
          </IconButton>
        </TableCell>
      )}
    </TableRow>
  );
}
