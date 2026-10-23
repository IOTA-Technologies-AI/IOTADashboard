'use client';

import { useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { fahError, saveJournal, useFahCatalog, useErpCustomers } from 'src/actions/fah';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { FahGate, useFahT } from '../fah-gate';
import { JournalImportDialog } from '../journal-import-dialog';
import { today, fAmount, APPROVAL_LEVEL } from '../fah-labels';
import { newLine, lineTotals, lineFromSaved, JournalLineEditor } from '../journal-line-editor';

// ----------------------------------------------------------------------

/** New journal page. */
export function JournalEditView() {
  const { t } = useFahT();
  const router = useRouter();
  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading={t('je.newTitle', 'New journal')}
        links={[
          {
            name: t('nav.accounting', 'Accounting'),
            href: paths.dashboard.finance.accounting.root,
          },
          {
            name: t('nav.journals', 'Journals'),
            href: paths.dashboard.finance.accounting.journals,
          },
          { name: t('je.new', 'New') },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <FahGate minRank={2}>
        <JournalEditor
          onSaved={(detail) =>
            router.push(paths.dashboard.finance.accounting.journal(detail.journal.id))
          }
          onCancel={() => router.push(paths.dashboard.finance.accounting.journals)}
        />
      </FahGate>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

/**
 * The journal form, for a new draft or (with `detail`) an existing one.
 * Lines on the left; on the right the header, live totals and who must
 * approve. Saving keeps it a draft; submitting happens on the journal page.
 */
export function JournalEditor({ detail, onSaved, onCancel }) {
  const { t, nameOf } = useFahT();
  const catalog = useFahCatalog();
  const { customers } = useErpCustomers();
  const journal = detail?.journal;

  const firstBook = catalog.entities.find((e) => e.isActive)?.id ?? '';
  const [header, setHeader] = useState(() => ({
    legalEntityId: journal?.legalEntityId ?? '',
    journalDate: journal?.journalDate ?? today(),
    journalType: journal?.journalType ?? 'GENERAL',
    description: journal?.description ?? '',
    reference: journal?.reference ?? '',
  }));
  const [lines, setLines] = useState(() =>
    detail?.lines?.length ? detail.lines.map(lineFromSaved) : [newLine(), newLine()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const bookId = header.legalEntityId || firstBook;
  const book = catalog.entities.find((e) => e.id === bookId);
  const functional = book?.functionalCurrency ?? 'SAR';

  const accountById = useMemo(
    () => new Map(catalog.accounts.map((a) => [a.id, a])),
    [catalog.accounts]
  );
  const postable = useMemo(
    () =>
      catalog.accounts.filter(
        (a) =>
          a.type === 'POSTING' &&
          a.isActive &&
          a.class !== 'STATISTICAL' &&
          (!a.legalEntityId || a.legalEntityId === bookId)
      ),
    [catalog.accounts, bookId]
  );

  const totals = lineTotals(lines, functional);
  const balanced = totals.difference === 0 && totals.debit > 0 && totals.unknown === 0;
  const level =
    totals.debit >= catalog.thresholds.cfo
      ? 'CFO'
      : totals.debit >= catalog.thresholds.controller
        ? 'CONTROLLER'
        : 'ACCOUNTANT';
  const touchesControl = lines.some((l) => {
    const a = accountById.get(l.accountId);
    return a && (a.isControlAccount || !a.allowManualPosting);
  });

  const setLine = (key, next) => setLines((prev) => prev.map((l) => (l.key === key ? next : l)));
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key));

  /** Put the difference on a new line so the journal balances. */
  const balanceIt = () => {
    const d = totals.difference;
    if (!d) return;
    setLines((prev) => [
      ...prev,
      newLine(d > 0 ? { credit: d.toFixed(2) } : { debit: (-d).toFixed(2) }),
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const result = await saveJournal({
        id: journal?.id,
        legalEntityId: bookId,
        journalDate: header.journalDate,
        journalType: header.journalType,
        description: header.description,
        reference: header.reference || null,
        lines: lines
          .filter((l) => l.accountId && (Number(l.debit) || Number(l.credit)))
          .map((l) => ({
            accountId: l.accountId,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            txnCurrency: l.txnCurrency || null,
            exchangeRate: Number(l.exchangeRate) || null,
            practiceId: l.practiceId || null,
            fahCostCentreId: l.fahCostCentreId || null,
            engagementId: l.engagementId || null,
            customerId: l.customerId || null,
            ipCounterpartyId: l.ipCounterpartyId || null,
            memo: l.memo || null,
          })),
      });
      toast.success(t('je.saved', 'Draft saved'));
      onSaved?.(result);
    } catch (err) {
      setError(fahError(err));
    } finally {
      setSaving(false);
    }
  };

  const canSave = !!bookId && !!header.description.trim() && !!header.journalDate;

  return (
    <Box
      sx={{
        gap: 3,
        display: 'grid',
        alignItems: 'flex-start',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' },
      }}
    >
      <Card sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6">{t('je.lines', 'Lines')}</Typography>
          {!journal && (
            <Button
              size="small"
              color="inherit"
              startIcon={<Iconify icon="solar:import-bold" />}
              onClick={() => setImportOpen(true)}
            >
              {t('je.importCsv', 'Import CSV')}
            </Button>
          )}
        </Stack>

        <Stack spacing={1.5}>
          <AnimatePresence initial={false}>
            {lines.map((line, index) => (
              <JournalLineEditor
                key={line.key}
                index={index}
                line={line}
                accounts={postable}
                accountById={accountById}
                catalog={catalog}
                customers={customers}
                functionalCurrency={functional}
                onChange={(next) => setLine(line.key, next)}
                onRemove={() => removeLine(line.key)}
                canRemove={lines.length > 1}
                disabled={saving}
              />
            ))}
          </AnimatePresence>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setLines((prev) => [...prev, newLine()])}
            disabled={saving}
          >
            {t('je.addLine', 'Add line')}
          </Button>
          {totals.difference !== 0 && totals.unknown === 0 && (
            <Button color="inherit" onClick={balanceIt} disabled={saving}>
              {t('je.balanceLine', 'Add a balancing line ({{amount}})', {
                amount: fAmount(Math.abs(totals.difference)),
              })}
            </Button>
          )}
        </Stack>
      </Card>

      <Stack spacing={3} sx={{ position: { lg: 'sticky' }, top: { lg: 88 } }}>
        <Card sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <TextField
              select
              size="small"
              label={t('je.book', 'Book')}
              value={bookId}
              disabled={saving || !!journal}
              onChange={(e) => setHeader((h) => ({ ...h, legalEntityId: e.target.value }))}
            >
              {catalog.entities
                .filter((e) => e.isActive)
                .map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.shortCode} · {nameOf(e)}
                  </MenuItem>
                ))}
            </TextField>
            <ToggleButtonGroup
              exclusive
              size="small"
              fullWidth
              value={header.journalType}
              onChange={(e, v) => v && setHeader((h) => ({ ...h, journalType: v }))}
              disabled={saving}
            >
              <ToggleButton value="GENERAL">{t('type.GENERAL', 'General')}</ToggleButton>
              <ToggleButton value="OPENING">{t('type.OPENING', 'Opening balances')}</ToggleButton>
            </ToggleButtonGroup>
            <TextField
              size="small"
              type="date"
              label={t('je.date', 'Journal date')}
              value={header.journalDate}
              onChange={(e) => setHeader((h) => ({ ...h, journalDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              disabled={saving}
              helperText={
                header.journalType === 'OPENING'
                  ? t('je.openingHint', 'Opening balances post to period 0: use 1 January.')
                  : undefined
              }
            />
            <TextField
              size="small"
              label={t('je.description', 'Description')}
              value={header.description}
              onChange={(e) => setHeader((h) => ({ ...h, description: e.target.value }))}
              multiline
              minRows={2}
              required
              disabled={saving}
            />
            <TextField
              size="small"
              label={t('je.reference', 'Reference')}
              placeholder={t('je.referenceHint', 'Invoice, contract or memo number')}
              value={header.reference}
              onChange={(e) => setHeader((h) => ({ ...h, reference: e.target.value }))}
              disabled={saving}
            />
          </Stack>
        </Card>

        <Card sx={{ p: 2.5 }}>
          <Stack spacing={1.25}>
            <Row
              label={t('je.totalDebit', 'Total debit')}
              value={fAmount(totals.debit)}
              cur={functional}
            />
            <Row
              label={t('je.totalCredit', 'Total credit')}
              value={fAmount(totals.credit)}
              cur={functional}
            />
            <Divider sx={{ borderStyle: 'dashed' }} />
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2">{t('je.difference', 'Difference')}</Typography>
              <AnimatePresence mode="wait" initial={false}>
                <m.div
                  key={balanced ? 'ok' : 'off'}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.18 }}
                >
                  {balanced ? (
                    <Stack
                      direction="row"
                      spacing={0.5}
                      alignItems="center"
                      sx={{ color: 'success.main' }}
                    >
                      <Iconify icon="solar:check-circle-bold" width={18} />
                      <Typography variant="subtitle2">{t('je.balanced', 'Balanced')}</Typography>
                    </Stack>
                  ) : (
                    <Typography
                      variant="subtitle2"
                      sx={{ color: 'warning.main', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {fAmount(totals.difference)}
                    </Typography>
                  )}
                </m.div>
              </AnimatePresence>
            </Stack>
            {totals.unknown > 0 && (
              <Typography variant="caption" color="text.secondary">
                {t(
                  'je.unknownRate',
                  '{{count}} foreign-currency line(s) use the rate table; totals are confirmed on save.',
                  { count: totals.unknown }
                )}
              </Typography>
            )}
            <Divider sx={{ borderStyle: 'dashed' }} />
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Iconify
                icon="solar:shield-check-bold"
                width={18}
                sx={{ mt: 0.25, color: 'text.secondary' }}
              />
              <Typography variant="body2" color="text.secondary">
                {t('je.approvedBy', 'Approval: {{who}}.', {
                  who: t(`approval.${level}`, APPROVAL_LEVEL[level]),
                })}{' '}
                {t('je.sod', 'You cannot approve a journal you prepared.')}
              </Typography>
            </Stack>
            {touchesControl && (
              <Alert severity="warning" sx={{ py: 0 }}>
                {t(
                  'je.controlWarning',
                  'A line uses a control account fed by the ERP. Only a controller can submit it, with a reason.'
                )}
              </Alert>
            )}
          </Stack>
        </Card>

        {error && <Alert severity="error">{error}</Alert>}

        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button color="inherit" onClick={onCancel} disabled={saving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <LoadingButton
            variant="contained"
            loading={saving}
            disabled={!canSave}
            onClick={handleSave}
            startIcon={<Iconify icon="solar:check-circle-bold" />}
          >
            {t('je.saveDraft', 'Save draft')}
          </LoadingButton>
        </Stack>
      </Stack>

      <JournalImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        defaults={{ ...header, legalEntityId: bookId }}
        onImported={onSaved}
      />
    </Box>
  );
}

function Row({ label, value, cur }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="subtitle2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}{' '}
        <Box component="span" sx={{ typography: 'caption', color: 'text.disabled' }}>
          {cur}
        </Box>
      </Typography>
    </Stack>
  );
}
