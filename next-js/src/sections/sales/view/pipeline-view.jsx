'use client';

import useSWR from 'swr';
import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fCurrency } from 'src/utils/format-number';
import { listPipelineDeals, updatePipelineDealStage } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STAGES = [
  { id: 'lead', label: 'Lead', color: '#5C6BC0' },
  { id: 'qualified', label: 'Qualified', color: '#0288D1' },
  { id: 'proposal', label: 'Proposal', color: '#F57C00' },
  { id: 'negotiation', label: 'Negotiation', color: '#E65100' },
  { id: 'won', label: 'Won', color: '#2E7D32' },
  { id: 'lost', label: 'Lost', color: '#B71C1C' },
];

const PRIORITY_BADGE = {
  hot: { bg: '#FFEBEE', text: '#C62828' },
  warm: { bg: '#FFF3E0', text: '#E65100' },
  cold: { bg: '#E3F2FD', text: '#1565C0' },
};

function fmt(n, currency) {
  return fCurrency(n, { currencyCode: currency || 'USD' });
}

// ----------------------------------------------------------------------

function DealCard({ deal, onStageChange }) {
  const router = useRouter();
  const [changing, setChanging] = useState(false);

  const handleMove = useCallback(
    async (newStage) => {
      if (newStage === deal.stage) return;
      setChanging(true);
      try {
        await onStageChange(deal.id, newStage);
      } finally {
        setChanging(false);
      }
    },
    [deal.id, deal.stage, onStageChange]
  );

  const pb = PRIORITY_BADGE[deal.priority] || PRIORITY_BADGE.warm;
  const initials = (deal.company || deal.dealTitle || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <Card
      sx={{
        p: 2,
        mb: 1.5,
        cursor: 'pointer',
        borderLeft: '3px solid',
        borderLeftColor: STAGES.find((s) => s.id === deal.stage)?.color || 'divider',
        boxShadow: '0 1px 4px 0 rgba(0,0,0,0.08)',
        '&:hover': { boxShadow: '0 4px 16px 0 rgba(0,0,0,0.14)', transform: 'translateY(-1px)' },
        transition: 'all 0.18s',
        opacity: changing ? 0.5 : 1,
      }}
      onClick={() => router.push(paths.dashboard.sales.deals.details(deal.id))}
    >
      {/* Header row: company initials avatar + title */}
      <Stack direction="row" alignItems="flex-start" spacing={1.25} mb={1}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            bgcolor: alpha(STAGES.find((s) => s.id === deal.stage)?.color || '#9E9E9E', 0.12),
            color: STAGES.find((s) => s.id === deal.stage)?.color || 'text.secondary',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap fontWeight={600} lineHeight={1.3}>
            {deal.dealTitle}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {deal.company}
          </Typography>
        </Box>
      </Stack>

      {/* Value + priority */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.25}>
        <Typography variant="body2" fontWeight={700} color="text.primary">
          {deal.value ? fmt(deal.value, deal.currency) : '—'}
        </Typography>
        <Box
          sx={{
            px: 0.75,
            py: 0.2,
            borderRadius: 0.5,
            bgcolor: pb.bg,
            color: pb.text,
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'capitalize',
          }}
        >
          {deal.priority || 'warm'}
        </Box>
      </Stack>

      {deal.assignedBdm && (
        <Stack direction="row" alignItems="center" spacing={0.5} mb={1}>
          <Iconify icon="solar:user-bold" width={12} color="text.disabled" />
          <Typography variant="caption" color="text.secondary" noWrap>
            {deal.assignedBdm}
          </Typography>
        </Stack>
      )}

      {/* Move stage */}
      <Box onClick={(e) => e.stopPropagation()}>
        <Select
          size="small"
          value={deal.stage}
          onChange={(e) => handleMove(e.target.value)}
          disabled={changing}
          sx={{
            width: '100%',
            fontSize: 11,
            height: 26,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
          }}
        >
          {STAGES.map((s) => (
            <MenuItem key={s.id} value={s.id} sx={{ fontSize: 12 }}>
              <Box
                component="span"
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: s.color,
                  display: 'inline-block',
                  mr: 1,
                }}
              />
              {s.label}
            </MenuItem>
          ))}
        </Select>
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

function PipelineColumn({ stage, deals, onStageChange }) {
  const router = useRouter();

  // Use dominant currency for column total
  const colCurrency = (() => {
    if (!deals.length) return 'USD';
    const counts = {};
    deals.forEach((d) => {
      const c = d.currency || 'USD';
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  })();

  const totalValue = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  return (
    <Box
      sx={{
        minWidth: 272,
        maxWidth: 272,
        borderRadius: 2,
        p: 1.5,
        bgcolor: 'background.neutral',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 200px)',
      }}
    >
      {/* Column header */}
      <Box
        sx={{
          px: 1,
          py: 0.75,
          mb: 1.5,
          borderRadius: 1,
          borderTop: `3px solid ${stage.color}`,
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle2" fontWeight={700}>
              {stage.label}
            </Typography>
            <Chip
              label={deals.length}
              size="small"
              sx={{
                height: 18,
                fontSize: 10,
                bgcolor: alpha(stage.color, 0.12),
                color: stage.color,
                fontWeight: 700,
              }}
            />
          </Stack>
          <Tooltip title={`Add deal to ${stage.label}`}>
            <IconButton
              size="small"
              sx={{ color: stage.color }}
              onClick={() => router.push(`${paths.dashboard.sales.deals.new}?stage=${stage.id}`)}
            >
              <Iconify icon="mingcute:add-line" width={16} />
            </IconButton>
          </Tooltip>
        </Stack>
        {totalValue > 0 && (
          <Typography variant="caption" color="text.secondary" mt={0.25} display="block">
            {fmt(totalValue, colCurrency)}
          </Typography>
        )}
      </Box>

      {/* Deal cards */}
      <Box sx={{ overflowY: 'auto', flex: 1, pr: 0.5 }}>
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onStageChange={onStageChange} />
        ))}
        {deals.length === 0 && (
          <Stack alignItems="center" py={3} spacing={1}>
            <Iconify icon="solar:inbox-bold" width={28} color="text.disabled" />
            <Typography variant="caption" color="text.disabled" textAlign="center">
              No deals
            </Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function PipelineView() {
  const router = useRouter();

  const { data, isLoading, mutate } = useSWR('pipeline-deals', listPipelineDeals);
  const deals = data?.deals ?? [];

  const handleStageChange = useCallback(
    async (id, newStage) => {
      mutate(
        (prev) => ({
          ...prev,
          deals: prev.deals.map((d) => (d.id === id ? { ...d, stage: newStage } : d)),
        }),
        false
      );
      await updatePipelineDealStage(id, newStage);
      mutate();
    },
    [mutate]
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Sales Pipeline
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {deals.length} deal{deals.length !== 1 ? 's' : ''} across all stages
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => router.push(paths.dashboard.sales.deals.new)}
          sx={{ borderRadius: 1.5 }}
        >
          New Deal
        </Button>
      </Stack>

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          pb: 3,
          alignItems: 'flex-start',
          scrollbarWidth: 'thin',
        }}
      >
        {STAGES.map((stage) => (
          <PipelineColumn
            key={stage.id}
            stage={stage}
            deals={deals.filter((d) => d.stage === stage.id)}
            onStageChange={handleStageChange}
          />
        ))}
      </Box>
    </Box>
  );
}
