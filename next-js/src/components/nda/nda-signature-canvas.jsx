'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { inkVerdict, measureCanvasInk } from 'src/utils/signature-ink';

import { Iconify } from 'src/components/iconify';

import { SignaturePhonePanel } from './signature-phone-panel';

// ----------------------------------------------------------------------

/**
 * Signature styles for Type mode (Google Fonts). `scale` evens out how large
 * each face draws at the same font size, so every style fills the pad.
 */
const SIGNATURE_FONTS = [
  { family: 'Dancing Script', scale: 1 },
  { family: 'Great Vibes', scale: 1.05 },
  { family: 'Pinyon Script', scale: 0.95 },
  { family: 'Allura', scale: 1.1 },
  { family: 'Alex Brush', scale: 1 },
  { family: 'Sacramento', scale: 1.15 },
  { family: 'Mrs Saint Delafield', scale: 1.25 },
  { family: 'Herr Von Muellerhoff', scale: 1.3 },
  { family: 'Monsieur La Doulaise', scale: 1.05 },
  { family: 'Homemade Apple', scale: 0.75 },
  { family: 'La Belle Aurore', scale: 0.9 },
  { family: 'Mr Dafoe', scale: 1.05 },
];

const FONTS_LINK_ID = 'signature-fonts-v2';
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Great+Vibes' +
  '&family=Pinyon+Script&family=Allura&family=Alex+Brush&family=Sacramento' +
  '&family=Mrs+Saint+Delafield&family=Herr+Von+Muellerhoff&family=Monsieur+La+Doulaise' +
  '&family=Homemade+Apple&family=La+Belle+Aurore&family=Mr+Dafoe&display=swap';

/** Pen colours. Blue-black reads as a wet-ink original on a printed page. */
const INK_COLORS = [
  { label: 'Blue ink', value: '#1b3a8c' },
  { label: 'Black ink', value: '#111827' },
];

/**
 * The canvas is drawn at a fixed 2× of its nominal size whatever the screen,
 * so the exported PNG is crisp in a PDF and the API's minimum-ink rule means
 * the same thing on every device.
 */
const SCALE = 2;

/** Stroke width range, in canvas pixels. */
const MIN_WIDTH = 1.1 * SCALE;
const MAX_WIDTH = 3.4 * SCALE;

/** Transparent margin kept around the ink when the signature is cropped. */
const TRIM_PADDING = 10 * SCALE;

const CLICK_PEN_KEY = 'signature-pad:click-pen';

const HINTS = {
  blank: 'Sign inside the box.',
  'too-small': 'Too small to accept — sign across the box, as you would on paper.',
};

// ----------------------------------------------------------------------

/**
 * Width for the next point. A pen's pressure sets it directly; for a finger
 * or mouse, faster movement thins the line the way real ink does.
 */
function nextWidth(prev, point, pointerType, pressure) {
  if (pointerType === 'pen' && pressure > 0) {
    return MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * Math.min(1, pressure) ** 0.8;
  }
  if (!prev) return (MIN_WIDTH + MAX_WIDTH) / 2;
  const dt = Math.max(1, point.t - prev.t);
  const velocity = Math.hypot(point.x - prev.x, point.y - prev.y) / SCALE / dt; // css px / ms
  const v = 0.7 * velocity + 0.3 * (prev.v ?? velocity);
  point.v = v;
  const target = Math.max(MIN_WIDTH, MAX_WIDTH / (v + 1));
  return prev.w + (target - prev.w) * 0.35;
}

/** Draws the segment ending at points[i], smoothed through the midpoints. */
function drawSegment(ctx, points, i, color) {
  const p1 = points[i - 1];
  const p2 = points[i];
  const p0 = points[i - 2] || p1;
  const from = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  const to = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  ctx.strokeStyle = color;
  ctx.lineWidth = (p1.w + p2.w) / 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(p1.x, p1.y, to.x, to.y);
  ctx.stroke();
}

