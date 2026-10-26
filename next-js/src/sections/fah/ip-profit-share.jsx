'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDateTime } from 'src/utils/format-time';

import {
  fahError,
  usePeriods,
  useFahCatalog,
  postProfitShare,
  useProfitShareRuns,
  useProfitSharePreview,
  useProfitShareAgreements,
  createProfitShareAgreement,
  approveProfitShareAgreement,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { useFahT } from './fah-gate';
import { today, fAmount } from './fah-labels';

// ----------------------------------------------------------------------

const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const BASIS = {
  GROSS_MARGIN: 'Gross margin (revenue − direct cost)',
  CONTRIBUTION_MARGIN: 'Contribution (gross margin − engagement opex)',
  REVENUE: 'Revenue',
};
const FREQUENCY = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ON_CLOSE: 'Once, on close' };
const STATUS_COLOR = {
  DRAFT: 'warning',
  ACTIVE: 'success',
  SUPERSEDED: 'default',
  ENDED: 'default',
};

/** Profit share on engagements (§9.2): agreements by version, then monthly true-ups. */
export function IpProfitShare({ me }) {
  return (
    <Stack spacing={3}>
      <Agreements me={me} />
      <Run me={me} />
      <Runs />
    </Stack>
  );
}

function Agreements({ me }) {
  const { t } = useFahT();
  const { agreements, error, loading } = useProfitShareAgreements();
  const { practices, engagements } = useFahCatalog();
  const [open, setOpen] = useState(false);
  const code = (id) => practices.find((p) => p.id === id)?.code ?? id;

  const approve = async (v, as) => {
    try {
      const row = await approveProfitShareAgreement(v.id, as);
      toast.success(
        row.status === 'ACTIVE'
          ? t('ps.active', 'Approved: version {{v}} now applies', { v: row.version })
          : t('ps.approved', 'Approved')
      );
    } catch (err) {
      toast.error(fahError(err));
    }
  };

  return (
    <Card>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        sx={{ p: 2.5 }}
      >
        <div>
          <Typography variant="subtitle1">
            {t('ps.agreements', 'Profit-share agreements')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(
              'ps.agreementsHelp',
              'How an engagement’s result is shared. A new version applies from its date once each participant’s lead and a controller approve; earlier months keep the version they were earned under.'
            )}
          </Typography>
        </div>
        {me.canPrepare && (
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setOpen(true)}
          >
            {t('ps.new', 'New agreement or version')}
          </Button>
        )}
      </Stack>
      {loading && <LinearProgress />}
      {error && (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
          {fahError(error)}
        </Alert>
      )}
      {!loading && !agreements.length ? (
        <EmptyContent title={t('ps.none', 'No profit-share agreements')} sx={{ py: 6 }} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('ps.engagement', 'Engagement')}</TableCell>
              <TableCell>{t('ps.version', 'Version')}</TableCell>
              <TableCell>{t('ps.shares', 'Shares')}</TableCell>
              <TableCell>{t('ps.basis', 'Basis')}</TableCell>
              <TableCell>{t('ps.dates', 'Applies')}</TableCell>
              <TableCell>{t('ps.status', 'Status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {agreements.map((v) => {
              const e = engagements.find((x) => x.id === v.engagementId);
              const leadFor = (v.missing ?? [])
                .filter((m) => m.startsWith('lead:'))
                .map((m) => m.slice(5))
                .filter((p) => (me.leadPractices ?? []).includes(p));
              return (
                <TableRow key={v.id} sx={{ verticalAlign: 'top' }}>
                  <TableCell>{e ? `${e.code} ${e.name}` : ''}</TableCell>
                  <TableCell>v{v.version}</TableCell>
                  <TableCell>
                    {v.participants.map((p) => (
                      <Typography key={p.practiceId} variant="body2">
                        {code(p.practiceId)} {Number(p.sharePercent)} %
                        {p.practiceId === v.ownerPracticeId ? ` (${t('ps.owner', 'owner')})` : ''}
                      </Typography>
                    ))}
                  </TableCell>
                  <TableCell>
                    {BASIS[v.basis].split(' (')[0]} · {FREQUENCY[v.frequency].toLowerCase()}
                    {v.shareLosses ? ` · ${t('ps.losses', 'losses shared')}` : ''}
                  </TableCell>
                  <TableCell sx={num}>
                    {v.effectiveFrom} → {v.effectiveTo ?? '…'}
                  </TableCell>
                  <TableCell>
                    <Label variant="soft" color={STATUS_COLOR[v.status]}>
                      {v.status.toLowerCase()}
                    </Label>
                    {v.status === 'DRAFT' && (
                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {t('ps.needs', 'Needs: {{list}}', {
                            list: (v.missing ?? [])
                              .map((m) =>
                                m === 'controller' ? 'controller' : `${code(m.slice(5))} lead`
                              )
                              .join(', '),
                          })}
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {leadFor.map((p) => (
                            <Button key={p} size="small" onClick={() => approve(v, p)}>
                              {t('ps.approveAs', 'Approve for {{code}}', { code: code(p) })}
                            </Button>
                          ))}
                          {me.canControl &&
                            (v.missing ?? []).includes('controller') &&
                            v.createdBy?.toLowerCase() !== me.email && (
                              <Button size="small" onClick={() => approve(v, 'controller')}>
                                {t('ps.approveController', 'Approve as controller')}
                              </Button>
                            )}
                        </Stack>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <AgreementDialog
        open={open}
        onClose={() => setOpen(false)}
        practices={practices}
        engagements={engagements}
      />
    </Card>
  );
}

function AgreementDialog({ open, onClose, practices, engagements }) {
  const { t, nameOf } = useFahT();
  const centres = practices.filter((p) => p.isRevenueCentre && p.isActive);
  const [engagementId, setEngagementId] = useState('');
  const [shares, setShares] = useState({});
  const [basis, setBasis] = useState('GROSS_MARGIN');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [shareLosses, setShareLosses] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [busy, setBusy] = useState(false);
  const engagement = engagements.find((e) => e.id === engagementId);
  const total = Object.values(shares).reduce((a, b) => a + (Number(b) || 0), 0);

  useEffect(() => {
    if (engagement)
      setShares((s) => ({
        [engagement.owningPracticeId]: s[engagement.owningPracticeId] ?? '',
        ...s,
      }));
  }, [engagement]);

  const save = async () => {
    setBusy(true);
    try {
      await createProfitShareAgreement({
        engagementId,
        participants: Object.entries(shares)
          .filter(([, v]) => v !== '' && Number(v) >= 0)
          .map(([practiceId, sharePercent]) => ({
            practiceId,
            sharePercent: Number(sharePercent),
          })),
        basis,
        frequency,
        shareLosses,
        effectiveFrom,
      });
      toast.success(t('ps.created', 'Saved as a draft: it applies once approved'));
      onClose();
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>{t('ps.newTitle', 'Profit-share agreement')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            size="small"
            label={t('ps.engagement', 'Engagement')}
            value={engagementId}
            onChange={(e) => {
              setEngagementId(e.target.value);
              setShares({});
            }}
          >
            {engagements
              .filter((e) => e.status !== 'CLOSED')
              .map((e) => (
                <MenuItem key={e.id} value={e.id}>
                  {e.code} · {e.name}
                </MenuItem>
              ))}
          </TextField>
          {engagement && (
            <>
              <Typography variant="body2" color="text.secondary">
                {t(
                  'ps.ownerIs',
                  'Owner (books the revenue and pays the partners): {{name}}. Shares must total 100 %.',
                  {
                    name: nameOf(practices.find((p) => p.id === engagement.owningPracticeId)),
                  }
                )}
              </Typography>
              {centres.map((p) => (
                <TextField
                  key={p.id}
                  size="small"
                  type="number"
                  label={`${nameOf(p)} %`}
                  value={shares[p.id] ?? ''}
                  onChange={(e) => setShares((s) => ({ ...s, [p.id]: e.target.value }))}
                  inputProps={{ min: 0, max: 100, step: 'any' }}
                />
              ))}
              <Typography
                variant="caption"
                color={Math.abs(total - 100) > 0.001 ? 'error.main' : 'success.main'}
              >
                {t('ps.total', 'Total {{n}} %', { n: Math.round(total * 100) / 100 })}
              </Typography>
            </>
          )}
          <TextField
            select
            size="small"
            label={t('ps.basis', 'Basis')}
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
          >
            {Object.entries(BASIS).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {t(`ps.basis.${k}`, v)}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              fullWidth
              size="small"
              label={t('ps.frequency', 'Run')}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              {Object.entries(FREQUENCY).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {t(`ps.frequency.${k}`, v)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              size="small"
              type="date"
              label={t('ps.from', 'Applies from')}
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
          <FormControlLabel
            control={
              <Switch checked={shareLosses} onChange={(e) => setShareLosses(e.target.checked)} />
            }
            label={t(
              'ps.shareLosses',
              'Partners also share losses (otherwise their share never goes below zero)'
            )}
          />
          <Alert severity="info">
            {t(
              'ps.d9',
              'Transfers revenue only (D-9): Dr 4950 owner / Cr 4951 partner. Both cancel in the company result.'
            )}
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          loading={busy}
          disabled={!engagementId || Math.abs(total - 100) > 0.001}
          onClick={save}
        >
          {t('ps.saveDraft', 'Save draft')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

function Run({ me }) {
  const { t, nameOf } = useFahT();
  const { entities, engagements, practices } = useFahCatalog();
  const { agreements } = useProfitShareAgreements();
  const books = entities.filter((e) => e.isActive);
  const withAgreement = engagements.filter((e) =>
    agreements.some((a) => a.engagementId === e.id && a.status !== 'DRAFT')
  );
  const [engagementId, setEngagementId] = useState('');
  const [bookId, setBookId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [periodId, setPeriodId] = useState('');
  const [busy, setBusy] = useState(false);
  const { periods } = usePeriods(bookId || books[0]?.id, year);
  const months = periods.filter((p) => p.periodNo >= 1 && p.periodNo <= 12);
  const book = bookId || books[0]?.id || '';
  const { preview, error, loading } = useProfitSharePreview({
    engagementId,
    legalEntityId: book,
    periodId,
  });
  const code = (id) => practices.find((p) => p.id === id)?.code ?? id;

  const post = async () => {
    setBusy(true);
    try {
      await postProfitShare({
        engagementId,
        legalEntityId: book,
        periodId,
        lastRunId: preview.lastRunId,
      });
      toast.success(t('ps.posted', 'Profit share posted'));
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  const c = preview?.computation;
  return (
    <Card sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        {t('ps.run', 'Run a profit share')}
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          select
          size="small"
          label={t('ps.engagement', 'Engagement')}
          value={engagementId}
          onChange={(e) => setEngagementId(e.target.value)}
          sx={{ minWidth: 260 }}
        >
          {withAgreement.map((e) => (
            <MenuItem key={e.id} value={e.id}>
              {e.code} · {e.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('ps.book', 'Book')}
          value={book}
          onChange={(e) => {
            setBookId(e.target.value);
            setPeriodId('');
          }}
          sx={{ minWidth: 200 }}
        >
          {books.map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {nameOf(b)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          type="number"
          label={t('ps.year', 'Year')}
          value={year}
          onChange={(e) => {
            setYear(Number(e.target.value));
            setPeriodId('');
          }}
          sx={{ width: 110 }}
        />
        <TextField
          select
          size="small"
          label={t('ps.month', 'Month')}
          value={months.some((m) => m.id === periodId) ? periodId : ''}
          onChange={(e) => setPeriodId(e.target.value)}
          sx={{ minWidth: 170 }}
        >
          {months.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              {m.name} · {m.status.toLowerCase().replace('_', ' ')}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {loading && <LinearProgress sx={{ mt: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {fahError(error)}
        </Alert>
      )}
      {c && (
        <Box sx={{ mt: 2.5 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {t(
              'ps.toDate',
              'Engagement to {{date}}: revenue {{rev}}, direct cost {{cost}}, opex {{opex}}',
              {
                date: c.asOf,
                rev: fAmount(c.totals.revenue),
                cost: fAmount(c.totals.directCost),
                opex: fAmount(c.totals.opex),
              }
            )}
          </Typography>
          {c.windows.map((w) => (
            <Typography key={w.versionId} variant="caption" color="text.secondary" component="div">
              v{w.version} ({w.from} → {w.to ?? '…'}): {BASIS[w.basis].split(' (')[0].toLowerCase()}{' '}
              {fAmount(w.basisValue)} over {w.periods.length} month(s)
            </Typography>
          ))}
          {c.partners.length > 0 && (
            <Table size="small" sx={{ mt: 1.5 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('ps.partner', 'Partner')}</TableCell>
                  <TableCell align="right">{t('ps.entitlement', 'Entitled to date')}</TableCell>
                  <TableCell align="right">{t('ps.transferred', 'Transferred before')}</TableCell>
                  <TableCell align="right">{t('ps.delta', 'This run')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {c.partners.map((p) => (
                  <TableRow key={p.practiceId}>
                    <TableCell>
                      {code(c.ownerPracticeId)} → {code(p.practiceId)}
                    </TableCell>
                    <TableCell align="right" sx={num}>
                      {fAmount(p.entitlement)}
                    </TableCell>
                    <TableCell align="right" sx={num}>
                      {fAmount(p.transferred)}
                    </TableCell>
                    <TableCell align="right" sx={num}>
                      <b>{fAmount(p.delta)}</b>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {preview.blocked ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              {preview.blocked}
            </Alert>
          ) : (
            me.canPrepare && (
              <LoadingButton variant="contained" sx={{ mt: 2 }} loading={busy} onClick={post}>
                {t('ps.post', 'Post SAR {{n}}', { n: fAmount(preview.total) })}
              </LoadingButton>
            )
          )}
        </Box>
      )}
    </Card>
  );
}

function Runs() {
  const { t, nameOf } = useFahT();
  const { runs } = useProfitShareRuns();
  const { engagements, entities } = useFahCatalog();
  if (!runs.length) return null;
  return (
    <Card>
      <Typography variant="subtitle1" sx={{ p: 2.5 }}>
        {t('ps.history', 'Profit-share runs')}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('ps.engagement', 'Engagement')}</TableCell>
            <TableCell>{t('ps.book', 'Book')}</TableCell>
            <TableCell>{t('ps.asOf', 'To')}</TableCell>
            <TableCell align="right">{t('ps.amount', 'Transferred')}</TableCell>
            <TableCell>{t('ps.by', 'Posted')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {runs.map((r) => {
            const e = engagements.find((x) => x.id === r.engagementId);
            return (
              <TableRow key={r.id}>
                <TableCell>{e?.code}</TableCell>
                <TableCell>{nameOf(entities.find((b) => b.id === r.legalEntityId))}</TableCell>
                <TableCell sx={num}>{r.computation?.asOf}</TableCell>
                <TableCell align="right" sx={num}>
                  {(r.computation?.partners ?? []).map((p) => fAmount(p.delta)).join(' · ')}
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {r.postedBy}, {fDateTime(r.postedAt)}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
