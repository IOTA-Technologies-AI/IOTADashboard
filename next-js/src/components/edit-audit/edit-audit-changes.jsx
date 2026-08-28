'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------
// Renders the field-level before → after diff carried on an audit entry.
// Shared by the per-record timeline and the global Admin Settings log.
// ----------------------------------------------------------------------

// camelCase column names are what the API returns; show them as words.
export const humanizeField = (field) =>
  String(field || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

export const formatAuditValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    return json.length > 120 ? `${json.slice(0, 120)}…` : json;
  }
  const text = String(value);
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
};

export function EditAuditChanges({ changes, dense = false }) {
  const list = Array.isArray(changes) ? changes : [];

  if (!list.length) {
    return (
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
        No field changes recorded
      </Typography>
    );
  }

  return (
    <Box
      component="ul"
      sx={{
        m: 0,
        pl: 0,
        listStyle: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: dense ? 0.25 : 0.75,
      }}
    >
      {list.map((change, index) => (
        <Box component="li" key={`${change.field}-${index}`}>
          <Typography variant={dense ? 'caption' : 'body2'} component="span">
            <Box component="span" sx={{ fontWeight: 'fontWeightSemiBold' }}>
              {humanizeField(change.field)}:
            </Box>{' '}
            <Box component="span" sx={{ color: 'error.main', textDecoration: 'line-through' }}>
              {formatAuditValue(change.before)}
            </Box>{' '}
            <Box component="span" sx={{ color: 'text.disabled' }}>
              →
            </Box>{' '}
            <Box component="span" sx={{ color: 'success.dark' }}>
              {formatAuditValue(change.after)}
            </Box>
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
