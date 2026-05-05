'use client';

import useSWR from 'swr';
import { useState, useMemo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { listJobDescriptions, deleteJobDescription } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

const STATUS_COLORS = {
  draft: 'default',
  published: 'success',
  archived: 'warning',
};

// ----------------------------------------------------------------------

export function JDListView() {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR('profile/jd', listJobDescriptions);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const jds = useMemo(() => data?.data || [], [data]);

  const filtered = useMemo(() => {
    let rows = jds;
    if (statusFilter !== 'all') rows = rows.filter((j) => j.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.department.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [jds, search, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this job description?')) return;
    await deleteJobDescription(id);
    mutate();
  };

  return (
    <DashboardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">Job Descriptions</Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => router.push(paths.dashboard.profile.jd.new)}
        >
          New JD
        </Button>
      </Stack>

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search by title, department, location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <Iconify icon="eva:search-fill" sx={{ mr: 1, color: 'text.disabled' }} />
            ),
          }}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={statusFilter}
          onChange={(_, v) => v && setStatusFilter(v)}
        >
          {['all', 'draft', 'published', 'archived'].map((s) => (
            <ToggleButton key={s} value={s} sx={{ textTransform: 'capitalize' }}>
              {s}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Experience</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      No job descriptions found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((jd) => (
                  <TableRow key={jd.id} hover sx={{ cursor: 'pointer' }}>
                    <TableCell
                      sx={{ fontWeight: 600 }}
                      onClick={() => router.push(paths.dashboard.profile.jd.details(jd.id))}
                    >
                      {jd.title}
                    </TableCell>
                    <TableCell>{jd.department}</TableCell>
                    <TableCell>{jd.location}</TableCell>
                    <TableCell>{jd.experienceYears}+ yrs</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{jd.employmentType}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={jd.status}
                        color={STATUS_COLORS[jd.status] || 'default'}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => router.push(paths.dashboard.profile.jd.details(jd.id))}
                      >
                        <Iconify icon="eva:eye-fill" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => router.push(paths.dashboard.profile.jd.edit(jd.id))}
                      >
                        <Iconify icon="solar:pen-bold" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(jd.id)}>
                        <Iconify icon="solar:trash-bin-trash-bold" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </DashboardContent>
  );
}
