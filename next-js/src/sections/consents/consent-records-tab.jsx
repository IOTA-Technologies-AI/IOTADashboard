'use client';

import { useState } from 'react';
import { useDebounce } from 'minimal-shared/hooks';

import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { fDate, fDateTime } from 'src/utils/format-time';

import { apiMessage, withdrawConsent, useConsentRecords } from 'src/actions/consents';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { useAuthContext } from 'src/auth/hooks';

import { LEAD_SOURCE, CONSENT_BASIS } from '../leads/lead-labels';

// ----------------------------------------------------------------------

const INTRO = {
  leads:
    'What each website enquirer and newsletter subscriber agreed to, under which privacy notice. Mark a consent withdrawn when the person asks to be removed.',
  applicants:
    'The consent recorded with each job application from the careers form, under which privacy notice. Mark it withdrawn when the candidate asks for their data to be removed.',
};

/** The PDPL consents of leads or job applicants (kind: 'leads' | 'applicants'). */
export function ConsentRecordsTab({ kind }) {
  const { user } = useAuthContext();
  const isAdmin = Number(user?.roleId) >= 3;

  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const debounced = useDebounce(search, 400);

  const { records, total, error, loading } = useConsentRecords({
    kind,
    status,
    search: debounced || undefined,
    page,
    limit: rowsPerPage,
  });

  const [withdrawing, setWithdrawing] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const confirmWithdraw = async () => {
    setSaving(true);
    try {
      await withdrawConsent(withdrawing.id, note);
      toast.success('Consent marked as withdrawn.');
      setWithdrawing(null);
      setNote('');
    } catch (err) {
      toast.error(apiMessage(err, 'The consent could not be withdrawn.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Stack spacing={2} sx={{ p: 2.5 }}>
        <Typography variant="body2" color="text.secondary">
          {INTRO[kind]}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            size="small"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            sx={{ flexGrow: 1, maxWidth: 420 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="withdrawn">Withdrawn</MenuItem>
          </TextField>
        </Stack>
      </Stack>

      {loading ? <LinearProgress /> : null}
      {error ? (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
          {apiMessage(error, 'Consents could not be loaded.')}
        </Alert>
      ) : null}

      {!loading && !error && records.length === 0 ? (
        <EmptyContent filled title="No consents match" sx={{ py: 8, mx: 2.5, mb: 2.5 }} />
      ) : null}

      {records.length > 0 ? (
        <>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Given</TableCell>
                  <TableCell>Person</TableCell>
                  <TableCell>Basis</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Notice version</TableCell>
                  <TableCell>Status</TableCell>
                  {isAdmin ? <TableCell align="right" /> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((r) => {
                  const source = LEAD_SOURCE[r.lead?.source];
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDateTime(r.capturedAt)}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{r.lead?.fullName || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {r.lead?.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={CONSENT_BASIS[r.basis]?.hint || ''}>
                          <span>{CONSENT_BASIS[r.basis]?.label || r.basis}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        {source ? <Label color={source.color}>{source.short}</Label> : null}
                        {r.sourceUrl ? (
                          <Link
                            href={r.sourceUrl}
                            target="_blank"
                            rel="noopener"
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ display: 'block' }}
                          >
                            {r.sourceUrl}
                          </Link>
                        ) : null}
                      </TableCell>
                      <TableCell>{r.noticeVersion}</TableCell>
                      <TableCell>
                        {r.withdrawnAt ? (
                          <Label color="error">Withdrawn {fDate(r.withdrawnAt)}</Label>
                        ) : (
                          <Label color="success">Active</Label>
                        )}
                      </TableCell>
                      {isAdmin ? (
                        <TableCell align="right">
                          {r.withdrawnAt ? null : (
                            <Button size="small" color="error" onClick={() => setWithdrawing(r)}>
                              Withdraw
                            </Button>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
            onPageChange={(e, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(0);
            }}
          />
        </>
      ) : null}

      <ConfirmDialog
        open={!!withdrawing}
        onClose={() => (saving ? null : setWithdrawing(null))}
        title="Mark consent as withdrawn?"
        content={
          <Stack spacing={2}>
            <Typography variant="body2">
              Record that <strong>{withdrawing?.lead?.email}</strong> withdrew their consent. This
              is kept in the lead&apos;s history and cannot be undone here.
            </Typography>
            <TextField
              size="small"
              label="Note (optional)"
              placeholder="e.g. Asked by email on 14 Oct to be removed"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        }
        action={
          <LoadingButton
            variant="contained"
            color="error"
            loading={saving}
            onClick={confirmWithdraw}
          >
            Withdraw
          </LoadingButton>
        }
      />
    </Card>
  );
}
