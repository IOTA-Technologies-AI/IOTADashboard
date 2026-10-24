'use client';

import { useState } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import {
  fahError,
  runEngine,
  retryEvent,
  useFahEvent,
  ignoreEvent,
  useFahEvents,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { useFahT } from './fah-gate';
import { fAmount } from './fah-labels';

// ----------------------------------------------------------------------

export const EVENT_STATUS = {
  PENDING: { label: 'Pending', color: 'info' },
  WAITING: { label: 'Waiting', color: 'warning' },
  FAILED: { label: 'Failed', color: 'error' },
  POSTED: { label: 'Posted', color: 'success' },
  IGNORED: { label: 'Ignored', color: 'default' },
  SUPERSEDED: { label: 'Superseded', color: 'default' },
};

const FILTERS = ['', 'PROBLEMS', 'PENDING', 'POSTED', 'IGNORED', 'SUPERSEDED'];

export const EVENT_LABEL = {
  AR_INVOICE_APPROVED: 'Invoice approved',
  AR_INVOICE_AMENDED: 'Invoice amended',
  AR_INVOICE_RETAGGED: 'Invoice retagged',
  AR_INVOICE_UNAPPROVED: 'Invoice unapproved',
  AR_INVOICE_DELETED: 'Invoice deleted',
  AR_RECEIPT: 'Money received',
  AP_EXPENSE_APPROVED: 'Expense approved',
  AP_EXPENSE_AMENDED: 'Expense amended',
  AP_EXPENSE_RETAGGED: 'Expense retagged',
  AP_EXPENSE_UNAPPROVED: 'Expense unapproved',
  AP_EXPENSE_DELETED: 'Expense deleted',
  AP_BILL_CREATED: 'AP bill created',
  AP_BILL_PAID: 'AP bill paid',
  WALLET_TOP_UP: 'Wallet top-up',
  WALLET_REFUND: 'Wallet refund',
  WALLET_ADJUSTMENT: 'Wallet adjustment',
  WALLET_DEDUCTION: 'Wallet deduction',
  PAYROLL_RUN_APPROVED: 'Payroll approved',
  PAYROLL_RUN_AMENDED: 'Payroll amended',
  PAYROLL_RUN_RETAGGED: 'Payroll retagged',
  PAYROLL_RUN_UNAPPROVED: 'Payroll unapproved',
  PAYROLL_RUN_PAID: 'Payroll paid',
  BANK_TXN: 'Bank line',
  BANK_TXN_AMENDED: 'Bank line amended',
  BANK_TXN_DELETED: 'Bank line deleted',
  VAT_POSTED: 'VAT posted',
  VAT_UNPOSTED: 'VAT unposted',
  COMMISSION_ACCRUED: 'Commission earned',
  COMMISSION_AMENDED: 'Commission amended',
  COMMISSION_UNACCRUED: 'Commission withdrawn',
  REIMBURSEMENT: 'Reimbursement',
  CAPTURE_FAILED: 'Capture failed',
};

const SOURCES = {
  invoices: 'Invoices',
  accountsReceivable: 'Receivables',
  expenses: 'Expenses',
  accountsPayable: 'Payables',
  walletTransactions: 'Wallets',
  payrollRuns: 'Payroll',
  bankTransactions: 'Bank',
  vatTransactions: 'VAT',
  commissions: 'Commissions',
  fahReimbursements: 'Reimbursements',
};

/** "12 posted · 1 failed" from an engine result. */
export function engineSummary(r, t) {
  if (!r) return '';
  const parts = [
    r.posted && t('postings.engine.posted', '{{n}} posted', { n: r.posted }),
    r.ignored && t('postings.engine.ignored', '{{n}} ignored', { n: r.ignored }),
    r.waiting && t('postings.engine.waiting', '{{n}} waiting', { n: r.waiting }),
    r.failed && t('postings.engine.failed', '{{n}} failed', { n: r.failed }),
    r.superseded && t('postings.engine.superseded', '{{n}} superseded', { n: r.superseded }),
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : t('postings.engine.nothing', 'Nothing to process');
}

// ----------------------------------------------------------------------

export function PostingsEvents({ me }) {
  const { t } = useFahT();
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [pageNo, setPageNo] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [openId, setOpenId] = useState(null);
  const [running, setRunning] = useState(false);

  const { events, total, counts, error, loading, validating } = useFahEvents({
    status: status || undefined,
    sourceTable: source || undefined,
    offset: pageNo * rowsPerPage,
    limit: rowsPerPage,
  });
  const countOf = (s) => {
    if (!s) return counts.reduce((sum, c) => sum + c.count, 0);
    if (s === 'PROBLEMS')
      return counts
        .filter((c) => ['FAILED', 'WAITING'].includes(c.status))
        .reduce((sum, c) => sum + c.count, 0);
    return counts.find((c) => c.status === s)?.count ?? 0;
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      toast.success(engineSummary(await runEngine(false), t));
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ md: 'center' }}
        sx={{ p: 2.5 }}
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexGrow: 1 }}>
          {FILTERS.map((s) => {
            const active = s === status;
            const label = !s
              ? t('postings.events.all', 'All')
              : s === 'PROBLEMS'
                ? t('postings.events.problems', 'Problems')
                : t(`postings.status.${s}`, EVENT_STATUS[s].label);
            return (
              <Chip
                key={s || 'all'}
                component={m.div}
                whileTap={{ scale: 0.95 }}
                clickable
                color={active ? (s === 'PROBLEMS' ? 'error' : 'primary') : 'default'}
                variant={active ? 'filled' : 'outlined'}
                label={`${label} · ${countOf(s)}`}
                onClick={() => {
                  setStatus(s);
                  setPageNo(0);
                }}
              />
            );
          })}
        </Stack>
        <TextField
          select
          size="small"
          label={t('postings.events.source', 'Source')}
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPageNo(0);
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">{t('postings.events.allSources', 'All sources')}</MenuItem>
          {Object.entries(SOURCES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {t(`postings.sources.${k}`, v)}
            </MenuItem>
          ))}
        </TextField>
        {me.canControl && (
          <LoadingButton
            variant="contained"
            loading={running}
            onClick={handleRun}
            startIcon={<Iconify icon="solar:play-circle-bold" />}
            sx={{ flexShrink: 0 }}
          >
            {t('postings.events.run', 'Run engine now')}
          </LoadingButton>
        )}
      </Stack>

      <Box sx={{ height: 2 }}>{(loading || validating) && <LinearProgress />}</Box>
      {error && (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
          {fahError(error)}
        </Alert>
      )}

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 980 }}>
          <TableHead>
            <TableRow>
              <TableCell width={70}>#</TableCell>
              <TableCell>{t('postings.events.event', 'Event')}</TableCell>
              <TableCell>{t('postings.events.sourceCol', 'Source')}</TableCell>
              <TableCell align="right">{t('postings.events.amount', 'Amount')}</TableCell>
              <TableCell>{t('postings.events.status', 'Status')}</TableCell>
              <TableCell>{t('postings.events.problem', 'Problem')}</TableCell>
              <TableCell>{t('postings.events.when', 'When')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((ev, index) => {
              const st = EVENT_STATUS[ev.status] ?? EVENT_STATUS.PENDING;
              return (
                <TableRow
                  key={ev.id}
                  hover
                  component={m.tr}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(index, 12) * 0.015 }}
                  onClick={() => setOpenId(ev.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ color: 'text.secondary' }}>{ev.id}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {t(
                        `postings.event.${ev.eventType}`,
                        EVENT_LABEL[ev.eventType] ?? ev.eventType
                      )}
                    </Typography>
                    {ev.backfill && (
                      <Chip
                        size="small"
                        variant="soft"
                        label={t('postings.events.backfill', 'backfill')}
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="body2" noWrap>
                      {ev.label}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fAmount(ev.amount)}
                  </TableCell>
                  <TableCell>
                    <Label variant="soft" color={st.color}>
                      {t(`postings.status.${ev.status}`, st.label)}
                    </Label>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>
                    {ev.error && (
                      <Tooltip title={ev.error}>
                        <Typography variant="caption" color="error.main" noWrap component="div">
                          {ev.error}
                        </Typography>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography variant="caption" component="div">
                      {fDateTime(ev.occurredAt)}
                    </Typography>
                    {ev.processedAt && (
                      <Typography variant="caption" color="text.disabled" component="div">
                        {fDateTime(ev.processedAt)}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {!loading && !events.length && (
        <EmptyContent
          title={t('postings.events.empty', 'No events here')}
          description={t(
            'postings.events.emptyHelp',
            'Approving an invoice or expense, paying one, running payroll or importing a bank statement creates an event here.'
          )}
          sx={{ py: 8 }}
        />
      )}

      <TablePagination
        component="div"
        count={total}
        page={pageNo}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[25, 50, 100]}
        onPageChange={(e, p) => setPageNo(p)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(Number(e.target.value));
          setPageNo(0);
        }}
      />

      <EventDrawer id={openId} me={me} onClose={() => setOpenId(null)} />
    </Card>
  );
}

// ----------------------------------------------------------------------

function EventDrawer({ id, me, onClose }) {
  const { t } = useFahT();
  const { detail, loading, error } = useFahEvent(id);
  const [busy, setBusy] = useState(false);
  const [ignoreOpen, setIgnoreOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [showSnapshot, setShowSnapshot] = useState(false);

  const ev = detail?.event;
  const sim = detail?.simulation;
  const problem = ev && ['FAILED', 'WAITING'].includes(ev.status);
  const openable = ev && ['PENDING', 'FAILED', 'WAITING'].includes(ev.status);

  const handleRetry = async () => {
    setBusy(true);
    try {
      toast.success(engineSummary(await retryEvent(ev.id), t));
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleIgnore = async () => {
    setBusy(true);
    try {
      await ignoreEvent(ev.id, reason.trim());
      toast.success(t('postings.drawer.ignored', 'Event ignored'));
      setIgnoreOpen(false);
      setReason('');
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={!!id}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: 1, sm: 560, md: 720 } } }}
    >
      <Stack direction="row" alignItems="center" sx={{ p: 2.5, pb: 1.5 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {ev
            ? `#${ev.id} · ${t(`postings.event.${ev.eventType}`, EVENT_LABEL[ev.eventType] ?? ev.eventType)}`
            : t('postings.drawer.title', 'Event')}
        </Typography>
        <IconButton onClick={onClose}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Stack>
      <Box sx={{ height: 2 }}>{loading && <LinearProgress />}</Box>

      <Box sx={{ p: 2.5, pt: 1, overflowY: 'auto' }}>
        {error && <Alert severity="error">{fahError(error)}</Alert>}
        {ev && (
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Label variant="soft" color={(EVENT_STATUS[ev.status] ?? EVENT_STATUS.PENDING).color}>
                {t(
                  `postings.status.${ev.status}`,
                  (EVENT_STATUS[ev.status] ?? EVENT_STATUS.PENDING).label
                )}
              </Label>
              {ev.backfill && (
                <Chip
                  size="small"
                  variant="soft"
                  label={t('postings.events.backfill', 'backfill')}
                />
              )}
              <Typography variant="body2" color="text.secondary">
                {ev.label}
              </Typography>
            </Stack>

            {ev.error && (
              <Alert severity={ev.status === 'WAITING' ? 'warning' : 'error'}>{ev.error}</Alert>
            )}
            {ev.resolution && (
              <Alert severity="info">
                {ev.resolution}
                {ev.resolvedBy ? ` · ${ev.resolvedBy}` : ''}
              </Alert>
            )}

            {(problem || openable) && (
              <Stack direction="row" spacing={1}>
                {problem && me.canPrepare && (
                  <LoadingButton
                    variant="contained"
                    loading={busy}
                    onClick={handleRetry}
                    startIcon={<Iconify icon="solar:restart-bold" />}
                  >
                    {t('postings.drawer.retry', 'Retry')}
                  </LoadingButton>
                )}
                {openable && me.canControl && (
                  <Button
                    color="inherit"
                    variant="outlined"
                    disabled={busy}
                    onClick={() => setIgnoreOpen(true)}
                  >
                    {t('postings.drawer.ignore', 'Ignore')}
                  </Button>
                )}
              </Stack>
            )}

            {detail.journals.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('postings.drawer.journals', 'Journals')}
                </Typography>
                <Stack spacing={0.75}>
                  {detail.journals.map((j) => (
                    <Stack key={j.id} direction="row" spacing={1} alignItems="center">
                      <Link
                        component={RouterLink}
                        href={paths.dashboard.finance.accounting.journal(j.id)}
                        variant="body2"
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {j.journalNumber ?? j.id.slice(0, 8)}
                      </Link>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        noWrap
                        sx={{ flexGrow: 1 }}
                      >
                        {j.description}
                      </Typography>
                      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {fAmount(j.totalDebit)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                {t('postings.drawer.simulation', 'What the rule posts now')}
              </Typography>
              {sim?.kind === 'post' ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {[sim.book, sim.journalDate, sim.description].filter(Boolean).join(' · ')}
                  </Typography>
                  {sim.review && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                      {sim.review}
                    </Alert>
                  )}
                  {sim.reverses?.length > 0 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="div"
                      sx={{ mb: 1 }}
                    >
                      {t(
                        'postings.drawer.reversesFirst',
                        'First reverses what this source posted before.'
                      )}
                    </Typography>
                  )}
                  <SimulationTable lines={sim.lines} />
                </>
              ) : (
                <Alert severity={sim?.kind === 'fail' ? 'error' : 'info'}>
                  {sim?.kind === 'reverse'
                    ? t(
                        'postings.drawer.reverseOnly',
                        'This event only reverses what its source posted.'
                      )
                    : sim?.reason || '—'}
                </Alert>
              )}
            </Box>

            <Box>
              <Button
                size="small"
                color="inherit"
                onClick={() => setShowSnapshot((v) => !v)}
                startIcon={
                  <Iconify
                    icon={
                      showSnapshot ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'
                    }
                  />
                }
              >
                {t('postings.drawer.snapshot', 'ERP row as captured')}
              </Button>
              <Collapse in={showSnapshot}>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    mt: 1,
                    p: 1.5,
                    maxHeight: 360,
                    overflow: 'auto',
                    borderRadius: 1,
                    typography: 'caption',
                    fontFamily: 'monospace',
                    bgcolor: 'background.neutral',
                  }}
                >
                  {detail.snapshot}
                  {detail.payload && detail.payload !== '{}' ? `\n\npayload ${detail.payload}` : ''}
                </Box>
              </Collapse>
            </Box>
          </Stack>
        )}
      </Box>

      <Dialog
        open={ignoreOpen}
        onClose={busy ? undefined : () => setIgnoreOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t('postings.drawer.ignoreTitle', 'Ignore this event?')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t(
              'postings.drawer.ignoreHelp',
              'It will not post. Say why, for example that it was posted by hand as a journal.'
            )}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            label={t('postings.drawer.reason', 'Reason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setIgnoreOpen(false)} disabled={busy}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <LoadingButton
            variant="contained"
            loading={busy}
            disabled={!reason.trim()}
            onClick={handleIgnore}
          >
            {t('postings.drawer.ignore', 'Ignore')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}

function SimulationTable({ lines }) {
  const { t } = useFahT();
  const dr = lines.reduce((s, l) => s + Number(l.debit) * Number(l.exchangeRate || 1), 0);
  const cr = lines.reduce((s, l) => s + Number(l.credit) * Number(l.exchangeRate || 1), 0);
  return (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 520 }}>
        <TableHead>
          <TableRow>
            <TableCell>{t('postings.drawer.account', 'Account')}</TableCell>
            <TableCell align="right">{t('postings.drawer.debit', 'Debit')}</TableCell>
            <TableCell align="right">{t('postings.drawer.credit', 'Credit')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((l, i) => (
            <TableRow key={i}>
              <TableCell>
                <Typography variant="body2">
                  <Box
                    component="span"
                    sx={{ fontFamily: 'monospace', color: 'text.secondary', mr: 1 }}
                  >
                    {l.accountCode}
                  </Box>
                  {l.accountName}
                </Typography>
                {(l.dimensions?.length > 0 || l.memo) && (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                    {l.dimensions.map((d) => (
                      <Chip
                        key={d}
                        size="small"
                        variant="soft"
                        label={d}
                        sx={{ fontFamily: 'monospace' }}
                      />
                    ))}
                    {l.memo && (
                      <Typography variant="caption" color="text.secondary">
                        {l.memo}
                      </Typography>
                    )}
                  </Stack>
                )}
              </TableCell>
              {['debit', 'credit'].map((k) => (
                <TableCell
                  key={k}
                  align="right"
                  sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                >
                  {fAmount(l[k], { blankZero: true })}
                  {Number(l[k]) > 0 && l.txnCurrency !== 'SAR' && (
                    <Typography variant="caption" color="text.disabled" component="div">
                      {l.txnCurrency} × {Number(l.exchangeRate)}
                    </Typography>
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
          <TableRow sx={{ '& td': { fontWeight: 600, borderBottom: 0 } }}>
            <TableCell>{t('postings.drawer.total', 'Total (SAR)')}</TableCell>
            <TableCell align="right">{fAmount(dr)}</TableCell>
            <TableCell align="right">{fAmount(cr)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
