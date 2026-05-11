'use client';

import useSWR from 'swr';
import { useState, useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
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

import { listResourceCalculations, deleteResourceCalculation } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

const STATUS_COLORS = {
  draft: 'default',
  submitted: 'info',
  approved: 'success',
  rejected: 'error',
};

// ----------------------------------------------------------------------

export function ResourceCalculationListView() {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR(
    'profile/resource-calculations',
    listResourceCalculations
  );
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  const rows = useMemo(() => data?.data || [], [data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.nationality.toLowerCase().includes(q) ||
        r.positionCode.toLowerCase().includes(q) ||
        r.id.includes(q)
    );
  }, [rows, search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource calculation?')) return;
    setDeleting(id);
    try {
      await deleteResourceCalculation(id);
      mutate();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <DashboardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">Resource Calculation</Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => router.push(paths.dashboard.profile.resourceCalculation.new)}
        >
          New Calculation
        </Button>
      </Stack>

      <Card>
        <Box sx={{ p: 2 }}>
          <TextField
            size="small"
            placeholder="Search by title, nationality, position code, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <Iconify icon="eva:search-fill" sx={{ mr: 1, color: 'text.disabled' }} />
              ),
            }}
            sx={{ width: 360 }}
          />
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Nationality</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell align="right">Monthly (SAR)</TableCell>
                  <TableCell align="right">Annual (SAR)</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No resource calculations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() =>
                        router.push(paths.dashboard.profile.resourceCalculation.details(row.id))
                      }
                    >
                      <TableCell
                        sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: 12 }}
                      >
                        {row.id}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {row.title}
                        </Typography>
                        {row.resumeUrl && (
                          <Typography
                            component="a"
                            href={row.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="caption"
                            color="primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Resume
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{row.nationality}</TableCell>
                      <TableCell>{row.positionCode}</TableCell>
                      <TableCell align="right">
                        {Number(row.totalMonthly).toLocaleString('en-SA', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell align="right">
                        {Number(row.totalAnnual).toLocaleString('en-SA', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.status}
                          size="small"
                          color={STATUS_COLORS[row.status] || 'default'}
                        />
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={deleting === row.id}
                          onClick={() => handleDelete(row.id)}
                        >
                          <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </DashboardContent>
  );
}
