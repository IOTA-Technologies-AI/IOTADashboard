'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { extensionOf, checkDocument } from 'src/actions/document-management';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const SEVERITY = {
  ok: { color: 'success', icon: 'solar:check-circle-bold', label: 'Good' },
  warn: { color: 'warning', icon: 'solar:danger-triangle-bold', label: 'Check' },
  fail: { color: 'error', icon: 'solar:close-circle-bold', label: 'Problem' },
};

const AREAS = [
  { key: 'customer', label: 'Customer' },
  { key: 'pricing', label: 'Prices and totals' },
];

/**
 * The document check, shown once a PDF is chosen: who it is addressed to
 * against the client it is filed under, and whether its prices add up
 * (POST /document-management/check). Each finding with a fix can be ticked
 * and its replacement edited; ticked corrections are printed into the file
 * as it is filed, together with the document ID. `onChange` gets
 * { ready, corrections, checking, status }: `ready` is false while the check
 * runs, and while a problem is neither corrected nor acknowledged.
 */
export function DocumentCheckPanel({ file, customerId, office, disabled, onChange }) {
  const isPdf = !!file && extensionOf(file.name) === 'pdf';
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [apply, setApply] = useState({});
  const [replace, setReplace] = useState({});
  const [acknowledged, setAcknowledged] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    setResult(null);
    setError('');
    setAcknowledged(false);
    if (!isPdf) return undefined;
    let current = true;
    setChecking(true);
    checkDocument(file, { customerId, office })
      .then((res) => {
        if (!current) return;
        setResult(res);
        setApply(
          Object.fromEntries(
            res.findings.map((f) => [f.id, !!f.corrections?.length && !!f.applyByDefault])
          )
        );
        setReplace(
          Object.fromEntries(
            res.findings
              .filter((f) => f.corrections?.length)
              .map((f) => [f.id, f.corrections[0].replace])
          )
        );
      })
      .catch((err) => {
        if (current)
          setError(err.response?.data?.message || err.message || 'The check could not run.');
      })
      .finally(() => {
        if (current) setChecking(false);
      });
    return () => {
      current = false;
    };
  }, [file, isPdf, customerId, office, run]);

  const findings = result?.findings ?? [];
  const chosen = findings.filter(
    (f) => apply[f.id] && f.corrections?.length && replace[f.id]?.trim()
  );
  const corrections = chosen.flatMap((f) =>
    f.corrections.map((c) => ({ ...c, replace: replace[f.id].trim() }))
  );
  const open = findings.filter((f) => f.severity === 'fail' && !apply[f.id]);
  const ready = !checking && (!open.length || acknowledged);
  const key = JSON.stringify(corrections);

  useEffect(() => {
    onChange?.({ ready, corrections, checking, status: result?.status ?? null });
    // `corrections` is rebuilt every render; `key` says when it changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key, checking, result?.status]);

  if (!file) return null;
  if (!isPdf) {
    return (
      <Alert severity="info" variant="outlined">
        The customer and price checks run on PDF files. Upload the PDF of this document to check it.
      </Alert>
    );
  }

  const fails = findings.filter((f) => f.severity === 'fail').length;
  const warns = findings.filter((f) => f.severity === 'warn').length;
  const summary = checking
    ? null
    : result?.status === 'ok'
      ? { color: 'success', text: 'All good' }
      : fails
        ? { color: 'error', text: `${fails} problem${fails === 1 ? '' : 's'}` }
        : warns
          ? { color: 'warning', text: `${warns} to check` }
          : null;

  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Iconify icon="solar:shield-check-bold-duotone" width={22} />
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          Document check
        </Typography>
        {summary && (
          <Label variant="soft" color={summary.color}>
            {summary.text}
          </Label>
        )}
      </Stack>

      {checking && (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Reading the customer name and the prices…
          </Typography>
          <LinearProgress />
        </Stack>
      )}

      {error && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={() => setRun((n) => n + 1)}>
              Try again
            </Button>
          }
        >
          {error} You can still upload it.
        </Alert>
      )}

      {!checking && result && (
        <Stack spacing={2}>
          {AREAS.map(({ key: area, label }) => {
            const list = findings.filter((f) => f.area === area);
            if (!list.length) return null;
            return (
              <Box key={area}>
                <Typography variant="overline" color="text.secondary">
                  {label}
                </Typography>
                <Stack spacing={1.25} sx={{ mt: 0.5 }}>
                  {list.map((f) => (
                    <Finding
                      key={f.id}
                      finding={f}
                      applied={!!apply[f.id]}
                      replacement={replace[f.id] ?? ''}
                      disabled={disabled}
                      onApply={(v) => setApply((a) => ({ ...a, [f.id]: v }))}
                      onReplace={(v) => setReplace((r) => ({ ...r, [f.id]: v }))}
                    />
                  ))}
                </Stack>
              </Box>
            );
          })}

          {result.truncated && (
            <Typography variant="caption" color="text.secondary">
              A long document: only its first part was read.
            </Typography>
          )}

          {corrections.length > 0 && (
            <Alert severity="info" variant="outlined">
              The ticked corrections are printed into the filed copy, in place of the old text, with
              the document ID. The old text stays in the file underneath, covered: someone copying
              the text could still find it. For a wrong customer name, correcting the source file
              and uploading it again is the safer fix.
            </Alert>
          )}

          {open.length > 0 && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  disabled={disabled}
                />
              }
              label={
                <Typography variant="body2">
                  I have reviewed the {open.length === 1 ? 'problem' : 'problems'} and want to file
                  it without correcting {open.length === 1 ? 'it' : 'them'}
                </Typography>
              }
            />
          )}
        </Stack>
      )}
    </Card>
  );
}

function Finding({ finding: f, applied, replacement, disabled, onApply, onReplace }) {
  const s = SEVERITY[f.severity];
  const fixable = f.corrections?.length > 0;
  const where = [...new Set((f.corrections ?? []).map((c) => c.page))];
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <Iconify
        icon={s.icon}
        width={20}
        sx={{ color: `${s.color}.main`, mt: 0.25, flexShrink: 0 }}
      />
      <Stack spacing={0.5} sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {f.title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {f.detail}
        </Typography>
        {fixable && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
            sx={{ pt: 0.5 }}
          >
            <FormControlLabel
              sx={{ mr: 0 }}
              control={
                <Checkbox
                  size="small"
                  checked={applied}
                  onChange={(e) => onApply(e.target.checked)}
                  disabled={disabled}
                />
              }
              label={
                <Typography variant="body2" noWrap>
                  Correct “{f.corrections[0].find}” to
                </Typography>
              }
            />
            <TextField
              size="small"
              value={replacement}
              onChange={(e) => onReplace(e.target.value)}
              disabled={disabled || !applied}
              sx={{ flexGrow: 1, minWidth: 140 }}
              helperText={
                f.corrections.length > 1
                  ? `${f.corrections.length} places, page${where.length > 1 ? 's' : ''} ${where.join(', ')}`
                  : `Page ${f.corrections[0].page}`
              }
            />
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
