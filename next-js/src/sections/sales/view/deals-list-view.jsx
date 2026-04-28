'use client';

import useSWR from 'swr';
import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
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
import { alpha } from '@mui/material/styles';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';

import { fCurrency } from 'src/utils/format-number';
import { listPipelineDeals, deletePipelineDeal } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STAGE_META = {
  lead: { label: 'Lead', bg: '#EDE7F6', text: '#4527A0' },
  qualified: { label: 'Qualified', bg: '#E3F2FD', text: '#0D47A1' },
  proposal: { label: 'Proposal', bg: '#FFF8E1', text: '#E65100' },
  negotiation: { label: 'Negotiation', bg: '#FBE9E7', text: '#BF360C' },
  won: { label: 'Won', bg: '#E8F5E9', text: '#1B5E20' },
  lost: { label: 'Lost', bg: '#FFEBEE', text: '#B71C1C' },
};

const PRIORITY_META = {
  hot: { label: 'Hot', bg: '#FFEBEE', text: '#C62828' },
  warm: { label: 'Warm', bg: '#FFF3E0', text: '#E65100' },
  cold: { label: 'Cold', bg: '#E3F2FD', text: '#1565C0' },
};

const ALL_STAGES = ['', 'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const ALL_PRIORITIES = ['', 'hot', 'warm', 'cold'];

function Badge({ label, bg, text }) {
  return (
    <Box
      component="span"
      sx={{
        px: 1.25,
        py: 0.35,
        borderRadius: 1,
        bgcolor: bg,
        color: text,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {label}
    </Box>
  );
}

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

  const fmt = (n, currency) =>
    n != null ? fCurrency(n, { currencyCode: currency || 'USD' }) : '—';

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
      {/* Page header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Deals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} of {deals.length} deal{deals.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => router.push(paths.dashboard.sales.deals.new)}
          sx={{ borderRadius: 1.5 }}
        >
          New Deal
        </Button>
      </Stack>

      <Card>
        {/* Filter bar */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          spacing={2}
          sx={{ p: 2.5 }}
        >
          <TextField
            size="small"
            placeholder="Search by deal, company or contact…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" width={18} color="text.disabled" />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, maxWidth: 340 }}
          />

          <Stack direction="row" spacing={1.5} flexShrink={0}>
            <TextField
              select
              size="small"
              label="Stage"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              sx={{ minWidth: 130 }}
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
              sx={{ minWidth: 120 }}
            >
              {ALL_PRIORITIES.map((p) => (
                <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>
                  {p || 'All priorities'}
                </MenuItem>
              ))}
            </TextField>

            {(search || stageFilter || priorityFilter) && (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={() => {
                  setSearch('');
                  setStageFilter('');
                  setPriorityFilter('');
                }}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Clear
              </Button>
            )}
          </Stack>
        </Stack>

        <Divider />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.neutral' }}>
                  <TableCell sx={{ fontWeight: 700, py: 1.5 }}>
                    <SortLabel field="dealTitle">Deal / Contact</SortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 1.5 }}>
                    <SortLabel field="stage">Stage</SortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 1.5 }}>
                    <SortLabel field="value">Value</SortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 1.5 }}>
                    <SortLabel field="priority">Priority</SortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 1.5 }}>
                    <SortLabel field="assignedBdm">BDM</SortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 1.5 }}>
                    <SortLabel field="expectedCloseDate">Close Date</SortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, py: 1.5 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <Iconify icon="solar:inbox-bold" width={40} color="text.disabled" />
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        No deals found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((deal) => {
                    const stageMeta = STAGE_META[deal.stage] || {
                      label: deal.stage,
                      bg: '#F5F5F5',
                      text: '#616161',
                    };
                    const priorityMeta = PRIORITY_META[deal.priority] || PRIORITY_META.warm;
                    const initials = (deal.company || deal.dealTitle || '?')
                      .split(' ')
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase() || '')
                      .join('');

                    return (
                      <TableRow
                        key={deal.id}
                        hover
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { bgcolor: alpha('#919EAB', 0.04) },
                        }}
                        onClick={() => router.push(paths.dashboard.sales.deals.details(deal.id))}
                      >
                        {/* Deal + Company */}
                        <TableCell sx={{ py: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar
                              sx={{
                                width: 36,
                                height: 36,
                                fontSize: 13,
                                fontWeight: 700,
                                bgcolor: alpha(STAGE_META[deal.stage]?.text || '#9E9E9E', 0.12),
                                color: STAGE_META[deal.stage]?.text || 'text.secondary',
                              }}
                            >
                              {initials}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" noWrap fontWeight={600}>
                                {deal.dealTitle}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {deal.company}
                                {deal.contactName && ` · ${deal.contactName}`}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        {/* Stage */}
                        <TableCell>
                          <Badge label={stageMeta.label} bg={stageMeta.bg} text={stageMeta.text} />
                        </TableCell>

                        {/* Value */}
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {fmt(deal.value, deal.currency)}
                          </Typography>
                        </TableCell>

                        {/* Priority */}
                        <TableCell>
                          <Badge
                            label={priorityMeta.label}
                            bg={priorityMeta.bg}
                            text={priorityMeta.text}
                          />
                        </TableCell>

                        {/* BDM */}
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {deal.assignedBdm || '—'}
                          </Typography>
                        </TableCell>

                        {/* Close Date */}
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {deal.expectedCloseDate
                              ? new Date(deal.expectedCloseDate).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </Typography>
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                            <IconButton
                              size="small"
                              sx={{ color: 'text.secondary' }}
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
