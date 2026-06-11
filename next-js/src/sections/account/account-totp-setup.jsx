'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import { QRCodeSVG } from 'qrcode.react';

import { totpSetup, totpVerifySetup, totpStatus } from 'src/utils/apiHelper';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export function AccountTotpSetup() {
  const { user } = useAuthContext();
  const userId = user?.id;

  const [checking, setChecking] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);

  // Setup flow state
  const [setupLoading, setSetupLoading] = useState(false);
  const [otpauthUri, setOtpauthUri] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [step, setStep] = useState('idle'); // 'idle' | 'qr' | 'done'

  const checkStatus = useCallback(async () => {
    if (!userId) return;
    setChecking(true);
    try {
      const { totpEnabled } = await totpStatus(userId);
      setIsEnabled(totpEnabled);
      if (totpEnabled) setStep('done');
    } catch {
      // ignore — treat as not set up
    } finally {
      setChecking(false);
    }
  }, [userId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleStartSetup = async () => {
    setSetupLoading(true);
    setCode('');
    setCodeError('');
    try {
      const { otpauthUri: uri } = await totpSetup(userId);
      setOtpauthUri(uri);
      setStep('qr');
    } catch (err) {
      toast.error('Failed to initiate authenticator setup. Please try again.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerify = async () => {
    const trimmed = code.replace(/\s/g, '');
    if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
      setCodeError('Please enter the 6-digit code from Microsoft Authenticator.');
      return;
    }
    setVerifyLoading(true);
    setCodeError('');
    try {
      await totpVerifySetup(userId, trimmed);
      setIsEnabled(true);
      setStep('done');
      setOtpauthUri('');
      setCode('');
      toast.success('Microsoft Authenticator set up successfully!');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || '';
      if (msg.toLowerCase().includes('invalid')) {
        setCodeError('Incorrect code. Open Microsoft Authenticator and try again.');
      } else {
        toast.error('Verification failed. Please try again.');
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleReset = async () => {
    setIsEnabled(false);
    setStep('idle');
    setOtpauthUri('');
    setCode('');
    setCodeError('');
  };

  if (checking) {
    return (
      <Card>
        <CardContent>
          <Stack alignItems="center" justifyContent="center" py={4}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" mt={2}>
              Checking authenticator status…
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Two-Factor Authentication (2FA)"
        subheader="Use Microsoft Authenticator to generate one-time passwords for sensitive actions."
      />
      <Divider />
      <CardContent>
        <Stack spacing={3}>
          {/* Status banner */}
          {step === 'done' || isEnabled ? (
            <Alert
              severity="success"
              icon={<Iconify icon="solar:shield-check-bold" width={22} />}
              action={
                <Button size="small" color="inherit" onClick={handleReset}>
                  Reset
                </Button>
              }
            >
              Microsoft Authenticator is active on your account. All approvals require a one-time
              code.
            </Alert>
          ) : (
            <Alert
              severity="warning"
              icon={<Iconify icon="solar:shield-warning-bold" width={22} />}
            >
              Authenticator app is not set up. You will be required to set it up before approving
              invoices or other sensitive actions.
            </Alert>
          )}

          {/* Idle — not set up yet */}
          {step === 'idle' && !isEnabled && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Install <strong>Microsoft Authenticator</strong> on your phone, then click the
                button below to scan the QR code.
              </Typography>
              <Box>
                <Button
                  variant="contained"
                  startIcon={
                    setupLoading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Iconify icon="logos:microsoft" />
                    )
                  }
                  onClick={handleStartSetup}
                  disabled={setupLoading}
                >
                  Set up Microsoft Authenticator
                </Button>
              </Box>
            </Stack>
          )}

          {/* QR code step */}
          {step === 'qr' && otpauthUri && (
            <Stack spacing={3}>
              <Stack spacing={1}>
                <Typography variant="subtitle2">Step 1 — Scan this QR code</Typography>
                <Typography variant="body2" color="text.secondary">
                  Open Microsoft Authenticator → Add account → Scan QR code.
                </Typography>
              </Stack>

              <Box display="flex" justifyContent="center">
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'inline-block',
                    bgcolor: 'common.white',
                  }}
                >
                  <QRCodeSVG value={otpauthUri} size={200} level="M" />
                </Box>
              </Box>

              <Divider />

              <Stack spacing={1}>
                <Typography variant="subtitle2">Step 2 — Confirm setup</Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter the 6-digit code shown in the app to confirm the setup.
                </Typography>
              </Stack>

              <Stack direction="row" spacing={2} alignItems="flex-start">
                <TextField
                  label="6-digit code"
                  placeholder="000 000"
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d\s]/g, '');
                    setCode(val);
                    if (codeError) setCodeError('');
                  }}
                  inputProps={{ maxLength: 7, inputMode: 'numeric', pattern: '[0-9]*' }}
                  error={!!codeError}
                  helperText={codeError}
                  sx={{ width: 180 }}
                />
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  onClick={handleVerify}
                  disabled={verifyLoading || code.replace(/\s/g, '').length < 6}
                  startIcon={
                    verifyLoading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Iconify icon="solar:check-circle-bold" />
                    )
                  }
                  sx={{ height: 56 }}
                >
                  Confirm
                </Button>
              </Stack>

              <Button
                size="small"
                color="inherit"
                onClick={() => {
                  setStep('idle');
                  setOtpauthUri('');
                  setCode('');
                  setCodeError('');
                }}
              >
                Cancel
              </Button>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
