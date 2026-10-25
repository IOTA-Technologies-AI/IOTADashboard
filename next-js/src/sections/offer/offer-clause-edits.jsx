'use client';

import { useMemo, useState } from 'react';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { Iconify } from 'src/components/iconify';
import { listClauses } from 'src/components/offer-letter';

// ----------------------------------------------------------------------

/**
 * Change the wording of clauses in this offer's detailed letter. The one-page
 * offer is never changed. Kept in letterTerms.clauseOverrides by clause number;
 * the API accepts changes only on a new offer or a draft, and approvers see
 * every changed clause on the offer page.
 *
 * getLetterOffer(): the offer as the letter would print it now (form values).
 */
export function OfferClauseEdits({ getLetterOffer, overrides, setOverrides }) {
  const [open, setOpen] = useState(false);
  const [clauses, setClauses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState('');

  const changed = useMemo(
    () =>
      Object.keys(overrides || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [overrides]
  );

  const pick = (clause) => {
    setSelected(clause);
    setText(clause ? (overrides?.[clause.n]?.text ?? clause.text) : '');
  };

  const openEditor = (n) => {
    // The standard wording depends on the form (client, salary, terms): read it now.
    const list = listClauses(getLetterOffer());
    setClauses(list);
    pick(list.find((c) => c.n === n) ?? null);
    setOpen(true);
  };

  const save = () => {
    if (!selected) return;
    const value = text.trim();
    setOverrides((prev) => {
      const next = { ...(prev || {}) };
      // Unchanged from the standard wording: nothing to keep.
      if (!value || value.replace(/\s+/g, ' ') === selected.text) delete next[selected.n];
      else next[selected.n] = { ...(prev?.[selected.n] || {}), title: selected.title, text: value };
      return next;
    });
    setOpen(false);
  };

  const restore = (n) =>
    setOverrides((prev) => {
      const next = { ...(prev || {}) };
      delete next[n];
      return next;
    });

  return (
    <Card sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6">Detailed letter wording</Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Iconify icon="solar:pen-bold" />}
          onClick={() => openEditor(null)}
        >
          Change a clause
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: changed.length ? 2 : 0 }}>
        Reword a clause of the detailed (GOSI) letter for this offer only. The one-page offer is not
        changed. Approvers see every changed clause, and wording can only be changed before the
        offer goes for approval.
      </Typography>

      {changed.length ? (
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {changed.map((n) => (
            <Chip
              key={n}
              color="warning"
              variant="soft"
              label={`${n} ${overrides[n]?.title || ''}`.trim()}
              onClick={() => openEditor(n)}
              onDelete={() => restore(n)}
              deleteIcon={<Iconify icon="solar:restart-bold" />}
            />
          ))}
        </Stack>
      ) : null}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Change a clause</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Autocomplete
              options={clauses}
              value={selected}
              onChange={(_, c) => pick(c)}
              getOptionLabel={(c) => `${c.n} ${c.title}${overrides?.[c.n] ? ' (changed)' : ''}`}
              isOptionEqualToValue={(a, b) => a.n === b.n}
              renderInput={(params) => <TextField {...params} label="Clause" />}
            />
            {selected ? (
              <>
                <TextField
                  fullWidth
                  multiline
                  minRows={6}
                  label={`${selected.n} ${selected.title}`}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  helperText="Leave a blank line between paragraphs."
                />
                <Alert severity="info">
                  This replaces the clause for this offer only, as typed: figures in it (salary,
                  days, amounts) no longer follow the form, so update them here if they change.
                </Alert>
              </>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          {selected && overrides?.[selected.n] ? (
            <Button
              color="inherit"
              onClick={() => {
                restore(selected.n);
                setOpen(false);
              }}
            >
              Restore standard wording
            </Button>
          ) : null}
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!selected} onClick={save}>
            Save wording
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
