'use client';

import { useState, useEffect } from 'react';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
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
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { createManagedDocument } from 'src/actions/document-management';
import {
  fahError,
  usePeriods,
  downloadText,
  exportLedger,
  useAuditPacks,
  useFahCatalog,
  createAuditPack,
  markAuditPackFiled,
  saveAccountMapping,
  useAccountMappings,
  deleteAccountMapping,
} from 'src/actions/fah';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { today } from '../fah-labels';
import { FahGate, useFahT } from '../fah-gate';

// ----------------------------------------------------------------------

/**
 * Accounting → Audit & exports (Phase 6): a month's audit pack (ZIP with a
 * SHA-256 manifest, filed in Document Management), the general-ledger export
 * for an external system, and that system's account codes.
 */
export function AuditView() {
  const { t } = useFahT();
  const [tab, setTab] = useState('pack');
  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('audit.title', 'Audit & exports')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          { name: t('audit.title', 'Audit & exports') },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <FahGate minRank={1}>
        {(me) => (
          <Stack spacing={3}>
            <Tabs value={tab} onChange={(e, v) => setTab(v)}>
              <Tab value="pack" label={t('audit.pack', 'Audit pack')} />
              <Tab value="export" label={t('audit.export', 'Ledger export')} />
              <Tab value="mappings" label={t('audit.mappings', 'External account codes')} />
            </Tabs>
            {tab === 'pack' && <Pack me={me} />}
            {tab === 'export' && <Export />}
            {tab === 'mappings' && <Mappings me={me} />}
          </Stack>
        )}
      </FahGate>
    </DashboardContent>
  );
}

