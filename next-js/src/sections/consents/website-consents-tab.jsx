'use client';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { fDateTime } from 'src/utils/format-time';
import { fNumber, fPercent } from 'src/utils/format-number';

import { apiMessage, useWebsiteConsents } from 'src/actions/consents';

import { Label } from 'src/components/label';
import { EmptyContent } from 'src/components/empty-content';

// ----------------------------------------------------------------------

const CHOICE = {
  accepted: { label: 'Accepted all', color: 'success' },
  essential: { label: 'Essential only', color: 'default' },
};

/** This month and the eleven before it, as "YYYY-MM". */
function lastMonths() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return {
      value: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    };
  });
}

function StatTile({ label, value, caption }) {
  return (
    <Card sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ mt: 0.5 }}>
        {value}
      </Typography>
      {caption ? (
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
      ) : null}
    </Card>
  );
}

/**
 * The cookie-banner choices logged by the iota-consent Function App. Anonymous
 * by design: the choice, when, which page, and the browser's language and time
 * zone — no IP or identity.
 */
export function WebsiteConsentsTab() {
  const months = useMemo(lastMonths, []);
  const [month, setMonth] = useState(months[0].value);
  const { data, error, loading } = useWebsiteConsents(month);
  const s = data?.summary;

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <TextField
          select
          size="small"
          label="Month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          {months.map((m) => (
            <MenuItem key={m.value} value={m.value}>
              {m.label}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="caption" color="text.secondary">
          Anonymous: no IP address, device or identity is stored with a choice.
        </Typography>
      </Stack>

      {loading && !data ? <LinearProgress /> : null}
      {error ? (
        <Alert severity="error">{apiMessage(error, 'Website consents could not be loaded.')}</Alert>
      ) : null}

      {data && !data.configured ? (
        <Alert severity="info">
          The website consent log is not connected yet. Create a read-only SAS URL for the{' '}
          <strong>consents</strong> table in the <strong>iotalogostorage</strong> storage account
          and set it as the Encore secret <strong>CONSENT_TABLE_SAS_URL</strong>.
        </Alert>
      ) : null}

      {data?.truncated ? (
        <Alert severity="warning">
          More than 50,000 choices this month — the figures cover the first 50,000.
        </Alert>
      ) : null}

      {s && s.total === 0 ? (
        <Card>
          <EmptyContent filled title="No choices logged this month" sx={{ py: 8 }} />
        </Card>
      ) : null}

      {s && s.total > 0 ? (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            }}
          >
            <StatTile
              label="Choices"
              value={fNumber(s.total)}
              caption="Visitors who answered the banner"
            />
            <StatTile label="Accepted all" value={fNumber(s.accepted)} />
            <StatTile label="Essential only" value={fNumber(s.essential)} />
            <StatTile
              label="Acceptance rate"
              value={s.acceptRate === null ? '—' : fPercent(s.acceptRate * 100)}
              caption="Accepted all ÷ choices"
            />
          </Box>

          <Card>
            <CardHeader title="By site" />
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Site</TableCell>
                    <TableCell align="right">Accepted all</TableCell>
                    <TableCell align="right">Essential only</TableCell>
                    <TableCell align="right">Acceptance rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {s.bySite.map((r) => (
                    <TableRow key={r.site}>
                      <TableCell>{r.site}</TableCell>
                      <TableCell align="right">{fNumber(r.accepted) || 0}</TableCell>
                      <TableCell align="right">{fNumber(r.essential) || 0}</TableCell>
                      <TableCell align="right">
                        {fPercent((r.accepted / (r.accepted + r.essential)) * 100)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {s.bySite.some((r) => r.site === 'Not recorded') ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 2 }}>
                &quot;Not recorded&quot;: the banner sent only the page path, so the site (.ai or
                .io) is unknown for these choices.
              </Typography>
            ) : (
              <Box sx={{ pb: 1 }} />
            )}
          </Card>

          <Card>
            <CardHeader
              title="Latest choices"
              subheader={`The ${fNumber(Math.min(data.recent.length, 200))} most recent this month`}
            />
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small" sx={{ minWidth: 720 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>When</TableCell>
                    <TableCell>Choice</TableCell>
                    <TableCell>Site</TableCell>
                    <TableCell>Page</TableCell>
                    <TableCell>Language</TableCell>
                    <TableCell>Time zone</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.recent.map((r, i) => (
                    <TableRow key={`${r.at}-${i}`} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDateTime(r.at)}</TableCell>
                      <TableCell>
                        <Label color={CHOICE[r.choice]?.color}>{CHOICE[r.choice]?.label}</Label>
                      </TableCell>
                      <TableCell>{r.site || '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Typography variant="body2" noWrap>
                          {r.page || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{r.lang || '—'}</TableCell>
                      <TableCell>{r.tz || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      ) : null}
    </Stack>
  );
}
