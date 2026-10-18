'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { apiMessage, saveClause, useSavedClauses } from 'src/actions/offer-settings';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/**
 * The offer's own clauses, printed under the letter's Addendum (A.1, A.2…) —
 * no Addendum page when there are none. Clauses can be added from the saved
 * library (those for this offer's client first) and saved back to it for reuse.
 *
 * clauses: [{ title, content, libraryId? }]; setClauses(updater); clientName: the offer's client.
 */
export function OfferClauses({ clauses, setClauses, clientName }) {
  const { clauses: library } = useSavedClauses();
  const [saving, setSaving] = useState(null);

  const forClient = (c) =>
    !!clientName && c.client && c.client.toLowerCase() === clientName.toLowerCase();
  const available = [...library]
    .filter((c) => !clauses.some((x) => x.libraryId === c.id))
    .sort((a, b) => Number(forClient(b)) - Number(forClient(a)) || a.title.localeCompare(b.title));

  const update = (i, patch) =>
    setClauses((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const save = async (i) => {
    const c = clauses[i];
    setSaving(i);
    try {
      const saved = await saveClause({
        id: c.libraryId,
        title: c.title,
        content: c.content,
        client: c.client ?? (clientName || ''),
      });
      update(i, { libraryId: saved.id, client: saved.client });
      toast.success(c.libraryId ? 'Saved clause updated.' : 'Clause saved for reuse.');
    } catch (err) {
      toast.error(apiMessage(err, 'The clause could not be saved.'));
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        Addendum clauses
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Optional. Printed under an Addendum after the letter&apos;s standard terms; with none, the
        letter has no Addendum. Save a clause to reuse it on other offers.
      </Typography>

      <Stack spacing={2}>
        {clauses.map((clause, i) => (
          <Box key={i} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                A.{i + 1}
              </Typography>
              {clause.libraryId ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={clause.client ? `Saved · ${clause.client}` : 'Saved'}
                />
              ) : null}
              <Tooltip title={clause.libraryId ? 'Update the saved clause' : 'Save for reuse'}>
                <span>
                  <LoadingButton
                    size="small"
                    loading={saving === i}
                    disabled={!clause.content.trim()}
                    startIcon={<Iconify icon="solar:bookmark-bold" />}
                    onClick={() => save(i)}
                  >
                    {clause.libraryId ? 'Update saved' : 'Save for reuse'}
                  </LoadingButton>
                </span>
              </Tooltip>
              <IconButton
                size="small"
                color="error"
                aria-label="Remove clause"
                onClick={() => setClauses((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Iconify icon="eva:close-fill" />
              </IconButton>
            </Stack>
            <TextField
              label="Title"
              size="small"
              fullWidth
              value={clause.title}
              onChange={(e) => update(i, { title: e.target.value })}
              sx={{ mb: 1 }}
            />
            <TextField
              label="Clause"
              size="small"
              fullWidth
              multiline
              minRows={3}
              value={clause.content}
              onChange={(e) => update(i, { content: e.target.value })}
            />
          </Box>
        ))}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="eva:plus-fill" />}
            onClick={() => setClauses((prev) => [...prev, { title: '', content: '' }])}
          >
            New clause
          </Button>
          {available.length ? (
            <TextField
              select
              size="small"
              label="Add a saved clause"
              value=""
              onChange={(e) => {
                const c = library.find((x) => x.id === e.target.value);
                if (c)
                  setClauses((prev) => [
                    ...prev,
                    { title: c.title, content: c.content, libraryId: c.id, client: c.client },
                  ]);
              }}
              sx={{ minWidth: 260 }}
            >
              {available.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  <Stack sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {c.title || c.content.slice(0, 60)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color={forClient(c) ? 'primary.main' : 'text.secondary'}
                    >
                      {c.client ? `For ${c.client}` : 'Any client'}
                    </Typography>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
          ) : null}
        </Stack>
      </Stack>
    </Card>
  );
}
