'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

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

// ----------------------------------------------------------------------

/**
 * A signature canvas with two modes:
 *  - Draw : freehand drawing on the canvas (existing behaviour)
 *  - Type  : type your name and pick a signature font — rendered live on the canvas
 *
 * Props:
 *  - width, height     : canvas dimensions (internal coordinate space)
 *  - onSave(dataUrl)   : called with a base64 PNG when the user hits "Apply Signature"
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
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const [mode, setMode] = useState('draw'); // 'draw' | 'type'
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].family);
  const [fontsReady, setFontsReady] = useState(false);

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
    // Mark fonts ready once the browser has loaded them
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  // ── Canvas helpers ──────────────────────────────────────────────────────────

  const drawBaseline = useCallback((ctx, canvasEl) => {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, canvasEl.height - 20);
    ctx.lineTo(canvasEl.width - 16, canvasEl.height - 20);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const drawPlaceholder = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBaseline(ctx, canvas);
    ctx.fillStyle = '#ccc';
    ctx.font = '12px sans-serif';
    ctx.fillText('Sign above the line', 16, canvas.height - 6);
  }, [drawBaseline]);

  const renderTypedSignature = useCallback(
    (name, fontFamily) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBaseline(ctx, canvas);

      if (!name.trim()) {
        ctx.fillStyle = '#ccc';
        ctx.font = '12px sans-serif';
        ctx.fillText('Type your name to preview', 16, canvas.height - 6);
        return;
      }

      // Scale font size so the text fits within the canvas width
      const maxWidth = canvas.width - 32;
      let fontSize = Math.min(68, canvas.height - 40);
      ctx.font = `${fontSize}px '${fontFamily}', cursive`;

      // Shrink if the text overflows
      while (ctx.measureText(name).width > maxWidth && fontSize > 14) {
        fontSize -= 2;
        ctx.font = `${fontSize}px '${fontFamily}', cursive`;
      }

      ctx.fillStyle = '#0d1b2a';
      ctx.textBaseline = 'alphabetic';
      const textWidth = ctx.measureText(name).width;
      const x = Math.max(16, (canvas.width - textWidth) / 2);
      const y = canvas.height - 28;
      ctx.fillText(name, x, y);
    },
    [drawBaseline]
  );

  // ── Sync canvas whenever mode / typed name / font / fontsReady changes ──────
  useEffect(() => {
    if (mode === 'draw') {
      drawPlaceholder();
    } else {
      renderTypedSignature(typedName, selectedFont);
    }
  }, [mode, typedName, selectedFont, fontsReady, drawPlaceholder, renderTypedSignature]);

  // ── Draw-mode pointer handlers ──────────────────────────────────────────────

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e) {
    if (disabled || mode !== 'draw') return;
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  }

  function draw(e) {
    if (!isDrawing.current || disabled || mode !== 'draw') return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.strokeStyle = '#0d1b2a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }

  function stopDraw() {
    isDrawing.current = false;
  }

  // ── Action handlers ─────────────────────────────────────────────────────────

  function handleClear() {
    if (mode === 'draw') {
      drawPlaceholder();
    } else {
      setTypedName('');
    }
  }

  function handleSave() {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSave?.(dataUrl);
  }

  function handleModeChange(_, newMode) {
    if (!newMode) return;
    setMode(newMode);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Box>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          {label}
        </Typography>
      )}

      {/* Mode tabs */}
      {!disabled && (
        <Tabs
          value={mode}
          onChange={handleModeChange}
          sx={{ mb: 1.5, minHeight: 36 }}
          TabIndicatorProps={{ style: { height: 2 } }}
        >
          <Tab value="draw" label="Draw" sx={{ minHeight: 36, py: 0.5, fontSize: '0.8rem' }} />
          <Tab value="type" label="Type" sx={{ minHeight: 36, py: 0.5, fontSize: '0.8rem' }} />
        </Tabs>
      )}

      {/* Type mode: name input + font picker */}
      {mode === 'type' && !disabled && (
        <Stack spacing={1} sx={{ mb: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Type your full name"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
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
                onClick={() => setSelectedFont(f.family)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Stack>
      )}

      {/* Canvas */}
      <Box
        sx={{
          border: '1px solid',
          borderColor: disabled ? 'divider' : 'primary.main',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: disabled ? 'grey.100' : 'background.paper',
          cursor: disabled || mode === 'type' ? 'default' : 'crosshair',
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ display: 'block', width: '100%', touchAction: 'none' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </Box>

      {!disabled && (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button size="small" variant="outlined" color="inherit" onClick={handleClear}>
            Clear
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleSave}
            disabled={mode === 'type' && !typedName.trim()}
          >
            Apply Signature
          </Button>
        </Stack>
      )}
    </Box>
  );
}
