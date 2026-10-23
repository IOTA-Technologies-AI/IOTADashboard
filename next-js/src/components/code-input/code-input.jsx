'use client';

import { keyframes } from '@emotion/react';
import { useRef, useState, useEffect } from 'react';
import { MuiOtpInput } from 'mui-one-time-password-input';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { inputBaseClasses } from '@mui/material/InputBase';

import { Iconify } from 'src/components/iconify';

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
 * The clipboard's text. Uses clipboard.read() where the browser has it: it also
 * returns a code copied as rich text (an email, a web page), which readText()
 * can refuse on iPhone. Only one clipboard call per tap — a second one would
 * ask the phone's permission again ("Paste" bubble) and lose the tap.
 */
async function readClipboardText() {
  const cb = navigator.clipboard;
  if (cb?.read) {
    const items = await cb.read();
    for (const item of items) {
      const type = ['text/plain', 'text/html'].find((t) => item.types.includes(t));
      if (type) {
        const text = await (await item.getType(type)).text();
        // Strip tags from rich text; the code is in the words.
        return type === 'text/html' ? text.replace(/<[^>]*>/g, ' ') : text;
      }
    }
    return '';
  }
  if (cb?.readText) return cb.readText();
  throw new Error('This browser does not allow reading the clipboard.');
}

/**
 * Six boxes for a one-time code, with a "Paste code" button. Typing moves
 * box to box; pasting (the button, or Ctrl/⌘+V into any box) fills all six
 * and calls onComplete so the caller can verify straight away. The boxes
 * shake when `error` becomes set.
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
  const boxesRef = useRef(null);
  const [shaking, setShaking] = useState(false);
  const small = size === 'small';

  useEffect(() => {
    if (!error) return undefined;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 450);
    return () => clearTimeout(t);
  }, [error]);

  /** Put the cursor in the first box, so the phone's own Paste is one long-press away. */
  const focusFirstBox = () => {
    const first = boxesRef.current?.querySelector('input');
    if (first) {
      first.focus();
      first.select?.();
    }
  };

  const manualPasteHint = () => {
    if (isTouch()) return 'Tap and hold the first box, then tap Paste.';
    const mac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent);
    return `Click a box and press ${mac ? '⌘V' : 'Ctrl+V'} to paste.`;
  };

  const fill = (text) => {
    const code = codeFromText(text);
    if (!code) {
      setHint(`There is no ${LENGTH}-digit code on the clipboard.`);
      return;
    }
    setHint('');
    onChange(code);
    onComplete?.(code);
  };

  const pasteFromClipboard = async () => {
    let text = '';
    try {
      text = await readClipboardText();
    } catch (err) {
      // Refused, dismissed, or not supported (some in-app browsers). Logged so
      // an issue report filed afterwards shows why; a paste into a box still works.
      console.warn('[CodeInput] clipboard read failed:', err?.name, err?.message);
      setHint(manualPasteHint());
      focusFirstBox();
      return;
    }
    if (!codeFromText(text)) {
      console.warn('[CodeInput] clipboard holds no 6-digit code (length', String(text).length, ')');
      setHint(`There is no ${LENGTH}-digit code on the clipboard. ${manualPasteHint()}`);
      focusFirstBox();
      return;
    }
    fill(text);
  };

  const boxSize = small ? 40 : 52;
  const justify = align === 'center' ? 'center' : 'flex-start';

  return (
    <Stack spacing={1} alignItems={align === 'center' ? 'center' : 'flex-start'} sx={sx}>
      <Box
        ref={boxesRef}
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

      <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: 30 }}>
        <Button
          size="small"
          color="inherit"
          variant="soft"
          disabled={disabled}
          onClick={pasteFromClipboard}
          startIcon={<Iconify icon="solar:clipboard-text-bold" width={16} />}
        >
          Paste code
        </Button>
        {hint || helperText ? (
          <Typography variant="caption" color={hint ? 'warning.main' : 'text.secondary'}>
            {hint || helperText}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}