function drawDot(ctx, point, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(point.x, point.y, point.w / 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawStroke(ctx, stroke) {
  if (stroke.points.length === 1) {
    drawDot(ctx, stroke.points[0], stroke.color);
    return;
  }
  for (let i = 1; i < stroke.points.length; i += 1)
    drawSegment(ctx, stroke.points, i, stroke.color);
}

/**
 * A pen swash under a typed signature: starts thin under the first letter,
 * swells, and tapers off past the last one.
 */
function drawFlourish(ctx, x, baseline, textWidth, color) {
  const start = { x: x - 4 * SCALE, y: baseline + 10 * SCALE };
  const c1 = { x: x + textWidth * 0.35, y: baseline + 22 * SCALE };
  const c2 = { x: x + textWidth * 0.75, y: baseline + 2 * SCALE };
  const end = { x: x + textWidth + 14 * SCALE, y: baseline - 4 * SCALE };
  const steps = 48;
  let prev = start;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const mt = 1 - t;
    const pt = {
      x: mt ** 3 * start.x + 3 * mt ** 2 * t * c1.x + 3 * mt * t ** 2 * c2.x + t ** 3 * end.x,
      y: mt ** 3 * start.y + 3 * mt ** 2 * t * c1.y + 3 * mt * t ** 2 * c2.y + t ** 3 * end.y,
    };
    ctx.lineWidth = MIN_WIDTH * 0.6 + MAX_WIDTH * 0.7 * Math.sin(Math.PI * t);
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    prev = pt;
  }
}

/** The signature cropped to its ink plus a margin, as a transparent PNG. */
function exportTrimmed(canvas, box) {
  const x = Math.max(0, box.x - TRIM_PADDING);
  const y = Math.max(0, box.y - TRIM_PADDING);
  const w = Math.min(canvas.width - x, box.width + TRIM_PADDING * 2);
  const h = Math.min(canvas.height - y, box.height + TRIM_PADDING * 2);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  out.getContext('2d').drawImage(canvas, x, y, w, h, 0, 0, w, h);
  return out.toDataURL('image/png');
}

function readClickPen() {
  try {
    return window.localStorage.getItem(CLICK_PEN_KEY) === '1';
  } catch {
    return false;
  }
}

function writeClickPen(on) {
  try {
    window.localStorage.setItem(CLICK_PEN_KEY, on ? '1' : '0');
  } catch {
    // Private mode / blocked storage: the setting just isn't remembered.
  }
}

// ----------------------------------------------------------------------

/**
 * A signature pad with three ways to sign:
 *  - Draw  : freehand, pressure- and speed-sensitive ink. With a mouse,
 *            "Click to start / stop" lets the pen follow the pointer without
 *            holding the button down.
 *  - Type  : your name in one of twelve signature styles, with an optional
 *            flourish
 *  - Phone : scan a QR code and sign with your finger (only when the page
 *            passes `phoneHandoff`)
 *
 * Apply stays disabled until there is enough ink to be a signature (the same
 * rule the API enforces), and the exported image holds only the signature —
 * the guide line and hints are page elements, not part of the drawing. Any
 * change after Apply withdraws the applied signature (onSave('', null)), so
 * what is submitted is always what is on the pad.
 *
 * Props:
 *  - width, height       : nominal canvas size (drawn at 2×)
 *  - onSave(dataUrl, meta): on Apply; meta = { method: 'drawn'|'typed'|'phone', handoffId? }.
 *                          ('', null) when withdrawn. Pass meta to the sign call.
 *  - phoneHandoff        : { create() } — enables the Phone tab (see SignaturePhonePanel)
 *  - disabled            : locks the canvas
 *  - label               : optional label shown above the tabs
 */
export default function NdaSignatureCanvas({
  width = 500,
  height = 160,
  onSave,
  phoneHandoff,
  disabled = false,
  label,
}) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const activeRef = useRef(null); // { pointerId, stroke, click }

  const [mode, setMode] = useState('draw'); // 'draw' | 'type' | 'phone'
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].family);
  const [flourish, setFlourish] = useState(false);
  const [inkColor, setInkColor] = useState(INK_COLORS[0].value);
  const [fontsReady, setFontsReady] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [verdict, setVerdict] = useState('blank');
  const [applied, setApplied] = useState(false);
  const [finePointer, setFinePointer] = useState(false);
  const [clickPen, setClickPen] = useState(false);
  const [penDown, setPenDown] = useState(false);
  const [phoneSignature, setPhoneSignature] = useState(null); // { dataUrl, handoffId }

  // ── Fonts, pointer type, remembered settings ────────────────────────────────
  useEffect(() => {
    if (!document.getElementById(FONTS_LINK_ID)) {
      const link = document.createElement('link');
      link.id = FONTS_LINK_ID;
      link.rel = 'stylesheet';
      link.href = FONTS_HREF;
      document.head.appendChild(link);
    }
    // Ask for each face explicitly: fonts.ready alone can settle before an
    // unused face is fetched, and the typed signature would render in fallback.
    Promise.all(SIGNATURE_FONTS.map((f) => document.fonts.load(`48px '${f.family}'`)))
      .catch(() => undefined)
      .then(() => setFontsReady(true));

    setFinePointer(window.matchMedia?.('(pointer: fine)').matches ?? false);
    setClickPen(readClickPen());
  }, []);

  // ── Canvas helpers ──────────────────────────────────────────────────────────

  /** Anything that changes the pad withdraws a signature already applied. */
  const withdraw = useCallback(() => {
    if (applied) {
      setApplied(false);
      onSave?.('', null);
    }
  }, [applied, onSave]);

  const evaluate = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) setVerdict(inkVerdict(measureCanvasInk(canvas)));
  }, []);

  const redrawStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokesRef.current.forEach((s) => drawStroke(ctx, s));
    setStrokeCount(strokesRef.current.length);
    evaluate();
  }, [evaluate]);

  const renderTypedSignature = useCallback(
    (name, fontFamily, color, withFlourish) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const text = name.trim();
      if (text) {
        const face = SIGNATURE_FONTS.find((f) => f.family === fontFamily) || SIGNATURE_FONTS[0];
        const font = (size) => `${size}px '${face.family}', cursive`;
        // Largest size that fits the width (the flourish needs a little more room)
        const maxWidth = canvas.width - (withFlourish ? 56 : 32) * SCALE;
        let fontSize = Math.min(68 * SCALE * face.scale, canvas.height - 44 * SCALE);
        ctx.font = font(fontSize);
        while (ctx.measureText(text).width > maxWidth && fontSize > 14 * SCALE) {
          fontSize -= 2 * SCALE;
          ctx.font = font(fontSize);
        }
        ctx.fillStyle = color;
        ctx.textBaseline = 'alphabetic';
        const textWidth = ctx.measureText(text).width;
        const x = Math.max(16 * SCALE, (canvas.width - textWidth) / 2);
        const baseline = canvas.height - (withFlourish ? 40 : 30) * SCALE;
        ctx.fillText(text, x, baseline);
        if (withFlourish) drawFlourish(ctx, x, baseline, textWidth, color);
      }
      evaluate();
    },
    [evaluate]
  );

  // ── Sync canvas whenever what it shows changes ──────────────────────────────
  useEffect(() => {
    if (mode === 'draw') {
      redrawStrokes();
    } else if (mode === 'type') {
      renderTypedSignature(typedName, selectedFont, inkColor, flourish);
    }
  }, [
    mode,
    typedName,
    selectedFont,
    inkColor,
    flourish,
    fontsReady,
    redrawStrokes,
    renderTypedSignature,
  ]);

  // ── Draw-mode pointer handlers ──────────────────────────────────────────────

  function toCanvasPoint(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
      t: e.timeStamp || performance.now(),
    };
  }

  function addPoint(e) {
    const active = activeRef.current;
    const { points, color } = active.stroke;
    const point = toCanvasPoint(e);
    const prev = points[points.length - 1];
    if (prev && Math.hypot(point.x - prev.x, point.y - prev.y) < 1) return;
    point.w = nextWidth(prev, point, e.pointerType, e.pressure);
    points.push(point);
    if (points.length > 1) {
      drawSegment(canvasRef.current.getContext('2d'), points, points.length - 1, color);
    }
  }

  const finishStroke = useCallback(() => {
    const active = activeRef.current;
    if (!active) return;
    activeRef.current = null;
    setPenDown(false);
    if (active.stroke.points.length === 1) {
      drawDot(canvasRef.current.getContext('2d'), active.stroke.points[0], active.stroke.color);
    }
    strokesRef.current = [...strokesRef.current, active.stroke];
    setStrokeCount(strokesRef.current.length);
    evaluate();
  }, [evaluate]);

  // Escape lifts a click-to-draw pen.
  useEffect(() => {
    if (!penDown) return undefined;
    const onKey = (e) => e.key === 'Escape' && finishStroke();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [penDown, finishStroke]);

  const isClickPen = (e) => clickPen && e.pointerType === 'mouse';

  function handlePointerDown(e) {
    if (disabled || mode !== 'draw') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();

    // Click-to-draw: this click lifts a pen that is down.
    if (activeRef.current?.click) {
      finishStroke();
      return;
    }
    if (activeRef.current) return;

    withdraw();
    const click = isClickPen(e);
    if (!click) e.currentTarget.setPointerCapture?.(e.pointerId);
    activeRef.current = { pointerId: e.pointerId, stroke: { color: inkColor, points: [] }, click };
    setPenDown(click);
    addPoint(e);
  }

  function handlePointerMove(e) {
    if (activeRef.current?.pointerId !== e.pointerId) return;
    e.preventDefault();
    // Fast strokes deliver several samples per frame; use them all for smooth curves.
    const events = e.nativeEvent.getCoalescedEvents?.() || [];
    if (events.length) events.forEach(addPoint);
    else addPoint(e);
  }

  function handlePointerUp(e) {
    const active = activeRef.current;
    if (active?.pointerId !== e.pointerId || active.click) return;
    finishStroke();
  }

  function handlePointerLeave(e) {
    // A click-to-draw pen lifts when the pointer leaves the pad.
    if (activeRef.current?.click && activeRef.current.pointerId === e.pointerId) finishStroke();
  }

  // ── Action handlers ─────────────────────────────────────────────────────────

  function handleClear() {
    withdraw();
    if (mode === 'draw') {
      activeRef.current = null;
      setPenDown(false);
      strokesRef.current = [];
      redrawStrokes();
    } else if (mode === 'type') {
      setTypedName('');
    } else {
      setPhoneSignature(null);
    }
  }

  function handleUndo() {
    withdraw();
    strokesRef.current = strokesRef.current.slice(0, -1);
    redrawStrokes();
  }

  function handleSave() {
    if (mode === 'phone') {
      if (!phoneSignature) return;
      // Sent exactly as received: the API checks it against the phone's copy.
      onSave?.(phoneSignature.dataUrl, { method: 'phone', handoffId: phoneSignature.handoffId });
      setApplied(true);
      return;
    }
    const canvas = canvasRef.current;
    const ink = measureCanvasInk(canvas);
    const result = inkVerdict(ink);
    setVerdict(result);
    if (result !== 'ok') return;
    onSave?.(exportTrimmed(canvas, ink.box), { method: mode === 'type' ? 'typed' : 'drawn' });
    setApplied(true);
  }

  function handleModeChange(_, newMode) {
    if (!newMode) return;
    withdraw();
    finishStroke();
    setMode(newMode);
  }

  function handleColorChange(value) {
    if (value === inkColor) return;
    withdraw();
    // Recolour what is already drawn, so one signature is one colour.
    strokesRef.current = strokesRef.current.map((s) => ({ ...s, color: value }));
    setInkColor(value);
  }

  function handleClickPenChange(on) {
    finishStroke();
    setClickPen(on);
    writeClickPen(on);
  }

  const handlePhoneReceived = useCallback(
    (dataUrl, handoffId) => setPhoneSignature({ dataUrl, handoffId }),
    []
  );

  const hasMarks =
    mode === 'draw' ? strokeCount > 0 : mode === 'type' ? !!typedName.trim() : !!phoneSignature;
  const canApply = mode === 'phone' ? !!phoneSignature : verdict === 'ok';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Box>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          {label}
        </Typography>
      )}

      {/* Mode tabs + ink colour */}
      {!disabled && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Tabs
            value={mode}
            onChange={handleModeChange}
            sx={{ minHeight: 36 }}
            TabIndicatorProps={{ style: { height: 2 } }}
          >
            <Tab value="draw" label="Draw" sx={{ minHeight: 36, py: 0.5, fontSize: '0.8rem' }} />
            <Tab value="type" label="Type" sx={{ minHeight: 36, py: 0.5, fontSize: '0.8rem' }} />
            {phoneHandoff && (
              <Tab
                value="phone"
                label="Use my phone"
                icon={<Iconify icon="solar:smartphone-2-bold" width={16} />}
                iconPosition="start"
                sx={{ minHeight: 36, py: 0.5, fontSize: '0.8rem' }}
              />
            )}
          </Tabs>
          {mode !== 'phone' && (
            <Stack direction="row" spacing={0.75} alignItems="center">
              {INK_COLORS.map((c) => (
                <Tooltip key={c.value} title={c.label}>
                  <Box
                    component="button"
                    type="button"
                    aria-label={c.label}
                    aria-pressed={inkColor === c.value}
                    onClick={() => handleColorChange(c.value)}
                    sx={{
                      width: 22,
                      height: 22,
                      p: 0,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      bgcolor: c.value,
                      border: '2px solid',
                      borderColor: 'background.paper',
                      outline: inkColor === c.value ? '2px solid' : '1px solid',
                      outlineColor: inkColor === c.value ? c.value : 'divider',
                    }}
                  />
                </Tooltip>
              ))}
            </Stack>
          )}
        </Stack>
      )}

      {/* Type mode: name, then pick a style (each previewed with the name) */}
      {mode === 'type' && !disabled && (
        <Stack spacing={1.25} sx={{ mb: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Type your full name"
            value={typedName}
            onChange={(e) => {
              withdraw();
              setTypedName(e.target.value);
            }}
            inputProps={{ maxLength: 60 }}
          />
          <Box
            role="radiogroup"
            aria-label="Signature style"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
              gap: 1,
              maxHeight: 196,
              overflowY: 'auto',
              pr: 0.5,
            }}
          >
            {SIGNATURE_FONTS.map((f) => {
              const selected = selectedFont === f.family;
              return (
                <ButtonBase
                  key={f.family}
                  role="radio"
                  aria-checked={selected}
                  aria-label={f.family}
                  onClick={() => {
                    withdraw();
                    setSelectedFont(f.family);
                  }}
                  sx={{
                    height: 56,
                    px: 1,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: selected ? 'primary.main' : 'divider',
                    boxShadow: (theme) =>
                      selected ? `0 0 0 1px ${theme.vars.palette.primary.main}` : 'none',
                    bgcolor: '#fff',
                    color: inkColor,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      fontFamily: `'${f.family}', cursive`,
                      fontSize: 22 * f.scale,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                    }}
                  >
                    {typedName.trim() || 'Your Name'}
                  </Box>
                </ButtonBase>
              );
            })}
          </Box>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={flourish}
                onChange={(e) => {
                  withdraw();
                  setFlourish(e.target.checked);
                }}
              />
            }
            label={<Typography variant="caption">Add a flourish underline</Typography>}
          />
        </Stack>
      )}

      {/* Phone mode */}
      {mode === 'phone' && !disabled && phoneHandoff && (
        <Box sx={{ mb: 1 }}>
          {phoneSignature ? (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'primary.main',
                borderRadius: 1,
                p: 2,
                bgcolor: '#fff',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Box
                component="img"
                src={phoneSignature.dataUrl}
                alt="Signature from your phone"
                sx={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain' }}
              />
            </Box>
          ) : (
            <SignaturePhonePanel create={phoneHandoff.create} onReceived={handlePhoneReceived} />
          )}
        </Box>
      )}

      {/* Pad: the guide line and hint sit over the canvas, outside the exported image */}
      <Box
        sx={{
          display: mode === 'phone' ? 'none' : 'block',
          position: 'relative',
          border: '1px solid',
          borderColor: penDown ? 'success.main' : disabled ? 'divider' : 'primary.main',
          boxShadow: (theme) => (penDown ? `0 0 0 2px ${theme.vars.palette.success.main}` : 'none'),
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: disabled ? 'grey.100' : '#fff',
          cursor: disabled || mode === 'type' ? 'default' : 'crosshair',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: '18%',
            borderBottom: '1px dashed #bbb',
            pointerEvents: 'none',
          }}
        />
        <Typography
          aria-hidden
          sx={{
            position: 'absolute',
            left: 18,
            bottom: 'calc(18% + 2px)',
            color: '#9e9e9e',
            fontSize: 18,
            lineHeight: 1,
            pointerEvents: 'none',
          }}
        >
          ×
        </Typography>
        {!hasMarks && !disabled && (
          <Typography
            aria-hidden
            variant="caption"
            sx={{
              position: 'absolute',
              left: 16,
              bottom: 4,
              color: '#9e9e9e',
              pointerEvents: 'none',
            }}
          >
            {mode === 'type'
              ? 'Type your name to preview'
              : clickPen && finePointer
                ? 'Click to put the pen down, move to sign, click again to lift'
                : 'Sign above the line'}
          </Typography>
        )}
        <canvas
          ref={canvasRef}
          width={width * SCALE}
          height={height * SCALE}
          aria-label="Signature pad"
          style={{ display: 'block', width: '100%', touchAction: 'none', position: 'relative' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={finishStroke}
          onPointerLeave={handlePointerLeave}
        />
      </Box>

      {!disabled && mode !== 'phone' && hasMarks && verdict !== 'ok' && (
        <Typography variant="caption" color="warning.main" sx={{ mt: 0.75, display: 'block' }}>
          {HINTS[verdict]}
        </Typography>
      )}
      {!disabled && mode === 'draw' && penDown && (
        <Typography variant="caption" color="success.main" sx={{ mt: 0.75, display: 'block' }}>
          Pen is down — click to lift it (or press Esc).
        </Typography>
      )}
      {!disabled && mode === 'draw' && !hasMarks && !finePointer && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
          Sign with your finger or a stylus for the most natural signature.
        </Typography>
      )}

      {!disabled && (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}>
          <Button size="small" variant="outlined" color="inherit" onClick={handleClear}>
            Clear
          </Button>
          {mode === 'draw' && (
            <Button
              size="small"
              color="inherit"
              onClick={handleUndo}
              disabled={strokeCount === 0}
              startIcon={<Iconify icon="eva:arrow-back-fill" width={16} />}
            >
              Undo
            </Button>
          )}
          <Button
            size="small"
            variant="contained"
            onClick={handleSave}
            disabled={!canApply || applied}
          >
            {applied ? 'Signature applied' : 'Apply Signature'}
          </Button>
          {applied && (
            <Iconify icon="solar:check-circle-bold" width={20} sx={{ color: 'success.main' }} />
          )}
          {mode === 'draw' && finePointer && (
            <Tooltip title="For a mouse or trackpad: no need to hold the button down while you sign">
              <FormControlLabel
                sx={{ ml: 'auto !important', mr: 0 }}
                control={
                  <Switch
                    size="small"
                    checked={clickPen}
                    onChange={(e) => handleClickPenChange(e.target.checked)}
                  />
                }
                label={<Typography variant="caption">Click to start / stop</Typography>}
              />
            </Tooltip>
          )}
        </Stack>
      )}
    </Box>
  );
}
