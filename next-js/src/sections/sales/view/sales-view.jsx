'use client';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';

import {
  BookingIllustration,
  CheckInIllustration,
  CheckoutIllustration,
} from 'src/assets/illustrations';

import { useGetBoard } from 'src/actions/kanban';
import { KanbanView } from 'src/sections/kanban/view';
import { BookingBooked } from 'src/sections/overview/booking/booking-booked';
import { BookingTotalIncomes } from 'src/sections/overview/booking/booking-total-incomes';
import { BookingWidgetSummary } from 'src/sections/overview/booking/booking-widget-summary';
import { BookingCheckInWidgets } from 'src/sections/overview/booking/booking-check-in-widgets';

// ----------------------------------------------------------------------

function SalesHighlights({ totals, stageBreakdown }) {
  return (
    <Grid container spacing={3}>
      {[
        {
          title: 'Total deals',
          percent: 0,
          total: totals.totalDeals,
          icon: <BookingIllustration />,
        },
        {
          title: 'Active pipeline',
          percent: 0,
          total: totals.activeDeals,
          icon: <CheckInIllustration />,
        },
        {
          title: 'Closed won',
          percent: 0,
          total: totals.closedWon,
          icon: <CheckoutIllustration />,
        },
      ].map((card) => (
        <Grid key={card.title} size={{ xs: 12, md: 4 }}>
          <BookingWidgetSummary
            title={card.title}
            percent={card.percent}
            total={card.total}
            icon={card.icon}
          />
        </Grid>
      ))}

      <Grid size={{ xs: 12, md: 8 }}>
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' },
          }}
        >
          <BookingTotalIncomes
            title="Pipeline velocity"
            total={totals.totalValue}
            percent={2.6}
            chart={{
              categories: stageBreakdown.map((stage) => stage.label || stage.status),
              series: [{ data: stageBreakdown.map((stage) => stage.quantity) }],
            }}
          />

          <BookingBooked
            title="Stage conversion"
            data={stageBreakdown}
            sx={{ boxShadow: 'none' }}
          />
        </Box>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <BookingCheckInWidgets
          chart={{
            series: [
              { label: 'Won', percent: totals.closedWonPercent, total: totals.closedWon },
              { label: 'Open', percent: totals.openPercent, total: totals.activeDeals },
            ],
          }}
        />
      </Grid>
    </Grid>
  );
}

// ----------------------------------------------------------------------

export function SalesView() {
  const { board, boardLoading } = useGetBoard();

  const { totals, stageBreakdown } = useMemo(() => {
    const tasks = board?.tasks || {};
    const deals = Object.values(tasks).flat();

    const totalDeals = deals.length;
    const closedWon = deals.filter((d) => d.status === 'won').length;
    const activeDeals = deals.filter((d) => d.status !== 'won' && d.status !== 'lost').length;
    const totalValue = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

    const stages = (board?.columns || []).map((stage) => {
      const quantity = (tasks[stage.id] || []).length;
      const value = totalDeals ? Math.min(100, (quantity / Math.max(totalDeals, 1)) * 100) : 0;
      return { status: stage.name, quantity, value };
    });

    const openPercent = totalDeals ? Math.round((activeDeals / totalDeals) * 100) : 0;
    const closedWonPercent = totalDeals ? Math.round((closedWon / totalDeals) * 100) : 0;

    return {
      totals: {
        totalDeals,
        activeDeals,
        closedWon,
        totalValue,
        openPercent,
        closedWonPercent,
      },
      stageBreakdown: stages,
    };
  }, [board?.columns, board?.tasks]);

  return (
    <KanbanView
      title="Sales pipeline"
      maxWidth="xl"
      renderBeforeBoard={<SalesHighlights totals={totals} stageBreakdown={stageBreakdown} />}
      loading={boardLoading}
    />
  );
}
