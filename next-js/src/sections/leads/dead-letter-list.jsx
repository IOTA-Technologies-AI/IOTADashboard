'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { fToNow, fDateTime } from 'src/utils/format-time';

import { apiMessage, useDeadLetters, resolveDeadLetter } from 'src/actions/leads';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';

import { DEAD_LETTER_REASON } from './lead-labels';

// ----------------------------------------------------------------------

/**
 * Website submissions that could not become a lead — kept, never dropped.
 * The usual one is a form not yet mapped in Settings.
 */
export function DeadLetterList({ onOpenSettings }) {
  const { deadLetters, error, loading } = useDeadLetters(true);
  const [busyId, setBusyId] = useState(null);

  const dismiss = async (id) => {
    setBusyId(id);
    try {
      await resolveDeadLetter(id);
    } catch (err) {
      toast.error(apiMessage(err, 'It could not be dismissed.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box>
      <Alert severity="info" sx={{ m: 2 }}>
        Submissions that arrived but could not become a lead. A form that is not mapped yet is the
        usual reason — map it in Settings, then dismiss the entry here. Nothing is deleted.
      </Alert>
      {error ? (
        <Alert severity="error" sx={{ mx: 2, mb: 2 }}>
          {apiMessage(error, 'These could not be loaded.')}
        </Alert>
      ) : null}
      {loading ? <LinearProgress /> : null}
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell>Received</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Form</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {deadLetters.map((d) => {
              const data = d.rawPayload?.payload?.data || {};
              return (
                <TableRow key={d.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }} title={fDateTime(d.createdAt)}>
                    {fToNow(d.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Label variant="soft" color={d.reason === 'store_failed' ? 'error' : 'warning'}>
                      {DEAD_LETTER_REASON[d.reason] || d.reason}
                    </Label>
                    {d.error ? (
                      <Typography variant="caption" color="text.secondary" component="div">
                        {d.error}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>
                    <Typography variant="body2" noWrap>
                      {d.formName || '—'}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      component="div"
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {d.formElementId || d.formId || ''}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {Object.entries(data)
                        .slice(0, 3)
                        .map(([k, v]) => `${k}: ${typeof v === 'object' ? '…' : v}`)
                        .join(' · ') || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {d.reason === 'unrouted' && onOpenSettings ? (
                      <Button size="small" onClick={onOpenSettings}>
                        Map form
                      </Button>
                    ) : null}
                    <LoadingButton
                      size="small"
                      color="inherit"
                      loading={busyId === d.id}
                      onClick={() => dismiss(d.id)}
                    >
                      Dismiss
                    </LoadingButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && !deadLetters.length ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ py: 4, textAlign: 'center' }}
                  >
                    Nothing needs attention.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
