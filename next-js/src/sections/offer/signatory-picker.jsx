'use client';

import { useEffect } from 'react';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import LinearProgress from '@mui/material/LinearProgress';

import { apiMessage, useOfferSignatories } from 'src/actions/offer-settings';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const BLANK = { name: '', email: '', title: '' };

/**
 * IOTA signatories for an offer letter, chosen from the Microsoft users on the
 * allow-list (appConfig offers › iotaSignatories). With a single allowed
 * signatory, an empty list starts with them.
 *
 * value: [{ name, email, title }]; onChange(next).
 */
export function SignatoryPicker({ value, onChange }) {
  const { signatories, unmatched, error, loading } = useOfferSignatories();
  const rows = value?.length ? value : [BLANK];

  useEffect(() => {
    const empty = rows.length === 1 && !rows[0].email;
    if (empty && signatories.length === 1) onChange([{ ...signatories[0] }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signatories]);

  const chosen = new Set(rows.map((r) => r.email).filter(Boolean));
  const setRow = (i, s) => onChange(rows.map((r, j) => (j === i ? (s ? { ...s } : BLANK) : r)));

  return (
    <Stack spacing={1.5}>
      {loading ? <LinearProgress /> : null}
      {error ? (
        <Alert severity="error">
          {apiMessage(error, 'The IOTA signatory list could not be loaded.')}
        </Alert>
      ) : null}
      {!loading && !error && !signatories.length ? (
        <Alert severity="warning">
          No one is set up to sign offer letters. Add their email to appConfig offers ›
          iotaSignatories.
        </Alert>
      ) : null}
      {unmatched.length ? (
        <Typography variant="caption" color="warning.main">
          Not found in Microsoft: {unmatched.join(', ')}. Check the spelling in appConfig offers ›
          iotaSignatories.
        </Typography>
      ) : null}

      {rows.map((row, i) => {
        const current = signatories.find((s) => s.email === row.email) ?? null;
        return (
          <Stack key={i} direction="row" spacing={1} alignItems="center">
            <Autocomplete
              fullWidth
              size="small"
              options={signatories.filter((s) => s.email === row.email || !chosen.has(s.email))}
              value={current}
              onChange={(e, s) => setRow(i, s)}
              getOptionLabel={(s) => s.name}
              isOptionEqualToValue={(a, b) => a.email === b.email}
              renderOption={(props, s) => (
                <li {...props} key={s.email}>
                  <Stack>
                    <Typography variant="body2">{s.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[s.title, s.email].filter(Boolean).join(' · ')}
                    </Typography>
                  </Stack>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={`IOTA signatory ${rows.length > 1 ? i + 1 : ''}`.trim()}
                  helperText={
                    current ? [current.title, current.email].filter(Boolean).join(' · ') : ''
                  }
                />
              )}
            />
            {rows.length > 1 ? (
              <Tooltip title="Remove">
                <IconButton size="small" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                  <Iconify icon="eva:close-fill" />
                </IconButton>
              </Tooltip>
            ) : null}
          </Stack>
        );
      })}

      {signatories.length > rows.length ? (
        <Button
          size="small"
          startIcon={<Iconify icon="eva:plus-fill" />}
          onClick={() => onChange([...rows, BLANK])}
          sx={{ alignSelf: 'flex-start' }}
        >
          Add signatory
        </Button>
      ) : null}
    </Stack>
  );
}
