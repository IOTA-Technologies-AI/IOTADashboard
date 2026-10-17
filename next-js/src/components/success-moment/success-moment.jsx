'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

/**
 * The "it's gone" moment — adapted from Docusign's "Sending an envelope" flow
 * (Mobbin), rebuilt in IOTA's style. Shown only where something leaves IOTA or
 * is completed: an offer or NDA sent or signed, an invoice issued, a job
 * published, a reply sent, a form submitted.
 *
 *   celebrate({ kind: 'sent', title: 'Offer sent to Sara', description: '…' })
 *
 * kind  'sent'      the letter takes off: paper planes along drawn trails
 *       'signed'    a signature draws itself on the letter's signature line
 *       'submitted' like 'sent', for a form someone filled in
 *
 * Call it anywhere, like toast: <SuccessMomentHost /> is mounted once in the
 * root layout, so it also works on the public signing and intake pages and
 * survives a navigation right after the action. Returns a promise that
 * resolves when it is closed.
 */

// ---------------------------------------------------------------- store

let listener = null;
const queue = [];

export function celebrate(options) {
  return new Promise((resolve) => {
    queue.push({ ...options, resolve, key: Date.now() + Math.random() });
    listener?.();
  });
}

// ---------------------------------------------------------------- stage

const DEFAULT_CHIP = { sent: 'Sent', signed: 'Signed', submitted: 'Submitted' };

const ease = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp = (v) => Math.max(0, Math.min(1, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));

