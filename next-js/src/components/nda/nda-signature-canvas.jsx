'use client';

import { useRef, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

/**
 * A drawable signature canvas component.
 *
 * Props:
 *  - width, height     : canvas dimensions
 *  - onSave(dataUrl)   : called with a base64 PNG when the user hits "Apply Signature"
 *  - disabled          : locks the canvas
 *  - label             : optional label shown above the canvas
 */
export default function NdaSignatureCanvas({
  width = 400,
  height = 140,
  onSave,
  disabled = false,
  label,
}) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Draw the placeholder dashed line
  const drawPlaceholder = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, canvas.height - 20);
    ctx.lineTo(canvas.width - 16, canvas.height - 20);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ccc';
    ctx.font = '12px sans-serif';
    ctx.fillText('Sign above the line', 16, canvas.height - 6);
  }, []);

  useEffect(() => {
    drawPlaceholder();
  }, [drawPlaceholder]);

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
    if (disabled) return;
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  }

  function draw(e) {
    if (!isDrawing.current || disabled) return;
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

  function handleClear() {
    drawPlaceholder();
  }

  function handleSave() {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSave?.(dataUrl);
  }

  return (
    <Box>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          {label}
        </Typography>
      )}
      <Box
        sx={{
          border: '1px solid',
          borderColor: disabled ? 'divider' : 'primary.main',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: disabled ? 'grey.100' : 'background.paper',
          cursor: disabled ? 'not-allowed' : 'crosshair',
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
          <Button size="small" variant="contained" onClick={handleSave}>
            Apply Signature
          </Button>
        </Stack>
      )}
    </Box>
  );
}
