'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';

import { _bookingsOverview } from 'src/_mock';
import {
  BookingIllustration,
  CheckInIllustration,
  CheckoutIllustration,
} from 'src/assets/illustrations';

import { KanbanView } from 'src/sections/kanban/view';
import { BookingBooked } from 'src/sections/overview/booking/booking-booked';
import { BookingTotalIncomes } from 'src/sections/overview/booking/booking-total-incomes';
import { BookingWidgetSummary } from 'src/sections/overview/booking/booking-widget-summary';
import { BookingCheckInWidgets } from 'src/sections/overview/booking/booking-check-in-widgets';

// ----------------------------------------------------------------------

const summaryCards = [
  {
    title: 'Total deals',
    percent: 4.2,
    total: 128,
    icon: <BookingIllustration />,
  },
  {
    title: 'Active pipeline',
    percent: 1.1,
    total: 76,
    icon: <CheckInIllustration />,
  },
  {
    title: 'Closed won',
    percent: 0.6,
    total: 22,
    icon: <CheckoutIllustration />,
  },
];

// ----------------------------------------------------------------------

function SalesHighlights() {
  return (
    <Grid container spacing={3}>
      {summaryCards.map((card) => (
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
            total={187650}
            percent={2.6}
            chart={{
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
              series: [{ data: [10, 41, 80, 100, 60, 120, 69, 91, 160] }],
            }}
          />

          <BookingBooked
            title="Stage conversion"
            data={_bookingsOverview}
            sx={{ boxShadow: 'none' }}
          />
        </Box>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <BookingCheckInWidgets
          chart={{
            series: [
              { label: 'Won', percent: 62.5, total: 22500 },
              { label: 'Open', percent: 37.5, total: 13500 },
            ],
          }}
        />
      </Grid>
    </Grid>
  );
}

// ----------------------------------------------------------------------

export function SalesView() {
  return <KanbanView title="Sales pipeline" renderBeforeBoard={<SalesHighlights />} />;
}
