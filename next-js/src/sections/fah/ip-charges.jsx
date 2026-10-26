'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import {
  fahError,
  useFahCatalog,
  useIpAgreements,
  postIpTransaction,
  useIpTransactions,
  cancelIpTransaction,
  createIpTransaction,
  reopenIpTransaction,
  approveIpTransaction,
  disputeIpTransaction,
  importIpTransactions,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { useFahT } from './fah-gate';
import { today, fAmount } from './fah-labels';

// ----------------------------------------------------------------------

const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const STATUS_COLOR = {
  DRAFT: 'warning',
  POSTED: 'success',
  DISPUTED: 'error',
  CANCELLED: 'default',
};
const CSV_TEMPLATE =
  'agreement,date,grade,employee,quantity,description\nIPA-0001,2026-09-15,Senior,Amal,40,Penetration test week 1\n';

/** Who may act for a practice: its lead, or a controller. */
const actsFor = (me, practiceId) => me.canControl || (me.leadPractices ?? []).includes(practiceId);

/** Charges between practices: entered, approved by both sides, then posted (FR-IP-2). */
export function IpCharges({ me }) {
  const { t, nameOf } = useFahT();
  const [status, setStatus] = useState('');
  const { transactions, error, loading } = useIpTransactions(status);
  const { agreements } = useIpAgreements();
  const { practices, entities, engagements } = useFahCatalog();
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [disputing, setDisputing] = useState(null);
  const [busy, setBusy] = useState('');

  const agreementOf = (tx) => agreements.find((a) => a.id === tx.agreementId);
  const code = (id) => practices.find((p) => p.id === id)?.code ?? '';
  const canEnter = me.canPrepare || agreements.some((a) => actsFor(me, a.providerPracticeId));

  const run = async (key, fn, ok) => {
    setBusy(key);
    try {
      const out = await fn();
      if (out?.problem) toast.warning(out.problem);
      else if (ok) toast.success(ok);
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <Card>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ md: 'center' }}
        sx={{ p: 2.5 }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={status}
          onChange={(e, v) => v !== null && setStatus(v)}
        >
          <ToggleButton value="">{t('ip.all', 'All')}</ToggleButton>
          <ToggleButton value="DRAFT">{t('ip.toApprove', 'To approve')}</ToggleButton>
          <ToggleButton value="DISPUTED">{t('ip.disputed', 'Disputed')}</ToggleButton>
          <ToggleButton value="POSTED">{t('ip.posted', 'Posted')}</ToggleButton>
        </ToggleButtonGroup>
        {canEnter && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:import-bold" />}
              onClick={() => setImporting(true)}
            >
              {t('ip.import', 'Import hours')}
            </Button>
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => setCreating(true)}
              disabled={!agreements.some((a) => a.status === 'ACTIVE')}
            >
              {t('ip.new', 'New charge')}
            </Button>
          </Stack>
        )}
      </Stack>
      {loading && <LinearProgress />}
      {error && (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
          {fahError(error)}
        </Alert>
      )}
      {!loading && !transactions.length ? (
        <EmptyContent
          title={t('ip.noCharges', 'No inter-practice charges')}
          description={t(
            'ip.noChargesHelp',
            'Set up an agreement (and rate cards, unless the price is fixed), then enter or import the hours one practice worked for another.'
          )}
          sx={{ py: 8 }}
        />
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 980 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('ip.date', 'Date')}</TableCell>
                <TableCell>{t('ip.fromTo', 'Provider → consumer')}</TableCell>
                <TableCell>{t('ip.description', 'Description')}</TableCell>
                <TableCell align="right">{t('ip.qty', 'Quantity')}</TableCell>
                <TableCell align="right">{t('ip.amount', 'Amount (SAR)')}</TableCell>
                <TableCell>{t('ip.approvals', 'Approvals')}</TableCell>
                <TableCell>{t('ip.status', 'Status')}</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((tx) => {
                const a = agreementOf(tx);
                const draft = tx.status === 'DRAFT';
                const both = tx.providerApprovedBy && tx.consumerApprovedBy;
                const canSide = (side) =>
                  draft &&
                  a &&
                  actsFor(me, side === 'provider' ? a.providerPracticeId : a.consumerPracticeId) &&
                  !tx[`${side}ApprovedBy`] &&
                  tx.createdBy?.toLowerCase() !== me.email &&
                  tx[
                    `${side === 'provider' ? 'consumer' : 'provider'}ApprovedBy`
                  ]?.toLowerCase() !== me.email;
                return (
                  <TableRow key={tx.id} sx={{ verticalAlign: 'top' }}>
                    <TableCell sx={num}>{tx.transactionDate}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {code(a?.providerPracticeId)} → {code(a?.consumerPracticeId)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a?.code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{tx.description}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[tx.grade, tx.employeeName, tx.pricing?.explanation]
                          .filter(Boolean)
                          .join(' · ')}
                      </Typography>
                      {tx.disputeReason && tx.status === 'DISPUTED' && (
                        <Typography variant="caption" color="error.main" component="div">
                          {t('ip.disputedBy', 'Disputed by {{who}}: {{why}}', {
                            who: tx.disputedBy,
                            why: tx.disputeReason,
                          })}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={num}>
                      {Number(tx.quantity)} {tx.unit.toLowerCase()}
                    </TableCell>
                    <TableCell align="right" sx={num}>
                      {fAmount(tx.amount)}
                    </TableCell>
                    <TableCell>
                      {['provider', 'consumer'].map((side) => (
                        <Typography key={side} variant="caption" component="div">
                          {side === 'provider'
                            ? t('ip.provider', 'Provider')
                            : t('ip.consumer', 'Consumer')}
                          :{' '}
                          {tx[`${side}ApprovedBy`] ? (
                            <b>{tx[`${side}ApprovedBy`]}</b>
                          ) : canSide(side) ? (
                            <Link
                              component="button"
                              disabled={!!busy}
                              onClick={() =>
                                run(
                                  tx.id,
                                  () => approveIpTransaction(tx.id, side),
                                  t('ip.approved', 'Approved')
                                )
                              }
                            >
                              {t('ip.approve', 'approve')}
                            </Link>
                          ) : (
                            <span style={{ opacity: 0.6 }}>{t('ip.pending', 'pending')}</span>
                          )}
                        </Typography>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Label variant="soft" color={STATUS_COLOR[tx.status]}>
                        {tx.status === 'POSTED'
                          ? tx.internalInvoiceNumber
                          : tx.status.toLowerCase()}
                      </Label>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {tx.status === 'POSTED' && (
                        <>
                          <Tooltip title={t('ip.invoice', 'Internal invoice (PDF)')}>
                            <Button
                              size="small"
                              color="inherit"
                              onClick={() =>
                                downloadInternalInvoice({
                                  tx,
                                  agreement: a,
                                  provider: practices.find((p) => p.id === a?.providerPracticeId),
                                  consumer: practices.find((p) => p.id === a?.consumerPracticeId),
                                  engagement: engagements.find((e) => e.id === a?.engagementId),
                                  book: entities.find((e) => e.id === tx.legalEntityId),
                                  nameOf,
                                }).catch((err) => toast.error(fahError(err)))
                              }
                            >
                              PDF
                            </Button>
                          </Tooltip>
                          {tx.journalId && (
                            <Button
                              size="small"
                              color="inherit"
                              component={RouterLink}
                              href={paths.dashboard.finance.accounting.journal(tx.journalId)}
                            >
                              {t('ip.journal', 'Journal')}
                            </Button>
                          )}
                        </>
                      )}
                      {draft && both && me.canPrepare && (
                        <LoadingButton
                          size="small"
                          loading={busy === tx.id}
                          onClick={() =>
                            run(tx.id, () => postIpTransaction(tx.id), t('ip.postedOk', 'Posted'))
                          }
                        >
                          {t('ip.post', 'Post')}
                        </LoadingButton>
                      )}
                      {draft &&
                        a &&
                        (actsFor(me, a.providerPracticeId) ||
                          actsFor(me, a.consumerPracticeId)) && (
                          <Button size="small" color="error" onClick={() => setDisputing(tx)}>
                            {t('ip.dispute', 'Dispute')}
                          </Button>
                        )}
                      {tx.status === 'DISPUTED' && me.canPrepare && (
                        <Button
                          size="small"
                          onClick={() =>
                            run(
                              tx.id,
                              () => reopenIpTransaction(tx.id, {}),
                              t('ip.reopened', 'Back to draft')
                            )
                          }
                        >
                          {t('ip.reopen', 'Reopen')}
                        </Button>
                      )}
                      {['DRAFT', 'DISPUTED'].includes(tx.status) && me.canPrepare && (
                        <Button
                          size="small"
                          color="inherit"
                          onClick={() =>
                            run(
                              tx.id,
                              () => cancelIpTransaction(tx.id),
                              t('ip.cancelled', 'Cancelled')
                            )
                          }
                        >
                          {t('ip.cancel', 'Cancel')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Typography variant="caption" color="text.secondary" component="div" sx={{ p: 2 }}>
        {t(
          'ip.rule',
          'Each side is approved by that practice’s lead or a controller, never by the person who entered the charge, and the two sides by different people. Once both approve, it posts: Dr 5900 to the consumer, Cr 4900 to the provider, on the engagement.'
        )}
      </Typography>

      <NewChargeDialog
        open={creating}
        onClose={() => setCreating(false)}
        agreements={agreements}
        practices={practices}
      />
      <ImportDialog open={importing} onClose={() => setImporting(false)} />
      <DisputeDialog tx={disputing} onClose={() => setDisputing(null)} />
    </Card>
  );
}

function NewChargeDialog({ open, onClose, agreements, practices }) {
  const { t } = useFahT();
  const active = agreements.filter((a) => a.status === 'ACTIVE');
  const [form, setForm] = useState({
    agreementId: '',
    transactionDate: today(),
    grade: '',
    employeeName: '',
    quantity: '',
    description: '',
  });
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const code = (id) => practices.find((p) => p.id === id)?.code ?? '';
  const a = active.find((x) => x.id === form.agreementId);

  const save = async () => {
    setBusy(true);
    try {
      const tx = await createIpTransaction({ ...form, quantity: Number(form.quantity) });
      toast.success(
        t('ip.created', 'Charge entered: SAR {{amount}}, waiting for both approvals', {
          amount: fAmount(tx.amount),
        })
      );
      set({ quantity: '', description: '', employeeName: '' });
      onClose();
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>{t('ip.newTitle', 'New inter-practice charge')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            size="small"
            label={t('ip.agreement', 'Agreement')}
            value={form.agreementId}
            onChange={(e) => set({ agreementId: e.target.value })}
          >
            {active.map((x) => (
              <MenuItem key={x.id} value={x.id}>
                {x.code} · {code(x.providerPracticeId)} → {code(x.consumerPracticeId)} ·{' '}
                {x.pricingBasis.replace('_', ' ').toLowerCase()}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              size="small"
              type="date"
              label={t('ip.date', 'Date')}
              value={form.transactionDate}
              onChange={(e) => set({ transactionDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="number"
              label={
                a
                  ? t('ip.qtyOf', 'Quantity ({{unit}}s)', { unit: a.unit.toLowerCase() })
                  : t('ip.qty', 'Quantity')
              }
              value={form.quantity}
              onChange={(e) => set({ quantity: e.target.value })}
              inputProps={{ min: 0, step: 'any' }}
            />
          </Stack>
          {a?.pricingBasis !== 'FIXED' && (
            <TextField
              size="small"
              label={t('ip.grade', 'Grade (from the provider’s rate card)')}
              value={form.grade}
              onChange={(e) => set({ grade: e.target.value })}
            />
          )}
          <TextField
            size="small"
            label={t('ip.employee', 'Employee (optional)')}
            value={form.employeeName}
            onChange={(e) => set({ employeeName: e.target.value })}
          />
          <TextField
            size="small"
            label={t('ip.description', 'Description')}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          loading={busy}
          disabled={!form.agreementId || !(Number(form.quantity) > 0) || !form.description.trim()}
          onClick={save}
        >
          {t('ip.enter', 'Enter charge')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

function ImportDialog({ open, onClose }) {
  const { t } = useFahT();
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const go = async (apply) => {
    setBusy(true);
    try {
      const out = await importIpTransactions(csv, apply);
      setResult(out);
      if (out.applied) {
        toast.success(
          t('ip.imported', '{{n}} charges entered, waiting for approval', { n: out.created })
        );
        setCsv('');
        setResult(null);
        onClose();
      }
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };
  const ok = result && result.rows.every((r) => !r.problem);

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="md" fullWidth>
      <DialogTitle>{t('ip.importTitle', 'Import hours')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t(
              'ip.importHelp',
              'One row per charge: agreement, date, grade, employee, quantity, description. Every row is checked first; nothing is entered unless all are valid.'
            )}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              component="label"
              startIcon={<Iconify icon="solar:upload-bold" />}
            >
              {t('ip.chooseFile', 'Choose CSV')}
              <input
                hidden
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setCsv(await f.text());
                  setResult(null);
                }}
              />
            </Button>
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                setCsv(CSV_TEMPLATE);
                setResult(null);
              }}
            >
              {t('ip.template', 'Use the template')}
            </Button>
          </Stack>
          <TextField
            multiline
            minRows={6}
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setResult(null);
            }}
            sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 13 } }}
          />
          {result && (
            <Box sx={{ maxHeight: 260, overflow: 'auto' }}>
              <Table size="small">
                <TableBody>
                  {result.rows.map((r) => (
                    <TableRow key={r.line}>
                      <TableCell sx={num}>{r.line}</TableCell>
                      <TableCell>{r.agreementCode}</TableCell>
                      <TableCell align="right" sx={num}>
                        {r.amount != null ? fAmount(r.amount) : ''}
                      </TableCell>
                      <TableCell sx={{ color: r.problem ? 'error.main' : 'success.main' }}>
                        {r.problem ?? t('ip.rowOk', 'OK')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton
          variant="outlined"
          loading={busy && !ok}
          disabled={!csv.trim()}
          onClick={() => go(false)}
        >
          {t('ip.check', 'Check')}
        </LoadingButton>
        <LoadingButton
          variant="contained"
          loading={busy && ok}
          disabled={!ok}
          onClick={() => go(true)}
        >
          {t('ip.importGo', 'Enter {{n}} charges', { n: result?.rows.length ?? 0 })}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

function DisputeDialog({ tx, onClose }) {
  const { t } = useFahT();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await disputeIpTransaction(tx.id, reason);
      toast.success(t('ip.disputedOk', 'Disputed: it is held out until reopened or cancelled'));
      setReason('');
      onClose();
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={Boolean(tx)} onClose={() => !busy && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>{t('ip.disputeTitle', 'Dispute this charge?')}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          multiline
          minRows={2}
          sx={{ mt: 1 }}
          label={t('ip.why', 'Why')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton
          color="error"
          variant="contained"
          loading={busy}
          disabled={!reason.trim()}
          onClick={go}
        >
          {t('ip.dispute', 'Dispute')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

/** The internal invoice for a posted charge (FR-IP-1), made in the browser. */
async function downloadInternalInvoice({
  tx,
  agreement,
  provider,
  consumer,
  engagement,
  book,
  nameOf,
}) {
  const { pdf, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer');
  const s = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1B2430' },
    brand: { fontSize: 18, color: '#0065FF', fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
    title: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 24, color: '#0B1F44' },
    muted: { color: '#5B6676' },
    row: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: '#D9DFE8',
      paddingVertical: 6,
    },
    cell: { flex: 1 },
    right: { flex: 1, textAlign: 'right' },
    head: {
      flexDirection: 'row',
      backgroundColor: '#F2F6FD',
      paddingVertical: 6,
      marginTop: 18,
      fontFamily: 'Helvetica-Bold',
    },
    box: { marginTop: 18, flexDirection: 'row', gap: 24 },
    label: { fontSize: 8, color: '#5B6676', textTransform: 'uppercase', marginBottom: 2 },
  });
  const sar = (n) => `SAR ${fAmount(n)}`;
  const doc = (
    <Document title={tx.internalInvoiceNumber}>
      <Page size="A4" style={s.page}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.brand}>IOTA</Text>
          <Text style={s.muted}>Internal · not a tax invoice</Text>
        </View>
        <Text style={s.title}>Internal invoice {tx.internalInvoiceNumber}</Text>
        <Text style={s.muted}>
          {nameOf(book)} · {tx.transactionDate}
        </Text>
        <View style={s.box}>
          <View style={s.cell}>
            <Text style={s.label}>From (provider)</Text>
            <Text>{nameOf(provider)}</Text>
          </View>
          <View style={s.cell}>
            <Text style={s.label}>To (consumer)</Text>
            <Text>{nameOf(consumer)}</Text>
          </View>
          <View style={s.cell}>
            <Text style={s.label}>Engagement</Text>
            <Text>{engagement ? `${engagement.code} ${engagement.name}` : ''}</Text>
          </View>
        </View>
        <View style={s.head}>
          <Text style={[s.cell, { flex: 3 }]}>Description</Text>
          <Text style={s.right}>Quantity</Text>
          <Text style={s.right}>Unit price</Text>
          <Text style={s.right}>Amount</Text>
        </View>
        <View style={s.row}>
          <Text style={[s.cell, { flex: 3 }]}>
            {tx.description}
            {tx.employeeName ? ` (${tx.employeeName})` : ''}
          </Text>
          <Text style={s.right}>{`${Number(tx.quantity)} ${tx.unit.toLowerCase()}`}</Text>
          <Text style={s.right}>{fAmount(tx.unitPrice)}</Text>
          <Text style={s.right}>{fAmount(tx.amount)}</Text>
        </View>
        <View style={[s.row, { borderBottomWidth: 0 }]}>
          <Text style={[s.cell, { flex: 5, fontFamily: 'Helvetica-Bold' }]}>Total</Text>
          <Text style={[s.right, { fontFamily: 'Helvetica-Bold' }]}>{sar(tx.amount)}</Text>
        </View>
        <Text style={[s.muted, { marginTop: 18 }]}>
          Pricing: {tx.pricing?.explanation ?? agreement?.pricingBasis} · Agreement{' '}
          {agreement?.code}
        </Text>
        <Text style={[s.muted, { marginTop: 4 }]}>
          Approved by {tx.providerApprovedBy} (provider) and {tx.consumerApprovedBy} (consumer).
          Posted {tx.postedAt?.slice(0, 10)} by {tx.postedBy}: Dr 5900 Inter-practice cost / Cr 4900
          Inter-practice revenue. Eliminated in the company result.
        </Text>
      </Page>
    </Document>
  );
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${tx.internalInvoiceNumber}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