function BookMonth({ value, onChange }) {
  const { t, nameOf } = useFahT();
  const { entities } = useFahCatalog();
  const books = entities.filter((e) => e.isActive);
  const [year, setYear] = useState(new Date().getFullYear());
  const bookId = value.bookId || books[0]?.id || '';
  const { periods } = usePeriods(bookId, year);
  const months = periods.filter((p) => p.periodNo >= 1 && p.periodNo <= 13);

  useEffect(() => {
    if (bookId !== value.bookId) onChange({ ...value, bookId });
  }, [bookId, value, onChange]);

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField
        select
        size="small"
        label={t('audit.book', 'Book')}
        value={bookId}
        onChange={(e) => onChange({ bookId: e.target.value, period: null })}
        sx={{ minWidth: 240 }}
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
        label={t('audit.year', 'Year')}
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        sx={{ width: 110 }}
      />
      <TextField
        select
        size="small"
        label={t('audit.month', 'Month')}
        value={value.period?.id ?? ''}
        onChange={(e) => onChange({ bookId, period: months.find((m) => m.id === e.target.value) })}
        sx={{ minWidth: 220 }}
      >
        {months.map((m) => (
          <MenuItem key={m.id} value={m.id}>
            {m.name} · {m.status.toLowerCase().replace('_', ' ')}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

function Pack({ me }) {
  const { t } = useFahT();
  const { entities } = useFahCatalog();
  const [sel, setSel] = useState({ bookId: '', period: null });
  const [busy, setBusy] = useState(false);
  const { packs } = useAuditPacks(sel.period?.id);
  const book = entities.find((e) => e.id === sel.bookId);

  const make = async () => {
    setBusy(true);
    try {
      const pack = await createAuditPack(sel.bookId, sel.period.id);
      const { zipSync, strToU8 } = await import('fflate');
      const zipped = zipSync(
        Object.fromEntries(pack.files.map((f) => [`${pack.name}/${f.name}`, strToU8(f.content)])),
        { level: 6 }
      );
      const blob = new Blob([zipped], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pack.name}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      // File it: a Report in Document Management, kept unchanged in OneDrive.
      const doc = await createManagedDocument(
        {
          title: `FAH audit pack · ${book?.shortCode ?? ''} · ${sel.period.name}`,
          practice: 5,
          docType: 'RPT',
          classification: 'restricted',
          customerId: null,
          iotaOffice: 'KSA', // HQ finance issues the record; the book is in the title
          notes: `Manifest SHA-256 ${pack.manifestHash}${pack.periodStatus === 'HARD_CLOSED' ? '' : ' · provisional: the month was not hard-closed'}`,
        },
        new File([blob], `${pack.name}.zip`, { type: 'application/zip' }),
        'Financial Accounting Hub audit pack'
      );
      await markAuditPackFiled(pack.id, doc.documentId, 1);
      toast.success(
        t('audit.filed', 'Audit pack downloaded and filed as {{id}}', { id: doc.display })
      );
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card sx={{ p: 2.5 }}>
      <Typography variant="subtitle1">{t('audit.packTitle', 'Audit pack for a month')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t(
          'audit.packHelp',
          'Trial balance (month and year to date), journal register, general ledger, the four statements, chart of accounts, dimensions, posting and allocation rules, inter-practice, profit share, deferred revenue and FX records, the close with its hash and accepted items, finance roles, the audit log and posting exceptions, with a manifest of every file’s SHA-256. It downloads as a ZIP and is filed in Document Management (restricted), where OneDrive keeps it unchanged.'
        )}
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <BookMonth value={sel} onChange={setSel} />
        {me.canPrepare && (
          <LoadingButton
            variant="contained"
            loading={busy}
            disabled={!sel.period}
            startIcon={<Iconify icon="solar:archive-down-minimlistic-bold" />}
            onClick={make}
          >
            {t('audit.make', 'Create audit pack')}
          </LoadingButton>
        )}
      </Stack>
      {sel.period && sel.period.status !== 'HARD_CLOSED' && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t(
            'audit.provisional',
            '{{m}} is not hard-closed: the pack will say it is provisional.',
            { m: sel.period.name }
          )}
        </Alert>
      )}
      {packs.length > 0 && (
        <Table size="small" sx={{ mt: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>{t('audit.created', 'Created')}</TableCell>
              <TableCell>{t('audit.files', 'Files')}</TableCell>
              <TableCell>{t('audit.manifest', 'Manifest SHA-256')}</TableCell>
              <TableCell>{t('audit.document', 'Document')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {packs.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.createdBy}
                  <Typography variant="caption" color="text.secondary" component="div">
                    {fDateTime(p.createdAt)}
                  </Typography>
                </TableCell>
                <TableCell>{p.files.length}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                  {p.manifestHash}
                </TableCell>
                <TableCell>
                  {p.documentId ? (
                    <Link
                      component={RouterLink}
                      href={paths.dashboard.general.documentManagement.details(p.documentId)}
                    >
                      {t('audit.open', 'Open')}
                    </Link>
                  ) : (
                    <Label variant="soft" color="warning">
                      {t('audit.notFiled', 'not filed')}
                    </Label>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function Export() {
  const { t, nameOf } = useFahT();
  const { entities } = useFahCatalog();
  const books = entities.filter((e) => e.isActive);
  const [book, setBook] = useState('');
  const [from, setFrom] = useState(`${today().slice(0, 4)}-01-01`);
  const [to, setTo] = useState(today());
  const [format, setFormat] = useState('generic');
  const [busy, setBusy] = useState(false);
  const [unmapped, setUnmapped] = useState([]);
  const bookId = book || books[0]?.id || '';

  const go = async () => {
    setBusy(true);
    try {
      const out = await exportLedger({ legalEntityId: bookId, fromDate: from, toDate: to, format });
      downloadText(out.csv, out.fileName);
      setUnmapped(out.unmapped);
      toast.success(t('audit.exported', '{{n}} lines exported', { n: out.lines }));
    } catch (err) {
      toast.error(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card sx={{ p: 2.5 }}>
      <Typography variant="subtitle1">{t('audit.exportTitle', 'General ledger export')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t(
          'audit.exportHelp',
          'Every posted line of a book in a date range, as CSV: a generic layout, or Xero’s manual-journal import (amount signed, practice and cost centre as tracking). Accounts use their code in the target system where one is set under External account codes.'
        )}
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <TextField
          select
          size="small"
          label={t('audit.book', 'Book')}
          value={bookId}
          onChange={(e) => setBook(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          {books.map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {nameOf(b)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          type="date"
          label={t('audit.from', 'From')}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          type="date"
          label={t('audit.to', 'To')}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          select
          size="small"
          label={t('audit.format', 'Format')}
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="generic">{t('audit.generic', 'Generic CSV')}</MenuItem>
          <MenuItem value="xero">Xero</MenuItem>
        </TextField>
        <LoadingButton
          variant="contained"
          loading={busy}
          onClick={go}
          startIcon={<Iconify icon="solar:export-bold" />}
        >
          {t('audit.download', 'Download')}
        </LoadingButton>
      </Stack>
      {unmapped.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {t(
            'audit.unmapped',
            'No code in the target system for {{list}}: their FAH code was used.',
            { list: unmapped.join(', ') }
          )}
        </Alert>
      )}
    </Card>
  );
}

function Mappings({ me }) {
  const { t, nameOf } = useFahT();
  const { accounts } = useFahCatalog();
  const { mappings } = useAccountMappings();
  const [form, setForm] = useState({
    externalSystem: 'xero',
    accountId: '',
    externalAccountCode: '',
  });
  const postable = accounts.filter((a) => a.type === 'POSTING' && a.class !== 'STATISTICAL');
  const code = (id) => accounts.find((a) => a.id === id);

  const save = async () => {
    try {
      await saveAccountMapping(form);
      setForm((f) => ({ ...f, accountId: '', externalAccountCode: '' }));
      toast.success(t('audit.mappingSaved', 'Saved'));
    } catch (err) {
      toast.error(fahError(err));
    }
  };

  return (
    <Card sx={{ p: 2.5 }}>
      <Typography variant="subtitle1">
        {t('audit.mappingsTitle', 'Account codes in external systems')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t(
          'audit.mappingsHelp',
          'Several FAH accounts may share one external code. Used by the ledger export.'
        )}
      </Typography>
      {me.canControl && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            size="small"
            label={t('audit.system', 'System')}
            value={form.externalSystem}
            onChange={(e) => setForm((f) => ({ ...f, externalSystem: e.target.value }))}
            sx={{ width: 140 }}
          />
          <TextField
            select
            size="small"
            label={t('audit.account', 'FAH account')}
            value={form.accountId}
            onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
            sx={{ minWidth: 300 }}
          >
            {postable.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.code} {nameOf(a)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label={t('audit.externalCode', 'Code there')}
            value={form.externalAccountCode}
            onChange={(e) => setForm((f) => ({ ...f, externalAccountCode: e.target.value }))}
          />
          <Button
            variant="contained"
            disabled={!form.accountId || !form.externalAccountCode.trim()}
            onClick={save}
          >
            {t('audit.add', 'Save')}
          </Button>
        </Stack>
      )}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('audit.system', 'System')}</TableCell>
            <TableCell>{t('audit.account', 'FAH account')}</TableCell>
            <TableCell>{t('audit.externalCode', 'Code there')}</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {mappings.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{m.externalSystem}</TableCell>
              <TableCell>
                {code(m.accountId)?.code} {nameOf(code(m.accountId))}
              </TableCell>
              <TableCell>{m.externalAccountCode}</TableCell>
              <TableCell align="right">
                {me.canControl && (
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() =>
                      deleteAccountMapping(m.id).catch((err) => toast.error(fahError(err)))
                    }
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
