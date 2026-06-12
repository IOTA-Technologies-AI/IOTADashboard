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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Phases ────────────────────────────────────────────────────────────────────
// exchanging      → loading: authenticating with Supabase
// sending_qr      → loading: auto-sending QR code email (first-time user)
// setup_email_sent → new user: email sent, show instructions + "I've scanned it"
// setup_verify    → new user: enter 6-digit code from authenticator to finish setup
// totp_required   → returning user: enter 6-digit code to sign in
// totp_locked     → account locked after 3 wrong attempts
// account_not_found → Entra user not provisioned in IOTA DB yet
// error           → unrecoverable auth error

export default function SupabaseAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState('exchanging');
  const [authError, setAuthError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState('');

  const nextRef = useRef(paths.dashboard.root);
  const emailRef = useRef('');

  const goToDashboard = () => router.replace(nextRef.current);

  // ── Auto-send QR email ────────────────────────────────────────────────────
  const sendQrEmail = async () => {
    setPhase('sending_qr');
    try {
      await totpSetup(emailRef.current);
      setPhase('setup_email_sent');
    } catch (err) {
      const encoreMsg = err?.response?.data?.message || err?.message || '';
      setAuthError(encoreMsg || 'Failed to send setup email. Please try again.');
      setPhase('error');
    }
  };

  // ── Phase 1: exchange code → check TOTP status ────────────────────────────
  useEffect(() => {
    const code = searchParams.get('code');
    nextRef.current = searchParams.get('next') || paths.dashboard.root;
    const { code: hashCode, accessToken, refreshToken } = parseHashParams(window.location.hash);
    const useCode = code || hashCode;

    const afterSession = async (userEmail) => {
      emailRef.current = userEmail || '';
      console.log('[TOTP Callback] session email:', userEmail);
      if (!userEmail) {
        goToDashboard();
        return;
      }
      try {
        const { totpEnabled, totpLocked } = await totpStatus(userEmail);
        console.log('[TOTP Callback] status:', { totpEnabled, totpLocked });
        if (!totpEnabled) {
          // First-time user — auto-send QR, stay on this page
          await sendQrEmail();
          return;
        }
        if (totpLocked) {
          setPhase('totp_locked');
          return;
        }
        setPhase('totp_required');
      } catch (statusErr) {
        const httpStatus = statusErr?.response?.status;
        console.error('[TOTP Callback] totpStatus error:', httpStatus, statusErr?.response?.data?.message);
        if (httpStatus === 404) {
          // Not in IOTA DB yet
          setPhase('account_not_found');
        } else {
          // Unknown — auto-send QR rather than demanding an OTP they may not have
          await sendQrEmail();
        }
      }
    };

    const resolveSession = async () => {
      if (accessToken) {
        const { error: sessionError, data } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) { setAuthError(sessionError.message); setPhase('error'); return; }
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

      const { error: exchError, data: exchData } = await supabase.auth.exchangeCodeForSession({ authCode: useCode });
      if (exchError) { setAuthError(exchError.message); setPhase('error'); return; }
      await afterSession(exchData?.user?.email);
    };

    resolveSession().catch((err) => {
      setAuthError(err?.message || 'Unable to complete sign-in.');
      setPhase('error');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Resend QR email ───────────────────────────────────────────────────────
  const handleResend = async () => {
    setResending(true);
    setResendError('');
    try {
      await totpSetup(emailRef.current);
    } catch (err) {
      setResendError(err?.response?.data?.message || err?.message || 'Failed to resend.');
    } finally {
      setResending(false);
    }
  };

  // ── "I've scanned it" → proceed to code entry ─────────────────────────────
  const handleScannedIt = () => {
    setOtp('');
    setOtpError('');
    setPhase('setup_verify');
  };

  // ── Verify setup code (first-time) ────────────────────────────────────────
  const handleVerifySetup = async () => {
    const trimmed = otp.replace(/\s/g, '');
    if (trimmed.length !== 6) { setOtpError('Enter the 6-digit code from your authenticator app.'); return; }
    setVerifying(true);
    setOtpError('');
    try {
      await totpVerifySetup(emailRef.current, trimmed);
      markTotpVerified(emailRef.current);
      goToDashboard();
    } catch (err) {
      setOtpError(err?.response?.data?.message || err?.message || 'Incorrect code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  // ── Verify OTP (returning user) ───────────────────────────────────────────
  const handleVerify = async () => {
    const trimmed = otp.replace(/\s/g, '');
    if (trimmed.length !== 6) { setOtpError('Enter the 6-digit code from your authenticator app.'); return; }
    setVerifying(true);
    setOtpError('');
    try {
      await totpVerify(emailRef.current, trimmed);
      markTotpVerified(emailRef.current);
      goToDashboard();
    } catch (err) {
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

  // Loading: exchanging code or sending QR email
  if (phase === 'exchanging' || phase === 'sending_qr') {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Card variant="outlined">
          <Box sx={{ p: 4 }}>
            <Stack spacing={2} alignItems="center">
              <CircularProgress size={32} />
              <Typography variant="h6">
                {phase === 'sending_qr' ? 'Sending setup email…' : 'Finishing sign-in…'}
              </Typography>
            </Stack>
          </Box>
        </Card>
      </Container>
    );
  }

  // Error
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

  // Account not provisioned in IOTA DB
  if (phase === 'account_not_found') {
    return (
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Card variant="outlined">
          <Box sx={{ p: 4 }}>
            <Stack spacing={3} alignItems="center">
              <Iconify icon="solar:user-block-bold" width={48} sx={{ color: 'warning.main' }} />
              <Typography variant="h5" textAlign="center">Account Not Activated</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                You&apos;ve signed in with Microsoft successfully, but your account hasn&apos;t been
                activated in the IOTA dashboard yet. Please ask your{' '}
                <strong>Super Admin</strong> to grant you access via the Access Control page.
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

  // First-time: QR email sent — show instructions
  if (phase === 'setup_email_sent') {
    return (
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Card variant="outlined">
          <Box sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Stack spacing={1} alignItems="center">
                <Iconify icon="solar:letter-bold" width={40} sx={{ color: 'success.main' }} />
                <Typography variant="h5" textAlign="center">Check Your Email</Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  We&apos;ve sent a QR code to <strong>{emailRef.current}</strong>.
                </Typography>
              </Stack>

              <Box sx={{ bgcolor: 'background.neutral', borderRadius: 2, p: 2 }}>
                <Stack spacing={1.5}>
                  {[
                    { n: 1, text: 'Open the email from IOTA Technologies.' },
                    { n: 2, text: 'Open Microsoft Authenticator (or any TOTP app) on your phone.' },
                    { n: 3, text: 'Tap "Add account" → "Other account" and scan the QR code.' },
                    { n: 4, text: 'Once added, click the button below to continue.' },
                  ].map(({ n, text }) => (
                    <Stack key={n} direction="row" spacing={1.5} alignItems="flex-start">
                      <Box
                        sx={{
                          minWidth: 24, height: 24, borderRadius: '50%',
                          bgcolor: 'primary.main', color: 'primary.contrastText',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, mt: 0.1,
                        }}
                      >
                        {n}
                      </Box>
                      <Typography variant="body2" color="text.secondary">{text}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              {resendError && <Alert severity="error">{resendError}</Alert>}

              <Button
                fullWidth
                size="large"
                variant="contained"
                onClick={handleScannedIt}
                startIcon={<Iconify icon="solar:check-circle-bold" />}
              >
                I&apos;ve Scanned the QR Code
              </Button>

              <Button
                size="small"
                variant="text"
                color="inherit"
                onClick={handleResend}
                disabled={resending}
                startIcon={resending ? <CircularProgress size={14} color="inherit" /> : null}
              >
                {resending ? 'Resending…' : 'Didn\'t receive the email? Send again'}
              </Button>
            </Stack>
          </Box>
        </Card>
      </Container>
    );
  }

  // First-time: enter 6-digit code to complete setup
  if (phase === 'setup_verify') {
    return (
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Card variant="outlined">
          <Box sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Stack spacing={1} alignItems="center">
                <Iconify icon="solar:qr-code-bold" width={40} sx={{ color: 'success.main' }} />
                <Typography variant="h5" textAlign="center">Enter the Code</Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Open your authenticator app and enter the 6-digit code for{' '}
                  <strong>IOTA Technologies</strong> to complete setup.
                </Typography>
              </Stack>

              <TextField
                autoFocus
                fullWidth
                label="Authenticator Code"
                placeholder="000 000"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6)); setOtpError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerifySetup(); }}
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
                startIcon={verifying ? <CircularProgress size={16} color="inherit" /> : <Iconify icon="solar:check-circle-bold" />}
              >
                {verifying ? 'Verifying…' : 'Complete Setup & Sign In'}
              </Button>

              <Button size="small" variant="text" color="inherit" onClick={() => setPhase('setup_email_sent')}>
                ← Back to instructions
              </Button>
            </Stack>
          </Box>
        </Card>
      </Container>
    );
  }

  // Returning user: enter TOTP code
  if (phase === 'totp_required') {
    return (
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Card variant="outlined">
          <Box sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Stack spacing={1} alignItems="center">
                <Iconify icon="solar:shield-keyhole-bold" width={40} sx={{ color: 'primary.main' }} />
                <Typography variant="h5" textAlign="center">Two-Factor Verification</Typography>
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
                onChange={(e) => { setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6)); setOtpError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
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
                startIcon={verifying ? <CircularProgress size={16} color="inherit" /> : <Iconify icon="solar:lock-password-bold" />}
              >
                {verifying ? 'Verifying…' : 'Verify & Sign In'}
              </Button>
            </Stack>
          </Box>
        </Card>
      </Container>
    );
  }

  // Account locked
  if (phase === 'totp_locked') {
    return (
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Card variant="outlined">
          <Box sx={{ p: 4 }}>
            <Stack spacing={3} alignItems="center">
              <Iconify icon="solar:lock-bold" width={48} sx={{ color: 'error.main' }} />
              <Typography variant="h5" textAlign="center" color="error">Account Locked</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Your account has been locked after too many failed authentication attempts.
                Please contact your <strong>Super Admin</strong> to unlock your account.
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
