'use client';

import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

// ----------------------------------------------------------------------

export const RANGES = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 3 months' },
  { value: 'ytd', label: 'This year' },
  { value: 'custom', label: 'Custom range…' },
];

/** Chips per register: what can be narrowed beyond status and date. */
export const CHIPS = {
  leads: {
    param: 'purpose',
    options: [
      { value: 'enquiry', label: 'Enquiry' },
      { value: 'marketing_consent', label: 'Marketing consent' },
    ],
  },
  applicants: {
    param: 'method',
    options: [
      { value: 'applicant', label: 'Ticked by the person' },
      { value: 'webflow_form', label: 'Careers form' },
      { value: 'recruiter_attested', label: 'Confirmed by staff' },
      { value: 'none', label: 'Not recorded' },
    ],
  },
};

const day = (d) => d.toISOString().slice(0, 10);

/** The API's from / to (YYYY-MM-DD, inclusive) for a range choice. */
export function rangeParams(range, custom) {
  const now = new Date();
  const back = (days) => day(new Date(now.getTime() - days * 86_400_000));
  switch (range) {
    case '7d':
      return { from: back(6) };
    case '30d':
      return { from: back(29) };
    case '90d':
      return { from: back(89) };
    case 'ytd':
      return { from: `${now.getFullYear()}-01-01` };
    case 'custom':
      return { from: custom.from || undefined, to: custom.to || undefined };
    default:
      return {};
  }
}

/**
 * The register's filter row: a date range with presets (custom dates when
 * chosen) and, where a register has them, chips to narrow by purpose or by
 * how consent was given. One chip at a time; click it again to clear.
 */
export function ConsentRegisterFilters({ kind, value, onChange }) {
  const chips = CHIPS[kind];
  const set = (patch) => onChange({ ...value, ...patch });
  const active = value.range !== 'all' || !!value.chip;

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
      <TextField
        select
        size="small"
        label="Given"
        value={value.range}
        onChange={(e) => set({ range: e.target.value })}
        sx={{ minWidth: 170 }}
      >
        {RANGES.map((r) => (
          <MenuItem key={r.value} value={r.value}>
            {r.label}
          </MenuItem>
        ))}
      </TextField>

      {value.range === 'custom' ? (
        <>
          <TextField
            size="small"
            type="date"
            label="From"
            value={value.from}
            onChange={(e) => set({ from: e.target.value })}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: value.to || undefined } }}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            value={value.to}
            onChange={(e) => set({ to: e.target.value })}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: value.from || undefined },
            }}
          />
        </>
      ) : null}

      {chips?.options.map((o) => {
        const on = value.chip === o.value;
        return (
          <Chip
            key={o.value}
            label={o.label}
            variant={on ? 'filled' : 'outlined'}
            color={on ? 'primary' : 'default'}
            onClick={() => set({ chip: on ? '' : o.value })}
            aria-pressed={on}
          />
        );
      })}

      {active ? (
        <Button
          size="small"
          color="inherit"
          onClick={() => onChange({ range: 'all', from: '', to: '', chip: '' })}
        >
          Clear
        </Button>
      ) : null}
    </Stack>
  );
}
