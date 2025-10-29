'use client';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import CardHeader from '@mui/material/CardHeader';
import ListItemText from '@mui/material/ListItemText';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function FinanceQuickActions({ ...other }) {
  const router = useRouter();

  const actions = [
    {
      name: 'Create Payment',
      icon: 'solar:wallet-bold-duotone',
      color: '#00B8D9',
      path: paths.dashboard.finance.payments.new,
    },
    {
      name: 'Create Invoice',
      icon: 'solar:bill-list-bold-duotone',
      color: '#22C55E',
      path: '#',
    },
    {
      name: 'Journal Entry',
      icon: 'solar:notebook-bold-duotone',
      color: '#FF5630',
      path: paths.dashboard.finance.journalEntries,
    },
    {
      name: 'View Reports',
      icon: 'solar:chart-2-bold-duotone',
      color: '#FFAB00',
      path: paths.dashboard.finance.reports.root,
    },
  ];

  return (
    <Card {...other}>
      <CardHeader title="Quick Actions" />

      <Stack spacing={2} sx={{ p: 3 }}>
        {actions.map((action) => (
          <Stack
            key={action.name}
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{
              p: 2,
              borderRadius: 2,
              cursor: 'pointer',
              border: (theme) => `solid 1px ${theme.palette.divider}`,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
            onClick={() => router.push(action.path)}
          >
            <Avatar sx={{ bgcolor: `${action.color}14` }}>
              <Iconify icon={action.icon} sx={{ color: action.color }} width={24} />
            </Avatar>

            <ListItemText
              primary={action.name}
              primaryTypographyProps={{ typography: 'subtitle2' }}
            />

            <Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ color: 'text.disabled' }} />
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
