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
import Autocomplete from '@mui/material/Autocomplete';

import { apiMessage, saveClause, useSavedClauses } from 'src/actions/offer-settings';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const NATIONALITIES = [
  'Saudi',
  'Indian',
  'Egyptian',
  'Pakistani',
  'Filipino',
  'British',
  'American',
];
const COUNTRIES = ['Saudi Arabia', 'UAE', 'India', 'UK'];

const TAGS = ['nationalities', 'countries', 'contractTypes'];

const same = (a, b) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** An empty tag list matches anything; a filled one must name the value. */
const tagMatches = (list, value) => !list?.length || list.some((t) => same(t, value));

const hasTags = (c) => TAGS.some((k) => c[k]?.length);

const fromLibrary = (c) => ({
  title: c.title,
  content: c.content,
  libraryId: c.id,
  client: c.client,
  nationalities: c.nationalities ?? [],
  countries: c.countries ?? [],
  contractTypes: c.contractTypes ?? [],
});

function TagField({ label, options, value, onChange }) {
  return (
    <Autocomplete
      multiple
      freeSolo
      size="small"
      options={options}
      value={value ?? []}
      onChange={(_, v) => onChange(v.map((x) => String(x).trim()).filter(Boolean))}
      renderTags={(tags, getTagProps) =>
        tags.map((t, idx) => {
          const { key, ...rest } = getTagProps({ index: idx });
          return <Chip key={key} {...rest} size="small" label={t} />;
        })
      }
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder={value?.length ? '' : 'Any'} />
      )}
    />
  );
}

/**
 * The offer's own clauses, printed under the letter's Addendum (A.1, A.2…) —
 * no Addendum page when there are none. Clauses can be added from the saved
 * library (those for this offer's client first) and saved back to it for reuse.
 *
 * Saved clauses can be tagged with the nationalities, countries of work and
 * contract types they apply to; those matching this candidate (an empty tag
 * list matches anything) are suggested. A clause with no tags is suggested
 * only for its own client.
 *
 * clauses: [{ title, content, libraryId?, client?, nationalities?, countries?, contractTypes? }];
 * setClauses(updater); clientName: the offer's client; nationality, contractType, country:
 * the candidate's, for suggestions; contractTypes: the form's contract type options.
 */
export function OfferClauses({
  clauses,
  setClauses,
  clientName,
  nationality,
  contractType,
  country,
  contractTypes = [],
}) {
  const { clauses: library } = useSavedClauses();
  const [saving, setSaving] = useState(null);

  const forClient = (c) =>
    !!clientName && c.client && c.client.toLowerCase() === clientName.toLowerCase();
  const available = [...library]
    .filter((c) => !clauses.some((x) => x.libraryId === c.id))
    .sort((a, b) => Number(forClient(b)) - Number(forClient(a)) || a.title.localeCompare(b.title));

  const suggested = available.filter((c) => {
    if (c.client && !forClient(c)) return false;
    if (!hasTags(c)) return forClient(c);
    return (
      tagMatches(c.nationalities, nationality) &&
      tagMatches(c.countries, country) &&
      tagMatches(c.contractTypes, contractType)
    );
  });

  const add = (c) => setClauses((prev) => [...prev, fromLibrary(c)]);

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
        nationalities: c.nationalities ?? [],
        countries: c.countries ?? [],
        contractTypes: c.contractTypes ?? [],
      });
      update(i, {
        libraryId: saved.id,
        client: saved.client,
        nationalities: saved.nationalities ?? [],
        countries: saved.countries ?? [],
        contractTypes: saved.contractTypes ?? [],
      });
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
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        Optional. Printed under an Addendum after the letter&apos;s standard terms; with none, the
        letter has no Addendum. Save a clause to reuse it on other offers.
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Clauses print in the detailed letter only; the one-page offer is unchanged.
      </Typography>

      {suggested.length ? (
        <Box sx={{ mb: 2, p: 2, borderRadius: 1, bgcolor: 'background.neutral' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Suggested for this candidate
          </Typography>
          <Stack spacing={1}>
            {suggested.map((c) => (
              <Stack key={c.id} direction="row" alignItems="center" spacing={1}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {c.title || c.content.slice(0, 60)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="div">
                    {[c.client ? `For ${c.client}` : null, ...TAGS.flatMap((k) => c[k] ?? [])]
                      .filter(Boolean)
                      .join(' · ') || 'Any candidate'}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Iconify icon="eva:plus-fill" />}
                  onClick={() => add(c)}
                >
                  Add
                </Button>
              </Stack>
            ))}
          </Stack>
        </Box>
      ) : null}

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
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1.5, mb: 1 }}
            >
              When saved for reuse, suggest this clause for (leave empty for any):
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <Box sx={{ flex: 1 }}>
                <TagField
                  label="Nationalities"
                  options={NATIONALITIES}
                  value={clause.nationalities}
                  onChange={(v) => update(i, { nationalities: v })}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TagField
                  label="Countries of work"
                  options={COUNTRIES}
                  value={clause.countries}
                  onChange={(v) => update(i, { countries: v })}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TagField
                  label="Contract types"
                  options={contractTypes}
                  value={clause.contractTypes}
                  onChange={(v) => update(i, { contractTypes: v })}
                />
              </Box>
            </Stack>
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
                if (c) add(c);
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
