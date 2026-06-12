'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { SplashScreen } from 'src/components/loading-screen';

import { totpVerify, totpStatus } from 'src/utils/apiHelper';

import { useAuthContext } from '../hooks';

// ----------------------------------------------------------------------

// How many hours before forcing re-authentication (default 8h, env-configurable).
const REAUTH_HOURS =
  Number(process.env.NEXT_PUBLIC_TOTP_REAUTH_HOURS) > 0
    ? Number(process.env.NEXT_PUBLIC_TOTP_REAUTH_HOURS)
    : 8;

const REAUTH_MS = REAUTH_HOURS * 60 * 60 * 1000;

const sessionKey = (email) => `totp_verified_at_${email}`;

function getVerifiedAt(email) {
  try {
    const raw = sessionStorage.getItem(sessionKey(email));
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

function setVerifiedAt(email) {
  try {
    sessionStorage.setItem(sessionKey(email), String(Date.now()));
  } catch {
    // sessionStorage unavailable (SSR / private mode) — non-fatal
  }
}

function isSessionExpired(email) {
  const ts = getVerifiedAt(email);
  if (!ts) return true;
  return Date.now() - ts > REAUTH_MS;
}

// Pages where TOTP guard is bypassed so users can reach the setup page.
const BYPASS_PATHS = [`${paths.dashboard.user.account}/authenticator`];

// ----------------------------------------------------------------------

export function TotpGuard({ children }) {
  const { user, authenticated, loading: authLoading } = useAuthContext();
  const pathname = usePathname();

  // 'loading' | 'setup_required' | 'otp_required' | 'verified'
  const [state, setState] = useState('loading');
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  // Timer ref for re-auth polling
  const timerRef = useRef(null);

  const email = user?.email;

  // Bypass on setup page itself
  const isBypassPath = BYPASS_PATHS.some((p) => pathname?.startsWith(p));

  const scheduleReauthCheck = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setState('otp_required');
      setOtp('');
      setError('');
    }, REAUTH_MS);
  }, []);

  const checkTotp = useCallback(async () => {
    if (!email) return;
    if (isBypassPath) {
      setState('verified');
      return;
    }
    try {
      const { totpEnabled } = await totpStatus(email);
      if (!totpEnabled) {
        setState('setup_required');
        return;
      }
      // The callback page already verified TOTP on fresh login and stamped sessionStorage.
      // Here we only need to enforce the re-auth timer.
      if (isSessionExpired(email)) {
        setState('otp_required');
      } else {
        setState('verified');
        scheduleReauthCheck();
      }
    } catch (err) {
      console.error('[TotpGuard] status check failed:', err);
      // Fail open only if session is already verified (re-auth check failure shouldn't
      // kick out an active user mid-session). On fresh load, require OTP.
      const ts = getVerifiedAt(email);
      if (ts && Date.now() - ts <= REAUTH_MS) {
        setState('verified');
        scheduleReauthCheck();
      } else {
        setState('otp_required');
      }
    }
  }, [email, isBypassPath, scheduleReauthCheck]);

  useEffect(() => {
    if (authLoading || !authenticated) return;
    checkTotp();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, authenticated, email, isBypassPath]);

  // Re-check TOTP on every navigation:
  // - entering bypass path → grant access immediately
  // - leaving bypass path → re-run the full TOTP check so the guard re-engages
  useEffect(() => {
    if (state === 'loading' || !authenticated || authLoading) return;
    if (isBypassPath) {
      setState('verified');
    } else {
      // Re-evaluate: user may have left the authenticator page without completing setup,
      // or navigated somewhere after a bypass-granted session.
      checkTotp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleVerify = async () => {
    const trimmed = otp.replace(/\s/g, '');
    if (trimmed.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      await totpVerify(email, trimmed);
      setVerifiedAt(email);
      setState('verified');
      scheduleReauthCheck();
    } catch (err) {
      const encoreMsg = err?.response?.data?.message || err?.message || '';
      if (err?.response?.status === 403 || encoreMsg.toLowerCase().includes('locked')) {
        // Account locked — sign out and redirect to sign-in so callback shows the lock screen
        setState('otp_required');
        setError('Account locked. Contact your Super Admin to unlock your account.');
      } else {
        setError(encoreMsg || 'Incorrect code. Please try again.');
      }
    } finally {
      setVerifying(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (authLoading || state === 'loading') {
    return <SplashScreen />;
  }

  // ── Setup required ───────────────────────────────────────────────────────

  if (state === 'setup_required') {
    return (
      <Dialog open disableEscapeKeyDown maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Iconify icon="solar:shield-keyhole-bold" width={24} />
          Authenticator Setup Required
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Your organisation requires Microsoft Authenticator for dashboard access. Please set it
            up before continuing.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            component={RouterLink}
            href={`${paths.dashboard.user.account}/authenticator`}
            variant="contained"
            startIcon={<Iconify icon="solar:shield-keyhole-bold" />}
          >
            Set Up Now
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ── OTP verification overlay ─────────────────────────────────────────────

  const needsOtp = state === 'otp_required';

  return (
    <>
      {/* Children always rendered; blurred when OTP needed (re-auth case) */}
      <Box
        sx={{
          filter: needsOtp ? 'blur(6px)' : 'none',
          pointerEvents: needsOtp ? 'none' : 'auto',
          userSelect: needsOtp ? 'none' : 'auto',
          transition: 'filter 0.2s',
        }}
      >
        {children}
      </Box>

      {needsOtp && (
        <Dialog open disableEscapeKeyDown maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Iconify icon="solar:shield-keyhole-bold" width={24} />
            Verify Your Identity
          </DialogTitle>

          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your session requires re-verification. Enter the 6-digit code from{' '}
              <strong>Microsoft Authenticator</strong>.
            </Typography>

            <TextField
              autoFocus
              fullWidth
              label="Authenticator Code"
              placeholder="000 000"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerify();
              }}
              inputProps={{ inputMode: 'numeric', maxLength: 6 }}
              error={!!error}
              helperText={error}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
          </DialogContent>

          <DialogActions>
            <Button
              fullWidth
              variant="contained"
              size="large"
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
              {verifying ? 'Verifying…' : 'Verify'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
