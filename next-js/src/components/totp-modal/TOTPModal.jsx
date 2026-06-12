'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { totpVerify } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------
// TOTPModal — shows a 6-digit OTP prompt before a sensitive action.
//
// Props:
//   open          {boolean}           — controlled open state
//   onClose       {() => void}        — called when user cancels
//   onVerified    {() => void}        — called after successful OTP verification
//   userId        {string}            — the current user's DB UUID
//   totpEnabled   {boolean}           — whether the user has TOTP set up
//   actionLabel   {string}            — e.g. "Approve Invoice" (shown in heading)
// ----------------------------------------------------------------------

export function TOTPModal({
  open,
  onClose,
  onVerified,
  userId,
  totpEnabled,
  actionLabel = 'Continue',
}) {
  const userIdentifier = userId;
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setCode('');
    setCodeError('');
    onClose();
  };

  const handleVerify = async () => {
    if (!userIdentifier) {
      setCodeError('Unable to find your account identity. Please sign out and sign in again.');
      return;
    }

    const trimmed = code.replace(/\s/g, '');
    if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
      setCodeError('Enter the 6-digit code shown in Microsoft Authenticator.');
      return;
    }

    setLoading(true);
    setCodeError('');
    try {
      await totpVerify(userIdentifier, trimmed);
      setCode('');
      onClose();
      onVerified();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || '';
      if (msg.toLowerCase().includes('invalid') || err?.response?.status === 401) {
        setCodeError('Incorrect code. Open Microsoft Authenticator and try again.');
      } else if (msg.toLowerCase().includes('not set up') || err?.response?.status === 412) {
        // failedPrecondition — shouldn't reach here if caller checks totpEnabled
        setCodeError('Authenticator not set up. Please register first.');
      } else {
        setCodeError('Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Not set up — redirect user to setup page ───────────────────────────────
  if (!totpEnabled) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Iconify icon="solar:shield-warning-bold" width={24} color="warning.main" />
            Authenticator Required
          </Box>
        </DialogTitle>

        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            You must set up <strong>Microsoft Authenticator</strong> before you can{' '}
            {actionLabel.toLowerCase()}.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Go to <strong>Account → Authenticator</strong> to register your device. It only takes a
            minute.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            component={RouterLink}
            href={`${paths.dashboard.user.account}/authenticator`}
            startIcon={<Iconify icon="solar:shield-keyhole-bold" />}
            onClick={handleClose}
          >
            Set Up Now
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ── Set up — show OTP input ────────────────────────────────────────────────
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Iconify icon="solar:shield-check-bold" width={24} color="success.main" />
          Confirm with Authenticator
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Open <strong>Microsoft Authenticator</strong> and enter the 6-digit code for{' '}
          <em>IOTA Technologies</em> to {actionLabel.toLowerCase()}.
        </Typography>

        <TextField
          fullWidth
          autoFocus
          label="6-digit code"
          placeholder="000 000"
          value={code}
          onChange={(e) => {
            const val = e.target.value.replace(/[^\d\s]/g, '');
            setCode(val);
            if (codeError) setCodeError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleVerify();
          }}
          inputProps={{ maxLength: 7, inputMode: 'numeric', pattern: '[0-9]*' }}
          error={!!codeError}
          helperText={codeError || ' '}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleVerify}
          disabled={loading || code.replace(/\s/g, '').length < 6}
          startIcon={
            loading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Iconify icon="solar:check-circle-bold" />
            )
          }
        >
          Verify &amp; {actionLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
