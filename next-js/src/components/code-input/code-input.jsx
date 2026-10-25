'use client';

import { keyframes } from '@emotion/react';
import { useState, useEffect } from 'react';
import { MuiOtpInput } from 'mui-one-time-password-input';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { inputBaseClasses } from '@mui/material/InputBase';

// ----------------------------------------------------------------------

const LENGTH = 6;

const pop = keyframes`
  0% { transform: scale(0.6); opacity: 0.2; }
  70% { transform: scale(1.12); }
  100% { transform: scale(1); opacity: 1; }
`;

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(7px); }
  60% { transform: translateX(-5px); }
  80% { transform: translateX(3px); }
`;

/**
 * The 6-digit code in pasted text: "123456", "123 456", "123-456", or a
 * message such as "Your IOTA code is 123456". Empty when there isn't one.
 */
export function codeFromText(text) {
  const s = String(text ?? '');
  const digits = s.replace(/\D/g, '');
  if (digits.length === LENGTH) return digits;
  const run = s.match(/(?:^|\D)(\d{6})(?!\d)/);
  return run ? run[1] : '';
}

const isTouch = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

/**
 * Six boxes for a one-time code. Typing moves box to box; pasting (Ctrl/⌘+V,
 * or long-press → Paste on a phone, into any box) fills all six and calls
 * onComplete so the caller can verify straight away. The boxes shake when
 * `error` becomes set.
 *
 * There is no "Paste code" button: reading the clipboard from a button needs
 * the browser's permission, which several browsers refuse or hide, so it
 * failed for people while the keyboard paste always works.
 *
 * value: string of digits; onChange(code); onComplete?(code);
 * error: message or boolean; size: 'medium' | 'small'.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  error,
  disabled,
  autoFocus,
  helperText,
  size = 'medium',
  align = 'center',
  sx,
}) {
  const [hint, setHint] = useState('');
  const [shaking, setShaking] = useState(false);
  const small = size === 'small';

  useEffect(() => {
    if (!error) return undefined;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 450);
    return () => clearTimeout(t);
  }, [error]);

  // Worked out after mounting: the server can't know the device, and a
  // different first render would not match the page it sent.
  const [pasteHint, setPasteHint] = useState('');
  useEffect(() => {
    if (isTouch()) setPasteHint('To paste, tap and hold the first box, then tap Paste.');
    else
      setPasteHint(
        `To paste, click a box and press ${/Mac/.test(navigator.userAgent) ? '⌘V' : 'Ctrl+V'}.`
      );
  }, []);

  const fill = (text) => {
    const code = codeFromText(text);
    if (!code) {
      setHint(`There is no ${LENGTH}-digit code in what you pasted.`);
      return;
    }
    setHint('');
    onChange(code);
    onComplete?.(code);
  };

  const boxSize = small ? 40 : 52;
  const justify = align === 'center' ? 'center' : 'flex-start';

  return (
    <Stack spacing={1} alignItems={align === 'center' ? 'center' : 'flex-start'} sx={sx}>
      <Box
        // Handle paste here, before the library's handler, which rejects
        // "123 456" and text around the code.
        onPasteCapture={(e) => {
          if (disabled) return;
          e.preventDefault();
          e.stopPropagation();
          const data = e.clipboardData;
          fill(data?.getData('text/plain') || data?.getData('text') || '');
        }}
        // A code can also arrive without a paste event — the phone keyboard's
        // clipboard suggestion, "AutoFill from Messages/Passwords", a password
        // manager — as several characters typed into whichever box has focus.
        // The library keeps only the first character unless it is the first
        // box (and even then cuts "123 456" short), so take the whole code here.
        onChangeCapture={(e) => {
          const text = e.target?.value ?? '';
          if (disabled || text.length <= 1) return;
          if (!codeFromText(text)) return;
          e.stopPropagation();
          fill(text);
        }}
        sx={{
          width: 1,
          animation: shaking ? `${shake} 0.45s ease-in-out` : 'none',
          [`& .${inputBaseClasses.input}`]: {
            p: 0,
            height: 'auto',
            aspectRatio: '1/1',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: small ? '1.1rem' : '1.4rem',
            fontVariantNumeric: 'tabular-nums',
            '&:not(:placeholder-shown)': { animation: `${pop} 0.18s ease-out` },
          },
          // A gap after the third box reads as "123 456".
          '& .MuiOtpInput-TextField-3': { mr: small ? 1 : 1.5 },
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            [`& .${inputBaseClasses.input}`]: { animation: 'none !important' },
          },
        }}
      >
        <MuiOtpInput
          length={LENGTH}
          value={value}
          onChange={(v) => {
            setHint('');
            onChange(v.replace(/\D/g, '').slice(0, LENGTH));
          }}
          validateChar={(c) => /\d/.test(c)}
          autoFocus={autoFocus}
          gap={small ? 1 : 1.25}
          sx={{ justifyContent: justify, '& .MuiFormControl-root': { maxWidth: boxSize } }}
          TextFieldsProps={{
            disabled,
            error: !!error,
            placeholder: '·',
            size: small ? 'small' : 'medium',
            inputProps: { inputMode: 'numeric', autoComplete: 'one-time-code' },
          }}
        />
      </Box>

      <Typography
        variant="caption"
        color={hint ? 'warning.main' : 'text.secondary'}
        sx={{ minHeight: 20 }}
      >
        {hint || helperText || pasteHint}
      </Typography>
    </Stack>
  );
}
