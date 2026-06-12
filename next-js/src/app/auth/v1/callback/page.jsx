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
import { totpStatus, totpVerify } from 'src/utils/apiHelper';

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

// 'exchanging' | 'totp_required' | 'setup_required' | 'done' | 'error'

export default function SupabaseAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState('exchanging');
  const [authError, setAuthError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);

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
      if (!userEmail) {
        // No email — can't check TOTP; go straight through
        goToDashboard();
        return;
      }
      try {
        const { totpEnabled } = await totpStatus(userEmail);
        if (!totpEnabled) {
          // User hasn't set up TOTP yet — let them in, TotpGuard will prompt setup
          goToDashboard();
          return;
        }
        setPhase('totp_required');
      } catch {
        // TOTP status check failed — still require TOTP to be safe
        setPhase('totp_required');
      }
    };

    const resolveSession = async () => {
      // Implicit flow (hash tokens)
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

      // Check if Supabase already auto-exchanged the code (detectSessionInUrl=true)
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

  // ── Phase 2: verify OTP ───────────────────────────────────────────────────
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
    } catch {
      setOtpError('Incorrect code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Exchanging / loading
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

  // Auth error
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

  // TOTP verification required
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
                sx={{ letterSpacing: 4, '& input': { textAlign: 'center', fontSize: '1.5rem' } }}
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
                {verifying ? 'Verifying…' : 'Verify & Continue'}
              </Button>

              {otpError && (
                <Alert severity="error" sx={{ mt: -1 }}>
                  {otpError}
                </Alert>
              )}
            </Stack>
          </Box>
        </Card>
      </Container>
    );
  }

  return null;
}
