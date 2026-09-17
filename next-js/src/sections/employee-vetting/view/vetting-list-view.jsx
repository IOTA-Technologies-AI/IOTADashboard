'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { listVettings } from 'src/actions/employee-vetting';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STATUS_COLORS = {
  pending: 'warning',
  completed: 'success',
  failed: 'error',
};

// ----------------------------------------------------------------------

export function VettingListView() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR('vetting/list', listVettings);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => data || [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        String(r.employeeName || '').toLowerCase().includes(q) ||
        String(r.nationality || '').toLowerCase().includes(q) ||
        String(r.iotaOffice || '').toLowerCase().includes(q) ||
        String(r.status || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  /** How many of a vetting's checks have come back, for an at-a-glance count. */
  const progress = (vetting) => {
    const checks = vetting.checks || [];
    const done = checks.filter((c) => c.status !== 'pending').length;
    return `${done}/${checks.length}`;
  };

  return (
    <DashboardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Employee Vetting</Typography>
          <Typography variant="body2" color="text.secondary">
            Background verification through IDfy, against the IOTA Employee Vetting Standard.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => router.push(paths.dashboard.hr.employeeVetting.new)}
        >
          New Vetting
        </Button>
      </Stack>

      {/* A failed load and an empty list must not look the same — these records
          are the evidence a check was run, so "none" has to mean "none". */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Could not load vettings — {error?.response?.data?.message || error.message}
        </Alert>
      )}

      <Card>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, nationality, office or status…"
            InputProps={{
              startAdornment: <Iconify icon="eva:search-fill" sx={{ mr: 1, color: 'text.disabled' }} />,
            }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Office</TableCell>
                <TableCell>Nationality</TableCell>
                <TableCell align="center">Checks</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Raised</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !filtered.length && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      {error ? 'Could not load vettings.' : 'No vettings raised yet.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {filtered.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(paths.dashboard.hr.employeeVetting.details(row.id))}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {row.employeeName}
                    </Typography>
                    {row.employeeEmail && (
                      <Typography variant="caption" color="text.secondary">
                        {row.employeeEmail}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{row.iotaOffice || '—'}</TableCell>
                  <TableCell>{row.nationality || '—'}</TableCell>
                  <TableCell align="center">{progress(row)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.status}
                      color={STATUS_COLORS[row.status] || 'default'}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    }) : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); mutate(); }}>
                      <Iconify icon="solar:refresh-bold" width={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </DashboardContent>
  );
}
