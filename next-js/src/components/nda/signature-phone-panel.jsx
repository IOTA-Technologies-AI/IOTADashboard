'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { cancelSignatureHandoff, collectSignatureHandoff } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const POLL_MS = 2000;

function remaining(expiresAt, now) {
  const ms = Math.max(0, new Date(expiresAt).getTime() - now);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * "Sign on my phone": shows a QR code, waits while the signer draws on their
 * phone, and hands the image back through onReceived(dataUrl, handoffId).
 *
 * The phone only delivers the image. Signing still happens on this computer,
 * after the signer has seen it here (signaturehandoff/handoff.ts in the API).
 *
 * Props:
 *  - create()            : starts a handoff → { handoffId, capturePath, pollToken, expiresAt }
 *  - onReceived(url, id) : the signature arrived from the phone
 */
export function SignaturePhonePanel({ create, onReceived }) {
  const [state, setState] = useState('creating'); // creating | waiting | opened | received | expired | error
  const [handoff, setHandoff] = useState(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const handoffRef = useRef(null);
  const doneRef = useRef(false);
  // Parents pass inline functions; keep the latest without restarting the code.
  const createRef = useRef(create);
  const receivedRef = useRef(onReceived);
  createRef.current = create;
  receivedRef.current = onReceived;

  const start = useCallback(async () => {
    setState('creating');
    setError('');
    doneRef.current = false;
    try {
      const h = await createRef.current();
      handoffRef.current = h;
      setHandoff(h);
      setState('waiting');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not start phone signing.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    start();
    // Leaving the tab withdraws a code that has not delivered anything.
    return () => {
      const h = handoffRef.current;
      if (h && !doneRef.current) cancelSignatureHandoff(h.handoffId, h.pollToken).catch(() => {});
    };
  }, [start]);

  // Poll while the code is live.
  useEffect(() => {
    if (!handoff || (state !== 'waiting' && state !== 'opened')) return undefined;
    let live = true;
    const tick = async () => {
      try {
        const res = await collectSignatureHandoff(handoff.handoffId, handoff.pollToken);
        if (!live) return;
        if (res.status === 'captured' && res.signatureData) {
          doneRef.current = true;
          setState('received');
          receivedRef.current(res.signatureData, handoff.handoffId);
        } else if (res.status === 'opened') {
          setState('opened');
        } else if (['expired', 'cancelled', 'collected'].includes(res.status)) {
          setState('expired');
        }
      } catch {
        // A dropped poll is retried on the next tick.
      }
    };
    const timer = setInterval(tick, POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [handoff, state]);

  // Countdown
  useEffect(() => {
    if (state !== 'waiting' && state !== 'opened') return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state]);

  useEffect(() => {
    if (
      handoff &&
      (state === 'waiting' || state === 'opened') &&
      now > new Date(handoff.expiresAt)
    ) {
      setState('expired');
    }
  }, [now, handoff, state]);

  const captureUrl =
    handoff && typeof window !== 'undefined'
      ? `${window.location.origin}${handoff.capturePath}`
      : '';

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'primary.main',
        borderRadius: 1,
        p: 2.5,
        minHeight: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.paper',
      }}
    >
      {state === 'creating' && <CircularProgress size={28} />}

      {(state === 'waiting' || state === 'opened') && captureUrl && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
          <Box sx={{ p: 1, bgcolor: '#fff', borderRadius: 1, lineHeight: 0 }}>
            <QRCodeSVG value={captureUrl} size={168} level="M" />
          </Box>
          <Stack spacing={1} sx={{ maxWidth: 280 }}>
            {state === 'opened' ? (
              <>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={16} />
                  <Typography variant="subtitle2">Connected — sign on your phone</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Your signature will appear here when you tap &quot;Send to computer&quot;.
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="subtitle2">Scan with your phone camera</Typography>
                <Typography variant="body2" color="text.secondary">
                  Sign with your finger, then send it back here. You will check it on this screen
                  before anything is signed.
                </Typography>
              </>
            )}
            <Typography variant="caption" color="text.disabled">
              Code expires in {remaining(handoff.expiresAt, now)} · works once
            </Typography>
          </Stack>
        </Stack>
      )}

      {state === 'received' && (
        <Stack spacing={1} alignItems="center">
          <Iconify icon="solar:check-circle-bold" width={32} sx={{ color: 'success.main' }} />
          <Typography variant="subtitle2">Signature received from your phone</Typography>
        </Stack>
      )}

      {(state === 'expired' || state === 'error') && (
        <Stack spacing={1.5} alignItems="center" sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color={state === 'error' ? 'error.main' : 'text.secondary'}>
            {state === 'error' ? error : 'This code has expired.'}
          </Typography>
          <Button size="small" variant="outlined" onClick={start}>
            Get a new code
          </Button>
        </Stack>
      )}
    </Box>
  );
}
