'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { inkVerdict, measureCanvasInk } from 'src/utils/signature-ink';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/**
 * Signature fonts loaded from Google Fonts.
 * Each entry has a display label and the CSS font-family name.
 */
const SIGNATURE_FONTS = [
  { label: 'Classic', family: 'Dancing Script' },
  { label: 'Elegant', family: 'Great Vibes' },
  { label: 'Formal', family: 'Pinyon Script' },
];

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

// ----------------------------------------------------------------------

/**
 * A signature pad with two modes:
 *  - Draw : freehand, pressure- and speed-sensitive ink
 *  - Type : type your name and pick a signature font
 *
 * Apply stays disabled until there is enough ink to be a signature (the same
 * rule the API enforces), and the exported image holds only the signature —
 * the guide line and hints are page elements, not part of the drawing. Any
 * change after Apply withdraws the applied signature (onSave('')), so what is
 * submitted is always what is on the pad.
 *
 * Props:
 *  - width, height     : nominal canvas size (drawn at 2×)
 *  - onSave(dataUrl)   : base64 PNG on "Apply Signature"; '' when withdrawn
 *  - disabled          : locks the canvas
 *  - label             : optional label shown above the tabs
 */
export default function NdaSignatureCanvas({
  width = 500,
  height = 160,
  onSave,
  disabled = false,
  label,
}) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const activeRef = useRef(null); // { pointerId, stroke }

  const [mode, setMode] = useState('draw'); // 'draw' | 'type'
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].family);
  const [inkColor, setInkColor] = useState(INK_COLORS[0].value);
  const [fontsReady, setFontsReady] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [verdict, setVerdict] = useState('blank');
  const [applied, setApplied] = useState(false);

  // ── Load Google Fonts for signature styles ──────────────────────────────────
  useEffect(() => {
    const LINK_ID = 'nda-signature-fonts';
    if (!document.getElementById(LINK_ID)) {
      const link = document.createElement('link');
      link.id = LINK_ID;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Great+Vibes&family=Pinyon+Script&display=swap';
      document.head.appendChild(link);
    }
    // Ask for each face explicitly: fonts.ready alone can settle before an
    // unused face is fetched, and the typed signature would render in cursive fallback.
    Promise.all(SIGNATURE_FONTS.map((f) => document.fonts.load(`48px '${f.family}'`)))
      .catch(() => undefined)
      .then(() => setFontsReady(true));
  }, []);

  // ── Canvas helpers ──────────────────────────────────────────────────────────

  /** Anything that changes the pad withdraws a signature already applied. */
  const withdraw = useCallback(() => {
    if (applied) {
      setApplied(false);
      onSave?.('');
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
    (name, fontFamily, color) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const text = name.trim();
      if (text) {
        // Largest size that fits the width
        const maxWidth = canvas.width - 32 * SCALE;
        let fontSize = Math.min(68 * SCALE, canvas.height - 40 * SCALE);
        ctx.font = `${fontSize}px '${fontFamily}', cursive`;
        while (ctx.measureText(text).width > maxWidth && fontSize > 14 * SCALE) {
          fontSize -= 2 * SCALE;
          ctx.font = `${fontSize}px '${fontFamily}', cursive`;
        }
        ctx.fillStyle = color;
        ctx.textBaseline = 'alphabetic';
        const textWidth = ctx.measureText(text).width;
        const x = Math.max(16 * SCALE, (canvas.width - textWidth) / 2);
        ctx.fillText(text, x, canvas.height - 28 * SCALE);
      }
      evaluate();
    },
    [evaluate]
  );

  // ── Sync canvas whenever mode / typed name / font / colour changes ──────────
  useEffect(() => {
    if (mode === 'draw') {
      redrawStrokes();
    } else {
      renderTypedSignature(typedName, selectedFont, inkColor);
    }
  }, [mode, typedName, selectedFont, inkColor, fontsReady, redrawStrokes, renderTypedSignature]);

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

  function handlePointerDown(e) {
    if (disabled || mode !== 'draw' || activeRef.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    withdraw();
    const stroke = { color: inkColor, points: [] };
    activeRef.current = { pointerId: e.pointerId, stroke };
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
    if (active?.pointerId !== e.pointerId) return;
    activeRef.current = null;
    if (active.stroke.points.length === 1) {
      drawDot(canvasRef.current.getContext('2d'), active.stroke.points[0], active.stroke.color);
    }
    strokesRef.current = [...strokesRef.current, active.stroke];
    setStrokeCount(strokesRef.current.length);
    evaluate();
  }

  // ── Action handlers ─────────────────────────────────────────────────────────

  function handleClear() {
    withdraw();
    if (mode === 'draw') {
      strokesRef.current = [];
      redrawStrokes();
    } else {
      setTypedName('');
    }
  }

  function handleUndo() {
    withdraw();
    strokesRef.current = strokesRef.current.slice(0, -1);
    redrawStrokes();
  }

  function handleSave() {
    const canvas = canvasRef.current;
    const ink = measureCanvasInk(canvas);
    const result = inkVerdict(ink);
    setVerdict(result);
    if (result !== 'ok') return;
    onSave?.(exportTrimmed(canvas, ink.box));
    setApplied(true);
  }

  function handleModeChange(_, newMode) {
    if (!newMode) return;
    withdraw();
    setMode(newMode);
  }

  function handleColorChange(value) {
    if (value === inkColor) return;
    withdraw();
    // Recolour what is already drawn, so one signature is one colour.
    strokesRef.current = strokesRef.current.map((s) => ({ ...s, color: value }));
    setInkColor(value);
  }

  const hasMarks = mode === 'draw' ? strokeCount > 0 : !!typedName.trim();

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
          </Tabs>
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
        </Stack>
      )}

      {/* Type mode: name input + font picker */}
      {mode === 'type' && !disabled && (
        <Stack spacing={1} sx={{ mb: 1.5 }}>
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
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              Font style:
            </Typography>
            {SIGNATURE_FONTS.map((f) => (
              <Chip
                key={f.family}
                label={
                  <span style={{ fontFamily: `'${f.family}', cursive`, fontSize: '1rem' }}>
                    {f.label}
                  </span>
                }
                size="small"
                variant={selectedFont === f.family ? 'filled' : 'outlined'}
                color={selectedFont === f.family ? 'primary' : 'default'}
                onClick={() => {
                  withdraw();
                  setSelectedFont(f.family);
                }}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Stack>
      )}

      {/* Pad: the guide line and hint sit over the canvas, outside the exported image */}
      <Box
        sx={{
          position: 'relative',
          border: '1px solid',
          borderColor: disabled ? 'divider' : 'primary.main',
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
            {mode === 'draw' ? 'Sign above the line' : 'Type your name to preview'}
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
          onPointerCancel={handlePointerUp}
        />
      </Box>

      {!disabled && hasMarks && verdict !== 'ok' && (
        <Typography variant="caption" color="warning.main" sx={{ mt: 0.75, display: 'block' }}>
          {HINTS[verdict]}
        </Typography>
      )}
      {!disabled && mode === 'draw' && !hasMarks && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
          On a phone or tablet, sign with your finger or a stylus for the most natural signature.
        </Typography>
      )}

      {!disabled && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
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
            disabled={verdict !== 'ok' || applied}
          >
            {applied ? 'Signature applied' : 'Apply Signature'}
          </Button>
          {applied && (
            <Iconify icon="solar:check-circle-bold" width={20} sx={{ color: 'success.main' }} />
          )}
        </Stack>
      )}
    </Box>
  );
}
