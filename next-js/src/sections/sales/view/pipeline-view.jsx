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
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { listPipelineDeals, updatePipelineDealStage } from 'src/utils/apiHelper';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STAGES = [
  { id: 'lead', label: 'Lead', color: '#8C9EFF' },
  { id: 'qualified', label: 'Qualified', color: '#40C4FF' },
  { id: 'proposal', label: 'Proposal', color: '#FFD740' },
  { id: 'negotiation', label: 'Negotiation', color: '#FF6D00' },
  { id: 'won', label: 'Won', color: '#69F0AE' },
  { id: 'lost', label: 'Lost', color: '#FF5252' },
];

const PRIORITY_COLORS = { hot: 'error', warm: 'warning', cold: 'info' };

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

  const fmt = (n) =>
    n
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: deal.currency || 'USD',
          maximumFractionDigits: 0,
        }).format(n)
      : null;

  return (
    <Card
      sx={{
        p: 1.5,
        mb: 1.5,
        cursor: 'pointer',
        '&:hover': { boxShadow: 4 },
        transition: 'box-shadow 0.2s',
        opacity: changing ? 0.5 : 1,
      }}
      onClick={() => router.push(paths.dashboard.sales.deals.details(deal.id))}
    >
      {/* Priority + value */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Chip
          label={deal.priority}
          size="small"
          color={PRIORITY_COLORS[deal.priority] || 'default'}
          sx={{ height: 20, fontSize: 10, textTransform: 'capitalize' }}
        />
        {fmt(deal.value) && (
          <Typography variant="caption" fontWeight="bold" color="success.main">
            {fmt(deal.value)}
          </Typography>
        )}
      </Stack>

      <Typography variant="subtitle2" noWrap>
        {deal.dealTitle}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap>
        {deal.company}
      </Typography>

      {deal.assignedBdm && (
        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          <Iconify icon="solar:user-bold" width={12} sx={{ mr: 0.5, verticalAlign: 'middle' }} />
          {deal.assignedBdm}
        </Typography>
      )}

      {/* Move to stage */}
      <Box onClick={(e) => e.stopPropagation()} sx={{ mt: 1 }}>
        <Select
          size="small"
          value={deal.stage}
          onChange={(e) => handleMove(e.target.value)}
          disabled={changing}
          sx={{ width: '100%', fontSize: 12, height: 28 }}
        >
          {STAGES.map((s) => (
            <MenuItem key={s.id} value={s.id} sx={{ fontSize: 12 }}>
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
  const totalValue = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const fmt = (n) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <Box
      sx={{
        minWidth: 280,
        maxWidth: 280,
        bgcolor: 'background.neutral',
        borderRadius: 2,
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 220px)',
      }}
    >
      {/* Column header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: stage.color,
            }}
          />
          <Typography variant="subtitle2">{stage.label}</Typography>
          <Chip label={deals.length} size="small" sx={{ height: 18, fontSize: 10 }} />
        </Stack>
        <Tooltip title="Add deal in this stage">
          <IconButton
            size="small"
            onClick={() => router.push(`${paths.dashboard.sales.deals.new}?stage=${stage.id}`)}
          >
            <Iconify icon="mingcute:add-line" width={16} />
          </IconButton>
        </Tooltip>
      </Stack>

      {totalValue > 0 && (
        <Typography variant="caption" color="text.secondary" mb={1}>
          {fmt(totalValue)}
        </Typography>
      )}

      {/* Cards */}
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onStageChange={onStageChange} />
        ))}
        {deals.length === 0 && (
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ display: 'block', textAlign: 'center', mt: 2 }}
          >
            No deals
          </Typography>
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
      // Optimistic update
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
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4">Sales Pipeline</Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => router.push(paths.dashboard.sales.deals.new)}
        >
          New Deal
        </Button>
      </Stack>

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          pb: 2,
          alignItems: 'flex-start',
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