function Stage({ kind, documentId, onLanded, runKey }) {
  const theme = useTheme();
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const refs = {
    p1: useRef(null),
    p2: useRef(null),
    pl1: useRef(null),
    pl2: useRef(null),
    sig: useRef(null),
    doc: useRef(null),
    fill: useRef(null),
  };
  const flying = kind !== 'signed';

  useEffect(() => {
    const { p1, p2, pl1, pl2, sig, doc, fill } = refs;
    const L1 = p1.current?.getTotalLength() || 1;
    const L2 = p2.current?.getTotalLength() || 1;
    const LS = sig.current?.getTotalLength() || 1;
    if (p1.current) p1.current.style.strokeDasharray = `${L1}`;
    if (p2.current) p2.current.style.strokeDasharray = `${L2}`;
    if (sig.current) sig.current.style.strokeDasharray = `${LS}`;

    const place = (g, path, L, k) => {
      if (!g || !path) return;
      const at = path.getPointAtLength(L * k);
      const ahead = path.getPointAtLength(Math.min(L, L * k + 1));
      const ang = (Math.atan2(ahead.y - at.y, ahead.x - at.x) * 180) / Math.PI;
      g.setAttribute('transform', `translate(${at.x} ${at.y}) rotate(${ang})`);
    };

    const frame = (t) => {
      if (fill.current) fill.current.style.transform = `scaleX(${ease(seg(t, 0, 0.9))})`;
      if (fill.current) fill.current.parentElement.style.opacity = t < 1.1 ? '1' : '0';
      if (doc.current)
        doc.current.style.transform =
          flying && t >= 0.95 ? 'translateY(-4px) rotate(-1.5deg)' : 'none';
      if (flying) {
        const f1 = easeInOut(seg(t, 1.0, 2.0));
        const f2 = easeInOut(seg(t, 1.12, 2.1));
        if (p1.current) p1.current.style.strokeDashoffset = `${L1 * (1 - f1)}`;
        if (p2.current) p2.current.style.strokeDashoffset = `${L2 * (1 - f2)}`;
        place(pl1.current, p1.current, L1, Math.max(f1, 0.001));
        place(pl2.current, p2.current, L2, Math.max(f2, 0.001));
        if (pl1.current) pl1.current.style.opacity = t < 1.0 || f1 >= 1 ? '0' : '1';
        if (pl2.current) pl2.current.style.opacity = t < 1.12 || f2 >= 1 ? '0' : '1';
      } else if (sig.current) {
        sig.current.style.strokeDashoffset = `${LS * (1 - easeInOut(seg(t, 0.9, 1.9)))}`;
      }
    };

    let raf = 0;
    let landed = false;
    if (reduce) {
      frame(9);
      onLanded();
      return undefined;
    }
    frame(0);
    const start = performance.now();
    const tick = (now) => {
      const t = (now - start) / 1000;
      frame(t);
      if (!landed && t >= (flying ? 1.9 : 1.8)) {
        landed = true;
        onLanded();
      }
      if (t < 2.4) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  const accent = theme.palette.primary.main;
  const line = theme.palette.divider;

  return (
    <Box
      aria-hidden
      sx={{
        position: 'relative',
        height: 168,
        borderRadius: 1.5,
        bgcolor: 'background.neutral',
        overflow: 'hidden',
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 400 168"
        preserveAspectRatio="xMidYMid meet"
        sx={{ position: 'absolute', inset: 0, width: 1, height: 1 }}
      >
        {flying ? (
          <>
            <path
              ref={refs.p1}
              d="M 168 82 C 210 76, 240 30, 278 32 S 342 14, 384 8"
              fill="none"
              stroke={accent}
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.55"
            />
            <path
              ref={refs.p2}
              d="M 172 100 C 222 108, 252 66, 296 62 S 356 42, 392 36"
              fill="none"
              stroke={accent}
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeDasharray="2 5"
              opacity="0.45"
            />
            <g ref={refs.pl1} style={{ opacity: 0 }}>
              <polygon points="-9,-5 9,0 -9,5 -5,0" fill={accent} />
            </g>
            <g ref={refs.pl2} style={{ opacity: 0 }}>
              <polygon points="-7,-4 7,0 -7,4 -4,0" fill={accent} />
            </g>
          </>
        ) : null}
      </Box>

      {/* The letter */}
      <Box
        ref={refs.doc}
        sx={{
          position: 'absolute',
          left: { xs: '18%', sm: '28%' },
          top: 16,
          width: 104,
          height: 136,
          bgcolor: 'background.paper',
          border: `1px solid ${line}`,
          borderRadius: 1,
          boxShadow: '0 14px 30px -18px rgba(15,30,60,.45)',
          p: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.9,
          transition: 'transform .5s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <Box
          sx={{
            width: 7,
            height: 20,
            border: `1.5px solid ${accent}`,
            borderRadius: '40%',
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              left: 1.5,
              top: 3,
              width: 2,
              height: 11,
              bgcolor: accent,
              borderRadius: 1,
            },
          }}
        />
        {[60, 86, 72].map((w) => (
          <Box key={w} sx={{ width: `${w}%`, height: 3, borderRadius: 1, bgcolor: line }} />
        ))}
        <Box sx={{ height: 12, borderRadius: 0.5, bgcolor: accent, opacity: 0.85 }} />
        {[86, 44].map((w) => (
          <Box key={w} sx={{ width: `${w}%`, height: 3, borderRadius: 1, bgcolor: line }} />
        ))}
        {kind === 'signed' ? (
          <Box sx={{ position: 'relative', mt: 'auto', height: 18 }}>
            <Box
              component="svg"
              viewBox="0 0 80 18"
              sx={{ position: 'absolute', inset: 0, width: 1, height: 1, overflow: 'visible' }}
            >
              <path
                ref={refs.sig}
                d="M2 13 C 8 2, 12 2, 13 12 S 19 15, 22 6 C 24 1, 28 14, 31 11 S 37 4, 40 9 C 43 14, 47 6, 52 8 S 62 12, 76 5"
                fill="none"
                stroke={accent}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Box>
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: '1px',
                bgcolor: 'text.disabled',
              }}
            />
          </Box>
        ) : null}
        {documentId ? (
          <Typography
            sx={{
              mt: kind === 'signed' ? 0.5 : 'auto',
              fontFamily: 'monospace',
              fontSize: 8,
              color: 'text.secondary',
              letterSpacing: 0.4,
            }}
          >
            {documentId}
          </Typography>
        ) : null}
      </Box>

      {/* Preparing… */}
      <Box
        sx={{
          position: 'absolute',
          left: { xs: '18%', sm: '28%' },
          bottom: 6,
          width: 104,
          height: 3,
          borderRadius: 1,
          bgcolor: line,
          overflow: 'hidden',
          transition: 'opacity .3s',
        }}
      >
        <Box
          ref={refs.fill}
          sx={{
            height: 1,
            width: 1,
            bgcolor: accent,
            transformOrigin: 'left',
            transform: 'scaleX(0)',
          }}
        />
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------- dialog

function Tick() {
  return (
    <Box component="svg" viewBox="0 0 16 16" sx={{ width: 16, height: 16 }}>
      <path
        d="M3.5 8.5 L6.6 11.4 L12.5 4.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Box>
  );
}

/** Mount once (root layout). Shows each celebrate() call in turn. */
export function SuccessMomentHost() {
  const [current, setCurrent] = useState(null);
  const [landed, setLanded] = useState(false);

  const next = useCallback(() => {
    setLanded(false);
    setCurrent(queue.shift() ?? null);
  }, []);

  useEffect(() => {
    listener = () => setCurrent((c) => c ?? queue.shift() ?? null);
    listener();
    return () => {
      listener = null;
    };
  }, []);

  const close = () => {
    current?.resolve();
    next();
  };

  const runAction = () => {
    const action = current?.onAction;
    close();
    action?.();
  };

  if (!current) return null;
  const kind = current.kind || 'sent';

  return (
    <Dialog
      open
      onClose={close}
      maxWidth="xs"
      fullWidth
      aria-labelledby="success-moment-title"
      slotProps={{ paper: { sx: { p: 2.5, borderRadius: 2 } } }}
    >
      <Stage
        kind={kind}
        documentId={current.documentId}
        runKey={current.key}
        onLanded={() => setLanded(true)}
      />
      <Stack
        spacing={1}
        sx={{
          mt: 2.5,
          opacity: landed ? 1 : 0,
          transform: landed ? 'none' : 'translateY(6px)',
          transition: 'opacity .35s ease, transform .35s ease',
        }}
      >
        <Box
          sx={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            pl: 0.75,
            pr: 1.25,
            py: 0.25,
            borderRadius: 99,
            bgcolor: 'success.lighter',
            color: 'success.darker',
            typography: 'subtitle2',
            transform: landed ? 'scale(1)' : 'scale(.7)',
            transition: 'transform .3s cubic-bezier(.3,1.6,.5,1)',
            transformOrigin: 'left center',
          }}
        >
          <Tick />
          {current.chip || DEFAULT_CHIP[kind]}
        </Box>
        <Typography id="success-moment-title" variant="h6" sx={{ textWrap: 'balance' }}>
          {current.title}
        </Typography>
        {current.description ? (
          <Typography variant="body2" color="text.secondary">
            {current.description}
          </Typography>
        ) : null}
      </Stack>
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2.5 }}>
        {current.actionLabel ? (
          <Button color="inherit" onClick={runAction}>
            {current.actionLabel}
          </Button>
        ) : null}
        <Button variant="contained" onClick={close} autoFocus>
          Done
        </Button>
      </Stack>
    </Dialog>
  );
}
