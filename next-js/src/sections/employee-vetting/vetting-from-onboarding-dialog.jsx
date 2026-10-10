'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';

import {
  startVettingForSubmission,
  listOnboardingSubmissionsForVetting,
} from 'src/actions/employee-vetting';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

const message = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

/**
 * Vet an onboarding submission the automatic run missed: one made before
 * automatic vetting existed, or one whose run did not go through.
 */
export function VettingFromOnboardingDialog({ open, onClose, credits }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState(null);
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPicked(null);
    setConsent(false);
    setError('');
    setLoading(true);
    listOnboardingSubmissionsForVetting()
      .then(setRows)
      .catch((err) => setError(message(err, 'The submissions could not be loaded.')))
      .finally(() => setLoading(false));
  }, [open]);

  const needsConsent = picked && !picked.backgroundCheckConsent;
  const creditsOut = credits?.state === 'empty';

  const handleStart = async () => {
    setStarting(true);
    try {
      const out = await startVettingForSubmission(picked.id, consent);
      toast.success(
        out.skipped?.length
          ? `Vetting started. Not run: ${out.skipped.join('; ')}.`
          : 'Vetting started. Results are collected automatically.'
      );
      onClose(true);
      router.push(paths.dashboard.hr.employeeVetting.details(out.vettingId));
    } catch (err) {
      toast.error(message(err, 'The vetting could not be started.'));
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Vet an onboarding submission</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            For submissions made before automatic vetting, or whose automatic run did not go
            through. The AML screening, international passport check and verification of the
            previous employers listed (IDfy BGV) run straight away from the details the employee
            submitted. These are paid IDfy checks.
          </Typography>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {creditsOut ? (
            <Alert severity="error">
              IDfy credits are estimated to be used up. The checks may be refused until the account
              is topped up.
            </Alert>
          ) : null}

          <Autocomplete
            loading={loading}
            options={rows}
            value={picked}
            onChange={(_, v) => {
              setPicked(v);
              setConsent(false);
            }}
            getOptionLabel={(o) => o.employeeName || o.email || o.id}
            getOptionDisabled={(o) => !!o.vettingId}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderOption={(props, o) => {
              const { key, ...rest } = props;
              return (
                <Box component="li" key={key} {...rest}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      {o.employeeName || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {[
                        o.designation,
                        o.nationality,
                        o.submittedAt && `submitted ${fDate(o.submittedAt)}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography>
                  </Box>
                  {o.vettingId ? (
                    <Label variant="soft" color="info">
                      Vetting {o.vettingStatus}
                    </Label>
                  ) : !o.backgroundCheckConsent ? (
                    <Label variant="soft" color="warning">
                      No consent recorded
                    </Label>
                  ) : null}
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField {...params} label="Onboarding submission" placeholder="Search by name" />
            )}
          />

          {picked && !picked.passportCheckPossible ? (
            <Alert severity="info">
              The passport check can&apos;t run from this submission (nationality not supported, or
              gender or passport details missing). Only the AML screening will run; add other checks
              on the vetting afterwards.
            </Alert>
          ) : null}

          {needsConsent ? (
            <Alert severity="warning">
              This submission predates the background-check consent box, so no consent is on record.
              <FormControlLabel
                sx={{ mt: 1, alignItems: 'flex-start' }}
                control={
                  <Checkbox
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    sx={{ pt: 0 }}
                  />
                }
                label="I confirm the employee has consented to this background check. My confirmation is recorded on the vetting."
              />
            </Alert>
          ) : null}

          {rows.length > 0 && rows.every((r) => r.vettingId) ? (
            <Alert severity="success">Every onboarding submission already has a vetting.</Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={() => onClose(false)}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          loading={starting}
          disabled={!picked || !!picked.vettingId || (needsConsent && !consent)}
          onClick={handleStart}
        >
          Run checks
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
