'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function FinanceCurrentBalance({ title, currentBalance, sentAmount, ...other }) {
  const theme = useTheme();

  return (
    <Card {...other}>
      <CardHeader title={title} />

      <Stack
        spacing={3}
        sx={{
          px: 3,
          py: 5,
          borderRadius: 2,
          position: 'relative',
          color: 'common.white',
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        }}
      >
        <Box>
          <Box sx={{ mb: 1, typography: 'subtitle2', opacity: 0.72 }}>Current Balance</Box>
          <Box sx={{ typography: 'h3' }}>{fCurrency(currentBalance)}</Box>
        </Box>

        <Stack direction="row" spacing={3} sx={{ width: 1 }}>
          <Stack spacing={1} sx={{ width: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ typography: 'subtitle2', opacity: 0.72 }}
            >
              <Iconify icon="eva:diagonal-arrow-right-up-fill" width={20} />
              <Box>AR Collections</Box>
            </Stack>
            <Box sx={{ typography: 'h6' }}>{fCurrency(sentAmount)}</Box>
          </Stack>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ borderStyle: 'dashed', borderColor: 'currentColor', opacity: 0.24 }}
          />

          <Stack spacing={1} sx={{ width: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ typography: 'subtitle2', opacity: 0.72 }}
            >
              <Iconify icon="eva:diagonal-arrow-right-down-fill" width={20} />
              <Box>AP Payments</Box>
            </Stack>
            <Box sx={{ typography: 'h6' }}>{fCurrency(sentAmount * 0.8)}</Box>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}
