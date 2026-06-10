'use client';

import useSWR from 'swr';
import { useState, useMemo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { listCandidates, deleteCandidate } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

const STATUS_COLORS = {
  active: 'primary',
  shortlisted: 'success',
  rejected: 'error',
};

const COLUMN_OPTIONS = [
  { key: 'candidate', label: 'Candidate' },
  { key: 'skills', label: 'Skills' },
  { key: 'experience', label: 'Experience' },
  { key: 'status', label: 'Status' },
];

// ----------------------------------------------------------------------

export function CandidatesListView() {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR('profile/candidates', listCandidates);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [columnsAnchorEl, setColumnsAnchorEl] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    candidate: true,
    skills: true,
    experience: true,
    status: true,
  });

  const candidates = useMemo(() => data?.data || [], [data]);

  const filtered = useMemo(() => {
    let rows = candidates;
    if (statusFilter !== 'all') rows = rows.filter((c) => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.skills || []).some((s) => s.toLowerCase().includes(q))
      );
    }
    return rows;
  }, [candidates, search, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this candidate? This cannot be undone.')) return;
    await deleteCandidate(id);
    mutate();
  };

  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;

  const handleToggleColumn = (columnKey) => {
    setVisibleColumns((prev) => {
      if (prev[columnKey] && visibleCount === 1) return prev;
      return { ...prev, [columnKey]: !prev[columnKey] };
    });
  };

  return (
    <DashboardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">Candidates</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {filtered.length} of {candidates.length}
        </Typography>
      </Stack>

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search by name, email, skill…"
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
          {['all', 'active', 'shortlisted', 'rejected'].map((s) => (
            <ToggleButton key={s} value={s} sx={{ textTransform: 'capitalize' }}>
              {s}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Iconify icon="eva:settings-2-fill" />}
          onClick={(e) => setColumnsAnchorEl(e.currentTarget)}
        >
          Columns
        </Button>
        <Menu
          anchorEl={columnsAnchorEl}
          open={Boolean(columnsAnchorEl)}
          onClose={() => setColumnsAnchorEl(null)}
        >
          {COLUMN_OPTIONS.map((column) => (
            <MenuItem key={column.key} onClick={() => handleToggleColumn(column.key)}>
              <Checkbox
                checked={visibleColumns[column.key]}
                disabled={visibleColumns[column.key] && visibleCount === 1}
                size="small"
              />
              <ListItemText>{column.label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
      </Stack>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {visibleColumns.candidate && <TableCell>Candidate</TableCell>}
                {visibleColumns.skills && <TableCell>Skills</TableCell>}
                {visibleColumns.experience && <TableCell>Experience</TableCell>}
                {visibleColumns.status && <TableCell>Status</TableCell>}
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={visibleCount + 1} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleCount + 1} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      No candidates found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => {
                  const initials = (c.name || '?')
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <TableRow key={c.id} hover>
                      {visibleColumns.candidate && (
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              sx={{ width: 36, height: 36, fontSize: 13, bgcolor: 'primary.main' }}
                            >
                              {initials}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2">{c.name}</Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {c.email}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                      )}
                      {visibleColumns.skills && (
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {(c.skills || []).slice(0, 3).map((s) => (
                              <Chip key={s} size="small" label={s} variant="outlined" />
                            ))}
                            {(c.skills || []).length > 3 && (
                              <Chip
                                size="small"
                                label={`+${c.skills.length - 3}`}
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </TableCell>
                      )}
                      {visibleColumns.experience && <TableCell>{c.experienceYears} yrs</TableCell>}
                      {visibleColumns.status && (
                        <TableCell>
                          <Chip
                            size="small"
                            label={c.status}
                            color={STATUS_COLORS[c.status] || 'default'}
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </TableCell>
                      )}
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() =>
                            router.push(paths.dashboard.profile.candidates.details(c.id))
                          }
                        >
                          <Iconify icon="eva:eye-fill" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(c.id)}>
                          <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </DashboardContent>
  );
}
