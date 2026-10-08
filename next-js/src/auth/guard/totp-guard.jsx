'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useRouter, usePathname } from 'src/routes/hooks';

import { getLiveSessionId } from 'src/utils/jwt-auth';
import { totpVerify, totpStatus } from 'src/utils/apiHelper';
import {
  REAUTH_MS,
  setTotpVerifiedAt,
  getTotpVerifiedAt,
  isTotpStampExpired,
  clearTotpVerifiedAt,
} from 'src/utils/totp-session';

import { Iconify } from 'src/components/iconify';
import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from '../hooks';
import { signOut } from '../context/supabase/action';

// ----------------------------------------------------------------------

// Pages where TOTP guard is bypassed so users can reach the setup page.
const BYPASS_PATHS = [`${paths.dashboard.user.account}/authenticator`];

// ----------------------------------------------------------------------

/**
 * Who is signed in — shown on every MFA screen so the person entering a code
 * knows whose account it is, and can leave if it is not theirs.
 */
function SignedInAs({ user, onSignOut, signingOut, disabled }) {
  const name = user?.displayName || user?.user_metadata?.full_name || '';
  const email = user?.email || '';
  const initial = (name || email || '?').charAt(0).toUpperCase();
  return (
    <Box
      sx={{
        mt: 2,
        p: 1.5,
        gap: 1.5,
        display: 'flex',
        borderRadius: 1.5,
        alignItems: 'center',
        bgcolor: 'background.neutral',
      }}
    >
      <Avatar sx={{ width: 36, height: 36 }}>{initial}</Avatar>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          Signed in as
        </Typography>
        {name ? (
          <Typography variant="subtitle2" noWrap>
            {name}
          </Typography>
        ) : null}
        <Typography variant="body2" color={name ? 'text.secondary' : 'text.primary'} noWrap>
          {email}
        </Typography>
      </Box>
      <Button
        size="small"
        color="inherit"
        onClick={onSignOut}
        disabled={disabled || signingOut}
        startIcon={
          signingOut ? (
            <CircularProgress size={14} color="inherit" />
          ) : (
            <Iconify icon="solar:logout-2-bold" />
          )
        }
        sx={{ flexShrink: 0 }}
      >
        {signingOut ? 'Signing out…' : 'Not you? Sign out'}
      </Button>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function TotpGuard({ children }) {
  const {
    user,
    authenticated,
    loading: authLoading,
    permissionsReady,
    refreshPermissions,
  } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();

  // 'loading' | 'setup_required' | 'otp_required' | 'verified' | 'error'
  const [state, setState] = useState('loading');
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Timer ref for re-auth polling
  const timerRef = useRef(null);

  // The Supabase session this guard has evaluated; null until resolved.
  const sessionIdRef = useRef(null);

  // Whether the dashboard has been shown in this mount. On first entry the
  // dashboard is NOT rendered behind the OTP prompt: mounting it fires every
  // page's API calls, all of which the gateway rejects until the code is
  // entered, and the screen filled with authorization errors before the user
  // had typed anything. Once verified, a later re-verification keeps it
  // mounted (blurred) so in-progress work is not lost.
  const everVerifiedRef = useRef(false);

  // Latest refreshPermissions without re-running the status check on each render.
  const refreshPermissionsRef = useRef(refreshPermissions);
  refreshPermissionsRef.current = refreshPermissions;

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

  // Permissions are fetched only once MFA is cleared (the endpoints are gated
  // on it). Load them before the dashboard renders, or every page would be
  // judged against an empty list and bounce to 403.
  const becomeVerified = useCallback(async () => {
    if (!permissionsReady) {
      try {
        await refreshPermissionsRef.current?.();
      } catch (err) {
        console.error('[TotpGuard] permissions load failed:', err);
      }
    }
    everVerifiedRef.current = true;
    setState('verified');
    scheduleReauthCheck();
  }, [permissionsReady, scheduleReauthCheck]);

  const checkTotp = useCallback(async () => {
    if (!email) return;
    if (isBypassPath) {
      setState('verified');
      return;
    }
    try {
      // Resolve the session BEFORE the status call, so the catch below can still
      // tell an already-verified session from an unknown one.
      const sessionId = await getLiveSessionId();
      sessionIdRef.current = sessionId;

      const { totpEnabled, totpLocked, totpUnlockedAt } = await totpStatus(email);
      if (!totpEnabled) {
        setState('setup_required');
        return;
      }
      if (totpLocked) {
        setLocked(true);
        setError('Account locked. Contact your Super Admin to unlock your account.');
        setOtp('');
        setState('otp_required');
        return;
      }
      // No resolvable session means no stamp can be trusted: ask for a code
      // rather than assume. Verifying again is a minor annoyance; assuming is
      // the bug this guard exists to prevent.
      if (!sessionId) {
        setOtp('');
        setState('otp_required');
        return;
      }
      // If the admin unlocked the account AFTER the user last verified, invalidate their session.
      if (totpUnlockedAt) {
        const verifiedAt = getTotpVerifiedAt(sessionId);
        if (!verifiedAt || verifiedAt < new Date(totpUnlockedAt).getTime()) {
          clearTotpVerifiedAt(sessionId);
          setState('otp_required');
          return;
        }
      }
      // The callback page already verified TOTP on fresh login and stamped sessionStorage.
      // Here we only need to enforce the re-auth timer.
      if (isTotpStampExpired(sessionId)) {
        setState('otp_required');
      } else {
        await becomeVerified();
      }
    } catch (err) {
      console.error('[TotpGuard] status check failed:', err);
      // A valid stamp lets the user continue — a failed status call must not
      // throw them out. Otherwise say so and offer a retry. It used to send
      // them to the SETUP page, which replaces the authenticator they already
      // hold; their existing codes then stopped working and the account
      // locked after three attempts.
      if (!isTotpStampExpired(sessionIdRef.current)) {
        await becomeVerified();
      } else {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'The authenticator status could not be checked.'
        );
        setState('error');
      }
    }
  }, [email, isBypassPath, becomeVerified]);

  useEffect(() => {
    if (authLoading || !authenticated) return undefined;
    checkTotp();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, authenticated, email, isBypassPath]);

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
      // Stamp the session the server just bound the second factor to, so the
      // two records are keyed identically.
      const sessionId = sessionIdRef.current ?? (await getLiveSessionId());
      sessionIdRef.current = sessionId;
      setTotpVerifiedAt(sessionId);
      await becomeVerified();
    } catch (err) {
      const encoreMsg = err?.response?.data?.message || err?.message || '';
      if (err?.response?.status === 403 || encoreMsg.toLowerCase().includes('locked')) {
        setLocked(true);
        setError('Account locked. Contact your Super Admin to unlock your account.');
      } else {
        setError(encoreMsg || 'Incorrect code. Please try again.');
      }
    } finally {
      setVerifying(false);
    }
  };

  // Leave this account so someone else can sign in on this browser.
  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace(paths.auth.supabase.signIn);
    } catch (err) {
      console.error('[TotpGuard] sign out failed:', err);
      setSigningOut(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (authLoading || state === 'loading') {
    return <SplashScreen />;
  }

  // ── Status check failed ──────────────────────────────────────────────────

  if (state === 'error') {
    return (
      <Dialog open disableEscapeKeyDown maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Iconify icon="solar:shield-warning-bold" width={24} />
          Could Not Verify Your Account
        </DialogTitle>
        <DialogContent>
          <Alert severity="error">{error}</Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Try again in a moment. If it keeps failing, sign out and in again, or contact your Super
            Admin.
          </Typography>
          <SignedInAs user={user} onSignOut={handleSignOut} signingOut={signingOut} />
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => {
              setError('');
              setState('loading');
              checkTotp();
            }}
            startIcon={<Iconify icon="solar:restart-bold" />}
          >
            Try Again
          </Button>
        </DialogActions>
      </Dialog>
    );
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
          <SignedInAs user={user} onSignOut={handleSignOut} signingOut={signingOut} />
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
  // Keep the dashboard mounted only for a re-verification; on first entry
  // nothing renders behind the prompt (see everVerifiedRef).
  const showChildren = state === 'verified' || (needsOtp && everVerifiedRef.current);

  return (
    <>
      {showChildren ? (
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
      ) : null}

      {needsOtp && (
        <Dialog open disableEscapeKeyDown maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Iconify icon="solar:shield-keyhole-bold" width={24} />
            Verify Your Identity
          </DialogTitle>

          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {everVerifiedRef.current
                ? 'Your session requires re-verification. '
                : 'Finish signing in. '}
              Enter the 6-digit code from <strong>Microsoft Authenticator</strong> for this account.
            </Typography>

            <TextField
              autoFocus
              fullWidth
              label="Authenticator Code"
              placeholder="000 000"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                if (!locked) setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerify();
              }}
              inputProps={{ inputMode: 'numeric', maxLength: 6 }}
              disabled={locked}
              error={!!error}
              helperText={locked ? '' : error}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}

            <Divider sx={{ mt: 2, borderStyle: 'dashed' }} />
            <SignedInAs
              user={user}
              onSignOut={handleSignOut}
              signingOut={signingOut}
              disabled={verifying}
            />
          </DialogContent>

          <DialogActions>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleVerify}
              disabled={verifying || locked || otp.replace(/\s/g, '').length !== 6}
              startIcon={
                verifying ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Iconify icon={locked ? 'solar:lock-bold' : 'solar:lock-password-bold'} />
                )
              }
            >
              {verifying ? 'Verifying…' : locked ? 'Account Locked' : 'Verify'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
