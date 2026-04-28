'use client';

import useSWR from 'swr';
import { use } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { getPipelineDeal } from 'src/utils/apiHelper';
import { DealNewEditForm } from 'src/sections/sales/view';

// ----------------------------------------------------------------------

export default function Page({ params }) {
  const { id } = use(params);

  const { data, isLoading } = useSWR(`pipeline-deal-${id}`, () => getPipelineDeal(id));

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return <DealNewEditForm deal={data?.deal} />;
}
