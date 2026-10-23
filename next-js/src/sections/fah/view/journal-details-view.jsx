'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { totpStatus } from 'src/utils/apiHelper';
import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  fahError,
  useJournal,
  postJournal,
  rejectJournal,
  deleteJournal,
  submitJournal,
  useFahCatalog,
  approveJournal,
  reverseJournal,
  withdrawJournal,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { TOTPModal } from 'src/components/totp-modal/TOTPModal';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { FahGate, useFahT } from '../fah-gate';
import { JournalEditor } from './journal-edit-view';
import { today, fAmount, JOURNAL_TYPE, JOURNAL_STATUS, APPROVAL_LEVEL } from '../fah-labels';

// ----------------------------------------------------------------------

export function JournalDetailsView({ id }) {
  const { t } = useFahT();
  return (
    <DashboardContent maxWidth="xl">
      <FahGate minRank={1}>{(me) => <JournalDetails id={id} me={me} t={t} />}</FahGate>
    </DashboardContent>
  );
}

function JournalDetails({ id, t }) {
  const router = useRouter();
  const { nameOf } = useFahT();
  const catalog = useFahCatalog();
  const detail = useJournal(id);
  const { journal, lines, audit, problems, actions, needsOverride, overrideAccounts } = detail;
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState(null); // submit | reject | reverse | delete | post
  const [totpAction, setTotpAction] = useState(null); // approve | post | reverse
  const [busy, setBusy] = useState(false);

  const { user } = useAuthContext();
  const [totpEnabled, setTotpEnabled] = useState(false);
  useEffect(() => {
    if (user?.email) {
      totpStatus(user.email)
        .then(({ totpEnabled: enabled }) => setTotpEnabled(enabled))
        .catch(() => setTotpEnabled(false));
    }
  }, [user?.email]);

  if (detail.loading && !journal)
    return <LinearProgress sx={{ mt: 10, maxWidth: 320, mx: 'auto' }} />;
  if (detail.error || !journal) {
    return (
      <EmptyContent
        filled
        title={t('jd.notFound', 'Journal not found')}
        description={detail.error ? fahError(detail.error) : undefined}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.finance.accounting.journals}
            sx={{ mt: 2 }}
          >
            {t('jd.back', 'Back to journals')}
          </Button>
        }
        sx={{ py: 10 }}
      />
    );
  }

  const st = JOURNAL_STATUS[journal.status] ?? JOURNAL_STATUS.DRAFT;
  const book = catalog.entities.find((e) => e.id === journal.legalEntityId);
  const accountOf = (aid) => catalog.accounts.find((a) => a.id === aid);
  const codeOf = (list, did) => list.find((x) => x.id === did)?.code;

  const run = async (fn, success) => {
    setBusy(true);
    try {
      const result = await fn();
      if (success) toast.success(success);
      setDialog(null);
      return result;
    } catch (err) {
      toast.error(fahError(err));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const heading = journal.journalNumber ?? t('jd.draftHeading', 'Draft journal');

  return (
    <>
      <CustomBreadcrumbs
        heading={heading}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          {
            name: t('nav.journals', 'Journals'),
            href: paths.dashboard.finance.accounting.journals,
          },
          { name: heading },
        ]}
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
            {actions.includes('edit') && !editing && (
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:pen-bold" />}
                onClick={() => setEditing(true)}
              >
                {t('jd.edit', 'Edit')}
              </Button>
            )}
            {actions.includes('delete') && !editing && (
              <Button
                color="error"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                onClick={() => setDialog('delete')}
              >
                {t('jd.delete', 'Delete')}
              </Button>
            )}
            {actions.includes('submit') && !editing && (
              <Button
                variant="contained"
                startIcon={<Iconify icon="custom:send-fill" />}
                disabled={problems.length > 0}
                onClick={() =>
                  needsOverride
                    ? setDialog('submit')
                    : run(
                        async () => {
                          const res = await submitJournal(journal.id, null);
                          if (res.problems?.length)
                            throw new Error(res.problems.map((p) => p.message).join(' '));
                        },
                        t('jd.submitted', 'Submitted for approval')
                      )
                }
              >
                {t('jd.submit', 'Submit for approval')}
              </Button>
            )}
            {actions.includes('withdraw') && (
              <Button
                color="inherit"
                onClick={() =>
                  run(() => withdrawJournal(journal.id), t('jd.withdrawn', 'Back to draft'))
                }
              >
                {t('jd.withdraw', 'Take back')}
              </Button>
            )}
            {actions.includes('reject') && (
              <Button color="error" variant="outlined" onClick={() => setDialog('reject')}>
                {t('jd.reject', 'Reject')}
              </Button>
            )}
            {actions.includes('approve') && (
              <Button
                variant="contained"
                color="success"
                startIcon={<Iconify icon="solar:check-circle-bold" />}
                onClick={() => setTotpAction('approve')}
              >
                {t('jd.approve', 'Approve')}
              </Button>
            )}
            {actions.includes('post') && (
              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:verified-check-bold" />}
                onClick={() => setDialog('post')}
              >
                {t('jd.post', 'Post to ledger')}
              </Button>
            )}
            {actions.includes('reverse') && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<Iconify icon="solar:restart-bold" />}
                onClick={() => setDialog('reverse')}
              >
                {t('jd.reverse', 'Reverse')}
              </Button>
            )}
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 4 } }}
      />

      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <m.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <JournalEditor
              detail={detail}
              onSaved={() => setEditing(false)}
              onCancel={() => setEditing(false)}
            />
          </m.div>
        ) : (
          <m.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Stack spacing={3}>
              <WorkflowCard journal={journal} t={t} />

              {journal.status === 'REJECTED' && (
                <Alert severity="error">
                  {t('jd.rejectedBy', 'Rejected by {{who}}: {{reason}}', {
                    who: journal.rejectedBy,
                    reason: journal.rejectionReason,
                  })}
                </Alert>
              )}
              {problems.length > 0 && (
                <Alert severity="warning">
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    {t('jd.problems', 'Fix these before submitting:')}
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {problems.map((p, i) => (
                      <li key={i}>
                        {p.lineNo
                          ? t('jd.line', 'Line {{n}}: {{message}}', {
                              n: p.lineNo,
                              message: p.message,
                            })
                          : p.message}
                      </li>
                    ))}
                  </Box>
                </Alert>
              )}

              <Box
                sx={{
                  gap: 3,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' },
                }}
              >
                <Card>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2.5 }}>
                    <Label variant="soft" color={st.color} startIcon={<Iconify icon={st.icon} />}>
                      {t(`status.${journal.status}`, st.label)}
                    </Label>
                    <Typography variant="h6" sx={{ flexGrow: 1 }} noWrap>
                      {journal.description}
                    </Typography>
                  </Stack>
                  <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 760 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell width={40}>#</TableCell>
                          <TableCell>{t('jd.account', 'Account')}</TableCell>
                          <TableCell>{t('jd.dimensions', 'Dimensions')}</TableCell>
                          <TableCell align="right">{t('je.debit', 'Debit')}</TableCell>
                          <TableCell align="right">{t('je.credit', 'Credit')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lines.map((l) => {
                          const a = accountOf(l.accountId);
                          const dims = [
                            codeOf(catalog.practices, l.practiceId),
                            codeOf(catalog.costCentres, l.fahCostCentreId),
                            codeOf(catalog.engagements, l.engagementId),
                            l.ipCounterpartyId &&
                              `↔ ${codeOf(catalog.practices, l.ipCounterpartyId)}`,
                          ].filter(Boolean);
                          const foreign = l.txnCurrency !== (book?.functionalCurrency ?? 'SAR');
                          return (
                            <TableRow key={l.id}>
                              <TableCell sx={{ color: 'text.disabled' }}>{l.lineNo}</TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  <Box
                                    component="span"
                                    sx={{ fontFamily: 'monospace', color: 'text.secondary', mr: 1 }}
                                  >
                                    {a?.code}
                                  </Box>
                                  {nameOf(a)}
                                </Typography>
                                {l.memo && (
                                  <Typography variant="caption" color="text.secondary">
                                    {l.memo}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                  {dims.map((d) => (
                                    <Chip
                                      key={d}
                                      size="small"
                                      variant="soft"
                                      label={d}
                                      sx={{ fontFamily: 'monospace' }}
                                    />
                                  ))}
                                </Stack>
                              </TableCell>
                              <Amount
                                value={l.debitFunc}
                                txn={
                                  foreign && Number(l.debitTxn)
                                    ? `${fAmount(l.debitTxn)} ${l.txnCurrency}`
                                    : null
                                }
                              />
                              <Amount
                                value={l.creditFunc}
                                txn={
                                  foreign && Number(l.creditTxn)
                                    ? `${fAmount(l.creditTxn)} ${l.txnCurrency}`
                                    : null
                                }
                              />
                            </TableRow>
                          );
                        })}
                        <TableRow sx={{ '& td': { borderBottom: 0, fontWeight: 600 } }}>
                          <TableCell />
                          <TableCell colSpan={2}>
                            {t('jd.total', 'Total')} ({book?.functionalCurrency ?? 'SAR'})
                          </TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {fAmount(journal.totalDebit)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {fAmount(journal.totalCredit)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>

                <Stack spacing={3}>
                  <Card sx={{ p: 2.5 }}>
                    <Stack spacing={1.25}>
                      <Fact
                        label={t('je.book', 'Book')}
                        value={book ? `${book.shortCode} · ${nameOf(book)}` : '—'}
                      />
                      <Fact
                        label={t('jd.type', 'Type')}
                        value={t(
                          `type.${journal.journalType}`,
                          JOURNAL_TYPE[journal.journalType] ?? journal.journalType
                        )}
                      />
                      <Fact label={t('je.date', 'Journal date')} value={journal.journalDate} />
                      <Fact
                        label={t('je.reference', 'Reference')}
                        value={journal.reference || '—'}
                      />
                      {journal.approvalLevel && (
                        <Fact
                          label={t('jd.approval', 'Approval')}
                          value={t(
                            `approval.${journal.approvalLevel}`,
                            APPROVAL_LEVEL[journal.approvalLevel]
                          )}
                        />
                      )}
                      {journal.controlOverrideReason && (
                        <Fact
                          label={t('jd.override', 'Control-account override')}
                          value={journal.controlOverrideReason}
                        />
                      )}
                      {journal.reversesJournalId && (
                        <Fact
                          label={t('jd.reverses', 'Reverses')}
                          value={
                            <Link
                              component={RouterLink}
                              href={paths.dashboard.finance.accounting.journal(
                                journal.reversesJournalId
                              )}
                            >
                              {t('jd.original', 'The original journal')}
                            </Link>
                          }
                        />
                      )}
                      {journal.reversedByJournalId && (
                        <Fact
                          label={t('jd.reversedBy', 'Reversed by')}
                          value={
                            <Link
                              component={RouterLink}
                              href={paths.dashboard.finance.accounting.journal(
                                journal.reversedByJournalId
                              )}
                            >
                              {t('jd.reversal', 'The reversal journal')}
                            </Link>
                          }
                        />
                      )}
                      {journal.hash && (
                        <Tooltip
                          title={t(
                            'jd.hashHelp',
                            'SHA-256 of the posted lines; the audit pack checks it.'
                          )}
                        >
                          <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                          >
                            {journal.hash}
                          </Typography>
                        </Tooltip>
                      )}
                    </Stack>
                  </Card>

                  <Card sx={{ p: 2.5 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
                      {t('jd.activity', 'Activity')}
                    </Typography>
                    <Stack spacing={1.5} divider={<Divider sx={{ borderStyle: 'dashed' }} />}>
                      {audit.map((e) => (
                        <Box key={e.id}>
                          <Typography variant="subtitle2">
                            {t(
                              `audit.${e.action}`,
                              e.action.replace('journal.', '').replace(/_/g, ' ')
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {e.actor} · {fDateTime(e.at)}
                          </Typography>
                          {e.reason && (
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              {e.reason}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </Card>
                </Stack>
              </Box>
            </Stack>
          </m.div>
        )}
      </AnimatePresence>

      <ReasonDialog
        open={dialog === 'submit'}
        busy={busy}
        title={t('jd.overrideTitle', 'Submit with a control-account override')}
        help={t(
          'jd.overrideHelp',
          '{{accounts}} normally take postings only from the ERP. Say why this entry is made by hand; it is kept in the audit log.',
          {
            accounts: overrideAccounts.join(', '),
          }
        )}
        label={t('jd.reason', 'Reason')}
        action={t('jd.submit', 'Submit for approval')}
        onClose={() => setDialog(null)}
        onConfirm={(reason) =>
          run(
            async () => {
              const res = await submitJournal(journal.id, reason);
              if (res.problems?.length)
                throw new Error(res.problems.map((p) => p.message).join(' '));
            },
            t('jd.submitted', 'Submitted for approval')
          )
        }
      />
      <ReasonDialog
        open={dialog === 'reject'}
        busy={busy}
        title={t('jd.rejectTitle', 'Reject this journal')}
        help={t('jd.rejectHelp', 'The preparer sees your reason and can correct and resubmit.')}
        label={t('jd.reason', 'Reason')}
        action={t('jd.reject', 'Reject')}
        color="error"
        onClose={() => setDialog(null)}
        onConfirm={(reason) =>
          run(() => rejectJournal(journal.id, reason), t('jd.rejected', 'Rejected'))
        }
      />
      <ReasonDialog
        open={dialog === 'reverse'}
        busy={busy}
        withDate
        title={t('jd.reverseTitle', 'Reverse {{number}}', { number: journal.journalNumber })}
        help={t(
          'jd.reverseHelp',
          'A mirror journal is posted on the date you choose and both are linked. The original stays as it is.'
        )}
        label={t('jd.reason', 'Reason')}
        action={t('jd.reverse', 'Reverse')}
        color="warning"
        onClose={() => setDialog(null)}
        onConfirm={(reason, date) => {
          setDialog(null);
          setTotpAction({ kind: 'reverse', reason, date });
        }}
      />
      <ReasonDialog
        open={dialog === 'post'}
        busy={busy}
        noReason
        title={t('jd.postTitle', 'Post to the ledger')}
        help={t(
          'jd.postHelp',
          'Posting gives the journal its number and makes it permanent. Corrections are made by reversing it.'
        )}
        action={t('jd.post', 'Post to ledger')}
        onClose={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          setTotpAction('post');
        }}
      />
      <ReasonDialog
        open={dialog === 'delete'}
        busy={busy}
        noReason
        title={t('jd.deleteTitle', 'Delete this draft?')}
        help={t(
          'jd.deleteHelp',
          'Drafts were never posted; deleting one leaves no trace in the ledger.'
        )}
        action={t('jd.delete', 'Delete')}
        color="error"
        onClose={() => setDialog(null)}
        onConfirm={() =>
          run(() => deleteJournal(journal.id), t('jd.deleted', 'Draft deleted')).then(
            (ok) => ok && router.push(paths.dashboard.finance.accounting.journals)
          )
        }
      />

      <TOTPModal
        open={!!totpAction}
        onClose={() => setTotpAction(null)}
        userId={user?.email}
        totpEnabled={totpEnabled}
        actionLabel={
          totpAction === 'approve'
            ? t('jd.approve', 'Approve')
            : totpAction === 'post'
              ? t('jd.post', 'Post to ledger')
              : t('jd.reverse', 'Reverse')
        }
        onVerified={async () => {
          const action = totpAction;
          setTotpAction(null);
          if (action === 'approve')
            await run(() => approveJournal(journal.id), t('jd.approved', 'Approved'));
          else if (action === 'post')
            await run(() => postJournal(journal.id), t('jd.posted', 'Posted to the ledger'));
          else if (action?.kind === 'reverse') {
            const res = await run(
              () => reverseJournal(journal.id, { date: action.date, reason: action.reason }),
              t('jd.reversedToast', 'Reversal posted')
            );
            if (res?.journal?.id)
              router.push(paths.dashboard.finance.accounting.journal(res.journal.id));
          }
        }}
      />
    </>
  );
}

// ----------------------------------------------------------------------

const STEPS = [
  { key: 'created', field: 'createdBy', at: 'createdAt', label: 'Prepared' },
  { key: 'submitted', field: 'submittedBy', at: 'submittedAt', label: 'Submitted' },
  { key: 'approved', field: 'approvedBy', at: 'approvedAt', label: 'Approved' },
  { key: 'second', field: 'secondApprovedBy', at: 'secondApprovedAt', label: 'CFO approval' },
  { key: 'posted', field: 'postedBy', at: 'postedAt', label: 'Posted' },
];

/** Who did what, in order; the next step pulses. */
function WorkflowCard({ journal, t }) {
  const steps = STEPS.filter((s) => s.key !== 'second' || journal.approvalLevel === 'CFO');
  const nextIndex = steps.findIndex((s) => !journal[s.field]);
  return (
    <Card sx={{ p: 2.5 }}>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr 1fr', md: `repeat(${steps.length}, 1fr)` },
        }}
      >
        {steps.map((s, i) => {
          const done = !!journal[s.field];
          const next = i === nextIndex && !['REJECTED', 'REVERSED'].includes(journal.status);
          return (
            <Stack key={s.key} direction="row" spacing={1.25} alignItems="flex-start">
              <Box
                component={m.div}
                animate={next ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={next ? { duration: 1.6, repeat: Infinity } : undefined}
                sx={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: done ? 'success.main' : next ? 'warning.lighter' : 'background.neutral',
                  color: done ? 'common.white' : next ? 'warning.darker' : 'text.disabled',
                }}
              >
                <Iconify
                  icon={done ? 'eva:checkmark-fill' : 'solar:clock-circle-outline'}
                  width={16}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2">{t(`step.${s.key}`, s.label)}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap component="div">
                  {journal[s.field] ?? (next ? t('step.waiting', 'Waiting') : '—')}
                </Typography>
                {journal[s.at] && (
                  <Typography variant="caption" color="text.disabled" component="div">
                    {fDateTime(journal[s.at])}
                  </Typography>
                )}
              </Box>
            </Stack>
          );
        })}
      </Box>
    </Card>
  );
}

function Fact({ label, value }) {
  return (
    <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="baseline">
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ textAlign: 'right', minWidth: 0, wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Stack>
  );
}

function Amount({ value, txn }) {
  return (
    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      {fAmount(value, { blankZero: true })}
      {txn && (
        <Typography variant="caption" color="text.disabled" component="div">
          {txn}
        </Typography>
      )}
    </TableCell>
  );
}

/** A confirm dialog with an optional reason and date. */
function ReasonDialog({
  open,
  title,
  help,
  label,
  action,
  color = 'primary',
  noReason,
  withDate,
  busy,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(today());
  useEffect(() => {
    if (open) {
      setReason('');
      setDate(today());
    }
  }, [open]);
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {help}
          </Typography>
          {withDate && (
            <TextField
              type="date"
              label="Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          )}
          {!noReason && (
            <TextField
              autoFocus
              multiline
              minRows={2}
              label={label}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          color={color}
          loading={busy}
          disabled={!noReason && !reason.trim()}
          onClick={() => onConfirm(reason.trim(), date)}
        >
          {action}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
