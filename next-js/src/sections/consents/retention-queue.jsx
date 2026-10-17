'use client';

import { useState } from 'react';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { fDate, fToNow, fDateTime } from 'src/utils/format-time';

import { apiMessage, decideRetention, useRetentionQueue } from 'src/actions/consents';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const TABS = [
  {
    value: 'review',
    label: 'Needs review',
    empty: 'Nothing to review. Rules set to "Flag for review" put records here.',
    hint: 'Keep it, or delete it — a deletion still waits out the undo window.',
  },
  {
    value: 'pending',
    label: 'Waiting for deletion',
    empty: 'Nothing is waiting to be deleted.',
    hint: 'Deleted on the date shown, unless someone keeps it first.',
  },
  {
    value: 'kept',
    label: 'Kept',
    empty: 'Nothing has been kept.',
    hint: 'Left alone by the rules until released.',
  },
];

const DONE = {
  keep: 'Kept — the rules will leave it alone.',
  delete: 'Queued for deletion after the undo window.',
  release: 'Released — the rules may queue it again.',
};

/**
 * What the retention job has queued: records waiting for HR's decision,
 * records waiting out the undo window before deletion, and records kept.
 */
export function RetentionQueue({ counts, ruleLabel }) {
  const { user } = useAuthContext();
  const isAdmin = Number(user?.roleId) >= 3;
  const [tab, setTab] = useState(counts.review ? 'review' : counts.pending ? 'pending' : 'review');
  const { items, error, loading } = useRetentionQueue(tab);
  const [busy, setBusy] = useState(null);
  const current = TABS.find((t) => t.value === tab);

  const decide = async (item, decision) => {
    setBusy(`${item.id}-${decision}`);
    try {
      await decideRetention(item.id, decision);
      toast.success(DONE[decision]);
    } catch (err) {
      toast.error(apiMessage(err, 'That did not work.'));
    } finally {
      setBusy(null);
    }
  };

  const action = (item, decision, label, color = 'inherit') => (
    <Button
      size="small"
      color={color}
      disabled={!!busy}
      onClick={() => decide(item, decision)}
      sx={{ ml: 1 }}
    >
      {busy === `${item.id}-${decision}` ? '…' : label}
    </Button>
  );

  return (
    <Card>
      <CardHeader
        title="Queue"
        subheader="Nothing is deleted the moment it falls due: it waits here first."
      />
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2.5, mt: 1 }}>
        {TABS.map((t) => (
          <Tab
            key={t.value}
            value={t.value}
            label={t.label}
            iconPosition="end"
            icon={
              <Label color={t.value === 'pending' && counts[t.value] ? 'error' : 'default'}>
                {counts[t.value] ?? 0}
              </Label>
            }
          />
        ))}
      </Tabs>

      {loading ? <LinearProgress /> : null}
      {error ? (
        <Alert severity="error" sx={{ m: 2.5 }}>
          {apiMessage(error, 'The queue could not be loaded.')}
        </Alert>
      ) : null}

      {!loading && !error && !items.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
          {current.empty}
        </Typography>
      ) : null}

      {items.length ? (
        <>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', px: 3, pt: 2 }}
          >
            {current.hint}
          </Typography>
          <TableContainer sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Person</TableCell>
                  <TableCell>Rule</TableCell>
                  <TableCell>Counted from</TableCell>
                  <TableCell>{tab === 'pending' ? 'Deleted on' : 'Queued'}</TableCell>
                  {isAdmin ? <TableCell align="right" /> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id} hover>
                    <TableCell>
                      <Typography variant="body2">{i.name || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {i.email || `${i.register} #${String(i.sourceId).slice(0, 8)}`}
                      </Typography>
                      {i.decidedBy ? (
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ display: 'block' }}
                        >
                          {tab === 'kept' ? 'Kept' : 'Approved'} by {i.decidedBy}
                          {i.note ? ` — ${i.note}` : ''}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>{ruleLabel(i.rule)}</TableCell>
                    <TableCell>{i.since ? fDate(i.since) : '—'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {tab === 'pending' && i.dueAt ? (
                        <Stack>
                          <Typography variant="body2">{fDateTime(i.dueAt)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {fToNow(i.dueAt)}
                          </Typography>
                        </Stack>
                      ) : (
                        fDate(i.queuedAt)
                      )}
                    </TableCell>
                    {isAdmin ? (
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {tab === 'review' ? (
                          <>
                            {action(i, 'keep', 'Keep')}
                            {action(i, 'delete', 'Delete', 'error')}
                          </>
                        ) : null}
                        {tab === 'pending' ? action(i, 'keep', 'Keep — cancel deletion') : null}
                        {tab === 'kept' ? action(i, 'release', 'Release') : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : null}
    </Card>
  );
}
