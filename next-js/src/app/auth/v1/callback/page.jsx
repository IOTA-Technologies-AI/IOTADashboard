'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/iconify';

import { supabase } from 'src/lib/supabase';
import { totpSetup, totpStatus, totpVerify, totpVerifySetup } from 'src/utils/apiHelper';

// Parse query-style params from a hash fragment (e.g. #code=...&access_token=...)
const parseHashParams = (hashString) => {
  const hash = hashString?.startsWith('#') ? hashString.slice(1) : hashString || '';
  const params = new URLSearchParams(hash);
  return {
    code: params.get('code'),
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
  };
};

const sessionKey = (email) => `totp_verified_at_${email}`;

function markTotpVerified(email) {
  try {
    sessionStorage.setItem(sessionKey(email), String(Date.now()));
  } catch {
    // non-fatal
  }
}

// 'exchanging' | 'account_not_found' | 'setup_required' | 'setup_verify' | 'totp_required' | 'totp_locked' | 'error'

export default function SupabaseAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState('exchanging');
  const [authError, setAuthError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Hold resolved values across async phases
  const nextRef = useRef(paths.dashboard.root);
  const emailRef = useRef('');

  const goToDashboard = () => router.replace(nextRef.current);

  // ── Phase 1: exchange code and resolve TOTP status ────────────────────────
  useEffect(() => {
    const code = searchParams.get('code');
    nextRef.current = searchParams.get('next') || paths.dashboard.root;
    const { code: hashCode, accessToken, refreshToken } = parseHashParams(window.location.hash);
    const useCode = code || hashCode;

    const afterSession = async (userEmail) => {
      emailRef.current = userEmail || '';
      console.log('[TOTP Callback] afterSession called with email:', userEmail);
      if (!userEmail) {
        console.log('[TOTP Callback] No email, redirecting to dashboard');
        goToDashboard();
        return;
      }
      try {
        const statusResult = await totpStatus(userEmail);
        console.log('[TOTP Callback] totpStatus result:', statusResult);
        const { totpEnabled, totpLocked } = statusResult;
        if (!totpEnabled) {
          console.log('[TOTP Callback] totpEnabled=false -> setup_required');
          setPhase('setup_required');
          return;
        }
        if (totpLocked) {
          console.log('[TOTP Callback] totpLocked=true -> totp_locked');
          setPhase('totp_locked');
          return;
        }
        console.log('[TOTP Callback] totpEnabled=true -> totp_required');
        setPhase('totp_required');
      } catch (statusErr) {
        const httpStatus = statusErr?.response?.status;
        const errMsg = statusErr?.response?.data?.message || statusErr?.message;
        console.error('[TOTP Callback] totpStatus error:', httpStatus, errMsg, statusErr);
        if (httpStatus === 404) {
          // User authenticated via Entra but not yet provisioned in IOTA
          setPhase('account_not_found');
        } else {
          // Unknown error — show setup rather than OTP (user can’t verify a code they may not have)
          setPhase('setup_required');
        }
      }
    };

    const resolveSession = async () => {
      if (accessToken) {
        const { error: sessionError, data } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setAuthError(sessionError.message);
          setPhase('error');
          return;
        }
        await afterSession(data?.user?.email);
        return;
      }

      const { data: existing } = await supabase.auth.getSession();
      if (existing?.session) {
        await afterSession(existing.session.user?.email);
        return;
      }

      if (!useCode) {
        setAuthError('Missing auth code in callback URL.');
        setPhase('error');
        return;
      }

      const { error: exchError, data: exchData } = await supabase.auth.exchangeCodeForSession({
        authCode: useCode,
      });
      if (exchError) {
        setAuthError(exchError.message);
        setPhase('error');
        return;
      }
      await afterSession(exchData?.user?.email);
    };

    resolveSession().catch((err) => {
      setAuthError(err?.message || 'Unable to complete sign-in.');
      setPhase('error');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Send QR code email (setup) ────────────────────────────────────────────
  const handleSendQr = async () => {
    setSendingEmail(true);
    setEmailError('');
    try {
      await totpSetup(emailRef.current);
      setEmailSent(true);
      setPhase('setup_verify');
    } catch (err) {
      const encoreMsg = err?.response?.data?.message || err?.message || '';
      setEmailError(encoreMsg || 'Failed to send QR code. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  // ── Confirm setup code ────────────────────────────────────────────────────
  const handleVerifySetup = async () => {
    const trimmed = otp.replace(/\s/g, '');
    if (trimmed.length !== 6) {
      setOtpError('Enter the 6-digit code shown in your authenticator app.');
      return;
    }
    setVerifying(true);
    setOtpError('');
    try {
      await totpVerifySetup(emailRef.current, trimmed);
      markTotpVerified(emailRef.current);
      goToDashboard();
    } catch (err) {
      const encoreMsg = err?.response?.data?.message || err?.message || '';
      setOtpError(encoreMsg || 'Incorrect code. Please check the app and try again.');
    } finally {
      setVerifying(false);
    }
  };

  // ── Verify OTP (returning user) ───────────────────────────────────────────
  const handleVerify = async () => {
    const trimmed = otp.replace(/\s/g, '');
    if (trimmed.length !== 6) {
      setOtpError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setVerifying(true);
    setOtpError('');
    try {
      await totpVerify(emailRef.current, trimmed);
      markTotpVerified(emailRef.current);
      goToDashboard();
    } catch (err) {
      // Encore errors come via axios as err.response.data = { code, message }
      const encoreMsg = err?.response?.data?.message || err?.message || '';
      if (err?.response?.status === 403 || encoreMsg.toLowerCase().includes('locked')) {
        setPhase('totp_locked');
      } else {
        setOtpError(encoreMsg || 'Incorrect code. Please try again.');
      }
    } finally {
      setVerifying(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'exchanging') {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Card variant="outlined">
          <Box sx={{ p: 4 }}>
            <Stack spacing={2} alignItems="center">
              <CircularProgress size={32} />
              <Typography variant="h6">Finishing sign-in…</Typography>
            </Stack>
          </Box>
        </Card>
      </Container>
    );
  }

  if (phase === 'error') {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Card variant="outlined">
          <Box sx={{ p: 4 }}>
            <Alert severity="error">{authError || 'Unable to complete sign-in.'}</Alert>
          </Box>
        </Card>
      </Container>
    );
  }

  // ── Account not provisioned in IOTA ──────────────────────────────────────
  if (phase === 'account_not_found') {
    return (
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Card variant="outlined">
          <Box sx={{ p: 4 }}>
            <Stack spacing={3} alignItems="center">
              <Iconify icon="solar:user-block-bold" width={48} sx={{ color: 'warning.main' }} />
              <Typography variant="h5" textAlign="center">
                Account Not Activated
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                You&apos;ve signed in with Microsoft successfully, but your account hasn&apos;t been
                activated in the IOTA dashboard yet. Please ask your <strong>Super Admin</strong> to
                grant you access via the Access Control page.
              </Typography>
              <Typography variant="caption" color="text.disabled" textAlign="center">
                Signed in as <strong>{emailRef.current}</strong>
              </Typography>
            </Stack>
          </Box>
        </Card>
      </Container>
    );
  }

  // ── First-time setup: send QR code email ──────────────────────────────────
  if (phase === 'setup_required') {
    return (
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Card variant="outlined">
          <Box sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Stack spacing={1} alignItems="center">
                <Iconify
                  icon="solar:shield-keyhole-bold"
                  width={40}
                  sx={{ color: 'warning.main' }}
                />
                <Typography variant="h5" textAlign="center">
                  Set Up Two-Factor Authentication
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Your organisation requires an authenticator app for dashboard access. We&apos;ll
                  email you a QR code to scan with <strong>Microsoft Authenticator</strong> or any
                  TOTP app.
                </Typography>
              </Stack>

              {emailError && <Alert severity="error">{emailError}</Alert>}

              <Button
                fullWidth
                size="large"
                variant="contained"
                color="warning"
                onClick={handleSendQr}
                disabled={sendingEmail}
                startIcon={
                  sendingEmail ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Iconify icon="solar:letter-bold" />
                  )
                }
              >
                {sendingEmail ? 'Sending…' : 'Send QR Code to My Email'}
              </Button>

              <Typography variant="caption" color="text.disabled" textAlign="center">
                The QR code will be sent to <strong>{emailRef.current}</strong>
              </Typography>
            </Stack>
          </Box>
        </Card>
      </Container>
    );
  }

  // ── Setup verification: scan QR then enter code ───────────────────────────
  if (phase === 'setup_verify') {
    return (
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Card variant="outlined">
          <Box sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Stack spacing={1} alignItems="center">
                <Iconify icon="solar:qr-code-bold" width={40} sx={{ color: 'success.main' }} />
                <Typography variant="h5" textAlign="center">
                  Scan &amp; Verify
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Check your email for the QR code. Scan it with your authenticator app, then enter
                  the 6-digit code below to complete setup.
                </Typography>
              </Stack>

              <TextField
                autoFocus
                fullWidth
                label="Authenticator Code"
                placeholder="000 000"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                  setOtpError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerifySetup();
                }}
                inputProps={{ inputMode: 'numeric', maxLength: 6 }}
                error={!!otpError}
                helperText={otpError}
                sx={{ '& input': { textAlign: 'center', fontSize: '1.5rem', letterSpacing: 6 } }}
              />

              <Button
                fullWidth
                size="large"
                variant="contained"
                color="success"
                onClick={handleVerifySetup}
                disabled={verifying || otp.replace(/\s/g, '').length !== 6}
                startIcon={
                  verifying ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Iconify icon="solar:check-circle-bold" />
                  )
                }
              >
                {verifying ? 'Verifying…' : 'Complete Setup & Sign In'}
              </Button>

              <Button
                size="small"
                variant="text"
                color="inherit"
                onClick={() => {
                  setOtp('');
                  setOtpError('');
                  setEmailSent(false);
                  setPhase('setup_required');
                }}
              >
                Didn&apos;t receive the email? Send again
              </Button>
            </Stack>
          </Box>
        </Card>
      </Container>
    );
  }

  // ── Returning user: enter existing TOTP code ──────────────────────────────
  if (phase === 'totp_required') {
    return (
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Card variant="outlined">
          <Box sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Stack spacing={1} alignItems="center">
                <Iconify
                  icon="solar:shield-keyhole-bold"
                  width={40}
                  sx={{ color: 'primary.main' }}
                />
                <Typography variant="h5" textAlign="center">
                  Two-Factor Verification
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Open <strong>Microsoft Authenticator</strong> (or your TOTP app) and enter the
                  6-digit code for <strong>IOTA Technologies</strong>.
                </Typography>
              </Stack>

              <TextField
                autoFocus
                fullWidth
                label="Authenticator Code"
                placeholder="000 000"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                  setOtpError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerify();
                }}
                inputProps={{ inputMode: 'numeric', maxLength: 6 }}
                error={!!otpError}
                helperText={otpError}
                sx={{ '& input': { textAlign: 'center', fontSize: '1.5rem', letterSpacing: 6 } }}
              />

              <Button
                fullWidth
                size="large"
                variant="contained"
                onClick={handleVerify}
                disabled={verifying || otp.replace(/\s/g, '').length !== 6}
                startIcon={
                  verifying ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Iconify icon="solar:lock-password-bold" />
                  )
                }
              >
                {verifying ? 'Verifying…' : 'Verify & Sign In'}
              </Button>

              <Button
                size="small"
                variant="text"
                color="inherit"
                onClick={() => {
                  setOtp('');
                  setOtpError('');
                  setEmailError('');
                  setEmailSent(false);
                  setPhase('setup_required');
                }}
              >
                Haven&apos;t set up your authenticator yet?
              </Button>
            </Stack>
          </Box>
        </Card>
      </Container>
    );
  }

  // ── Account locked ────────────────────────────────────────────────────────
  if (phase === 'totp_locked') {
    return (
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Card variant="outlined">
          <Box sx={{ p: 4 }}>
            <Stack spacing={3} alignItems="center">
              <Iconify icon="solar:lock-bold" width={48} sx={{ color: 'error.main' }} />
              <Typography variant="h5" textAlign="center" color="error">
                Account Locked
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Your account has been locked after too many failed authentication attempts. Please
                contact your <strong>Super Admin</strong> to unlock your account.
              </Typography>
              <Typography variant="caption" color="text.disabled" textAlign="center">
                Signed in as <strong>{emailRef.current}</strong>
              </Typography>
            </Stack>
          </Box>
        </Card>
      </Container>
    );
  }

  return null;
}
