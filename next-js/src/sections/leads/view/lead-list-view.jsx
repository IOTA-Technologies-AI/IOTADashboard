'use client';

import { useMemo, useState } from 'react';
import { useDebounce } from 'minimal-shared/hooks';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { paths } from 'src/routes/paths';

import { fToNow, fDateTime } from 'src/utils/format-time';

import { useLeads } from 'src/actions/leads';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { DeadLetterList } from '../dead-letter-list';
import { LEAD_SOURCE, LEAD_STATUS } from '../lead-labels';
import { LeadDetailsDrawer } from '../lead-details-drawer';
import { LeadSettingsDialog } from '../lead-settings-dialog';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'converted', label: 'Converted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

export function LeadListView() {
  const { user } = useAuthContext();
  const isAdmin = Number(user?.roleId) >= 3;

  const [tab, setTab] = useState('new');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [openId, setOpenId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const q = useDebounce(search.trim(), 400);
  const showingDeadLetters = tab === 'attention';
  const params = useMemo(
    () => ({
      status: tab === 'all' || showingDeadLetters ? undefined : tab,
      source: source || undefined,
      q: q || undefined,
      limit: rowsPerPage,
      offset: page * rowsPerPage,
    }),
    [tab, showingDeadLetters, source, q, rowsPerPage, page]
  );
  const { leads, total, counts, deadLetters, error, loading } = useLeads(params);
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);

  const changeTab = (value) => {
    setTab(value);
    setPage(0);
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Leads"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Sales', href: paths.dashboard.sales.root },
          { name: 'Leads' },
        ]}
        action={
          isAdmin ? (
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:settings-bold" />}
              onClick={() => setSettingsOpen(true)}
            >
              Settings
            </Button>
          ) : null
        }
        sx={{ mb: 3 }}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enquiries, newsletter sign-ups and job applications from the website forms, each with the
        consent it was given under. Convert an enquiry to put it in the sales ledger.
      </Typography>

      {deadLetters > 0 && !showingDeadLetters ? (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => changeTab('attention')}>
              Review
            </Button>
          }
        >
          {deadLetters} website submission{deadLetters === 1 ? '' : 's'} could not become a lead and{' '}
          {deadLetters === 1 ? 'is' : 'are'} waiting for review.
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.response?.data?.message || error.message}
        </Alert>
      ) : null}

      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => changeTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2 }}
        >
          {TABS.map((t) => (
            <Tab
              key={t.value}
              value={t.value}
              iconPosition="end"
              label={t.label}
              icon={
                <Label
                  variant={t.value === tab ? 'filled' : 'soft'}
                  color={LEAD_STATUS[t.value]?.color || 'default'}
                >
                  {t.value === 'all' ? allCount : (counts[t.value] ?? 0)}
                </Label>
              }
            />
          ))}
          <Tab
            value="attention"
            iconPosition="end"
            label="Needs attention"
            icon={
              <Label variant={tab === 'attention' ? 'filled' : 'soft'} color="warning">
                {deadLetters}
              </Label>
            }
          />
        </Tabs>

        {showingDeadLetters ? (
          <DeadLetterList onOpenSettings={isAdmin ? () => setSettingsOpen(true) : null} />
        ) : (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ p: 2 }}>
              <TextField
                fullWidth
                size="small"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Search name, email, company or message"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                select
                size="small"
                label="Source"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setPage(0);
                }}
                sx={{ minWidth: { sm: 220 } }}
              >
                <MenuItem value="">All sources</MenuItem>
                {Object.entries(LEAD_SOURCE).map(([value, s]) => (
                  <MenuItem key={value} value={value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {loading ? <LinearProgress /> : null}
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Received</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Lead</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leads.map((l) => (
                    <TableRow
                      key={l.id}
                      hover
                      onClick={() => setOpenId(l.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={{ whiteSpace: 'nowrap' }} title={fDateTime(l.receivedAt)}>
                        {fToNow(l.receivedAt)}
                      </TableCell>
                      <TableCell>
                        <Label variant="soft" color={LEAD_SOURCE[l.source]?.color}>
                          {LEAD_SOURCE[l.source]?.short || l.source}
                        </Label>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography variant="subtitle2" noWrap>
                          {l.fullName || l.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap component="div">
                          {[l.fullName ? l.email : null, l.company].filter(Boolean).join(' · ')}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 360 }}>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {l.message || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Label variant="soft" color={LEAD_STATUS[l.status]?.color}>
                          {LEAD_STATUS[l.status]?.label || l.status}
                        </Label>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && !leads.length ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 4, textAlign: 'center' }}
                        >
                          {q || source
                            ? 'No leads match these filters.'
                            : 'No leads here yet. They arrive as people submit the website forms.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[25, 50, 100]}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(0);
              }}
            />
          </>
        )}
      </Card>

      <LeadDetailsDrawer id={openId} onClose={() => setOpenId(null)} />
      {isAdmin ? (
        <LeadSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      ) : null}
    </DashboardContent>
  );
}
