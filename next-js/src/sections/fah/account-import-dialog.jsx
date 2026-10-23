'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { fahError, importChart } from 'src/actions/fah';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useFahT } from './fah-gate';

// ----------------------------------------------------------------------

/** Check, then apply, a chart-of-accounts CSV (FR-COA-3). */
export function AccountImportDialog({ open, onClose }) {
  const { t } = useFahT();
  const [fileName, setFileName] = useState('');
  const [csv, setCsv] = useState('');
  const [check, setCheck] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setFileName('');
      setCsv('');
      setCheck(null);
      setError('');
    }
  }, [open]);

  const handlePick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setCheck(null);
    setFileName(file.name);
    const text = await file.text();
    setCsv(text);
    setBusy(true);
    try {
      setCheck(await importChart(text, false));
    } catch (err) {
      setError(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await importChart(csv, true);
      if (result.problems?.length) {
        setCheck(result);
        return;
      }
      toast.success(
        t('accounts.importDone', '{{created}} added, {{updated}} updated', {
          created: result.created,
          updated: result.updated,
        })
      );
      onClose();
    } catch (err) {
      setError(fahError(err));
    } finally {
      setBusy(false);
    }
  };

  const problems = check?.problems ?? [];

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('accounts.importTitle', 'Import chart of accounts')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t(
              'accounts.importHelp',
              'A CSV with the columns of Export CSV. Existing codes are updated, new codes added; nothing changes until you apply.'
            )}
          </Typography>
          <Button
            component="label"
            variant="outlined"
            color="inherit"
            startIcon={<Iconify icon="solar:import-bold" />}
            disabled={busy}
          >
            {fileName || t('accounts.chooseFile', 'Choose a CSV file')}
            <input hidden type="file" accept=".csv,text/csv" onChange={handlePick} />
          </Button>

          {check && (
            <Stack direction="row" spacing={3}>
              <Box>
                <Typography variant="h5">{check.rows}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('accounts.importRows', 'rows')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="h5">{check.created}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('accounts.importNew', 'new')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="h5">{check.updated}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('accounts.importUpdated', 'updated')}
                </Typography>
              </Box>
            </Stack>
          )}

          {problems.length > 0 && (
            <Alert severity="error">
              {t('accounts.importProblems', 'Fix these and choose the file again:')}
              <List dense disablePadding sx={{ maxHeight: 240, overflow: 'auto' }}>
                {problems.map((p, i) => (
                  <ListItem key={i} disableGutters sx={{ py: 0 }}>
                    {p.lineNo ? `${t('common.row', 'Row')} ${p.lineNo}: ` : ''}
                    {p.message}
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}
          {check && !problems.length && (
            <Alert severity="success">
              {t('accounts.importReady', 'The file is valid. Apply it to update the chart.')}
            </Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          loading={busy}
          disabled={!check || problems.length > 0}
          onClick={handleApply}
        >
          {t('accounts.apply', 'Apply')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
