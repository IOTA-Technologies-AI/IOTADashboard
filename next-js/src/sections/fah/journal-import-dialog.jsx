'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fahError, downloadText, importJournal } from 'src/actions/fah';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useFahT } from './fah-gate';

// ----------------------------------------------------------------------

const TEMPLATE = [
  'accountCode,debit,credit,currency,exchangeRate,practice,costCentre,engagement,customerId,location,ipCounterparty,employeeId,memo',
  '1020.01,250000,,,,,,,,,,,Bank balance at 1 January',
  '3400,,250000,,,,,,,,,,Shareholder current account',
].join('\r\n');

/**
 * A draft journal from a CSV of lines (FR-GL-10). With "Opening balances" it
 * is the opening-balance loader: period 0 of the year. Codes are used for
 * accounts, practices, cost centres, engagements and locations.
 */
export function JournalImportDialog({ open, onClose, defaults, onImported }) {
  const { t } = useFahT();
  const [form, setForm] = useState(defaults);
  const [file, setFile] = useState(null);
  const [skip, setSkip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(defaults);
      setFile(null);
      setProblems([]);
      setError('');
      setSkip(false);
    }
    // Only when the dialog opens: defaults change as the form behind it is edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleImport = async () => {
    setBusy(true);
    setError('');
    setProblems([]);
    try {
      const csv = await file.text();
      const result = await importJournal({
        legalEntityId: form.legalEntityId,
        journalDate: form.journalDate,
        journalType: form.journalType,
        description: form.description || file.name,
        reference: form.reference || null,
        csv,
        skipInvalidRows: skip,
      });
      if (result.detail) {
        toast.success(
          t('import.done', '{{count}} lines imported as a draft', { count: result.importedLines })
        );
        onClose();
        onImported?.(result.detail);
      } else {
        setProblems(result.problems ?? []);
      }
    } catch (err) {
      setError(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('import.title', 'Import journal lines')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t(
              'import.help',
              'One row per line. Accounts, practices, cost centres and engagements by code. The draft opens for review before anyone submits it.'
            )}
          </Typography>
          <Button
            size="small"
            color="inherit"
            sx={{ alignSelf: 'flex-start' }}
            startIcon={<Iconify icon="solar:download-bold" />}
            onClick={() => downloadText(TEMPLATE, 'journal-lines-template.csv')}
          >
            {t('import.template', 'Download the template')}
          </Button>

          <ToggleButtonGroup
            exclusive
            size="small"
            value={form?.journalType ?? 'GENERAL'}
            onChange={(e, v) => v && setForm((f) => ({ ...f, journalType: v }))}
          >
            <ToggleButton value="GENERAL">{t('type.GENERAL', 'General')}</ToggleButton>
            <ToggleButton value="OPENING">{t('type.OPENING', 'Opening balances')}</ToggleButton>
          </ToggleButtonGroup>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              size="small"
              type="date"
              label={t('je.date', 'Journal date')}
              value={form?.journalDate ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, journalDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
            <TextField
              size="small"
              fullWidth
              label={t('je.description', 'Description')}
              value={form?.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Stack>

          <Box
            component="label"
            sx={{
              p: 3,
              gap: 1,
              display: 'flex',
              cursor: 'pointer',
              borderRadius: 1.5,
              alignItems: 'center',
              flexDirection: 'column',
              border: (theme) => `1px dashed ${theme.vars.palette.divider}`,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Iconify icon="solar:file-text-bold" width={32} sx={{ color: 'text.secondary' }} />
            <Typography variant="subtitle2">
              {file ? file.name : t('import.pick', 'Choose a .csv file')}
            </Typography>
            <input
              hidden
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setProblems([]);
              }}
            />
          </Box>

          {problems.length > 0 && (
            <Alert severity="warning">
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                {t('import.problems', 'Nothing was imported. Fix these rows:')}
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 180, overflow: 'auto' }}>
                {problems.map((p, i) => (
                  <li key={i}>
                    {p.lineNo
                      ? t('import.row', 'Row {{n}}: {{message}}', {
                          n: p.lineNo,
                          message: p.message,
                        })
                      : p.message}
                  </li>
                ))}
              </Box>
            </Alert>
          )}
          {problems.length > 0 && (
            <FormControlLabel
              control={<Checkbox checked={skip} onChange={(e) => setSkip(e.target.checked)} />}
              label={t('import.skip', 'Import the valid rows and leave these out')}
            />
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          loading={busy}
          disabled={!file || !form?.legalEntityId || !form?.journalDate}
          onClick={handleImport}
        >
          {t('import.go', 'Import as draft')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
