'use client';

import useSWR from 'swr';
import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { Iconify } from 'src/components/iconify';
import { listPipelineDeals, deletePipelineDeal } from 'src/utils/apiHelper';

// ----------------------------------------------------------------------

const STAGE_COLORS = {
  lead: 'default',
  qualified: 'info',
  proposal: 'warning',
  negotiation: 'secondary',
  won: 'success',
  lost: 'error',
};

const PRIORITY_COLORS = { hot: 'error', warm: 'warning', cold: 'info' };

const ALL_STAGES = ['', 'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const ALL_PRIORITIES = ['', 'hot', 'warm', 'cold'];

// ----------------------------------------------------------------------

export function DealsListView() {
  const router = useRouter();

  const { data, isLoading, mutate } = useSWR('pipeline-deals', listPipelineDeals);
  const deals = data?.deals ?? [];

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm('Delete this deal?')) return;
      await deletePipelineDeal(id);
      mutate();
    },
    [mutate]
  );

  const fmt = (n, currency = 'USD') =>
    n != null
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        }).format(n)
      : '—';

  const filtered = deals
    .filter((d) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        d.dealTitle?.toLowerCase().includes(q) ||
        d.company?.toLowerCase().includes(q) ||
        d.contactName?.toLowerCase().includes(q);
      const matchStage = !stageFilter || d.stage === stageFilter;
      const matchPriority = !priorityFilter || d.priority === priorityFilter;
      return matchSearch && matchStage && matchPriority;
    })
    .sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const SortLabel = ({ field, children }) => (
    <TableSortLabel
      active={sortField === field}
      direction={sortField === field ? sortDir : 'asc'}
      onClick={() => handleSort(field)}
    >
      {children}
    </TableSortLabel>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4">Deals</Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => router.push(paths.dashboard.sales.deals.new)}
        >
          New Deal
        </Button>
      </Stack>

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
        <TextField
          size="small"
          placeholder="Search deals…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" width={18} />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 220 }}
        />

        <TextField
          select
          size="small"
          label="Stage"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          {ALL_STAGES.map((s) => (
            <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
              {s || 'All stages'}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Priority"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          sx={{ minWidth: 130 }}
        >
          {ALL_PRIORITIES.map((p) => (
            <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>
              {p || 'All priorities'}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Card>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <SortLabel field="dealTitle">Deal</SortLabel>
                  </TableCell>
                  <TableCell>
                    <SortLabel field="company">Company</SortLabel>
                  </TableCell>
                  <TableCell>
                    <SortLabel field="stage">Stage</SortLabel>
                  </TableCell>
                  <TableCell>
                    <SortLabel field="value">Value</SortLabel>
                  </TableCell>
                  <TableCell>
                    <SortLabel field="priority">Priority</SortLabel>
                  </TableCell>
                  <TableCell>
                    <SortLabel field="assignedBdm">BDM</SortLabel>
                  </TableCell>
                  <TableCell>
                    <SortLabel field="expectedCloseDate">Close Date</SortLabel>
                  </TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No deals found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((deal) => (
                    <TableRow
                      key={deal.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(paths.dashboard.sales.deals.details(deal.id))}
                    >
                      <TableCell>
                        <Typography variant="subtitle2" noWrap>
                          {deal.dealTitle}
                        </Typography>
                        {deal.contactName && (
                          <Typography variant="caption" color="text.secondary">
                            {deal.contactName}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{deal.company}</TableCell>
                      <TableCell>
                        <Chip
                          label={deal.stage}
                          size="small"
                          color={STAGE_COLORS[deal.stage] || 'default'}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>{fmt(deal.value, deal.currency)}</TableCell>
                      <TableCell>
                        <Chip
                          label={deal.priority}
                          size="small"
                          color={PRIORITY_COLORS[deal.priority] || 'default'}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>{deal.assignedBdm || '—'}</TableCell>
                      <TableCell>
                        {deal.expectedCloseDate
                          ? new Date(deal.expectedCloseDate).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell align="right">
                        <Stack
                          direction="row"
                          justifyContent="flex-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconButton
                            size="small"
                            onClick={() => router.push(paths.dashboard.sales.deals.edit(deal.id))}
                          >
                            <Iconify icon="solar:pen-bold" width={16} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(deal.id)}
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
