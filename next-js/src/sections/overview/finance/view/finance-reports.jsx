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

export function FinanceReports({ ...other }) {
  const router = useRouter();

  const reports = [
    {
      name: 'AR Aging Report',
      description: 'Accounts Receivable aging',
      icon: 'solar:document-text-bold-duotone',
      color: '#00B8D9',
      path: paths.dashboard.finance.reports.arAging,
    },
    {
      name: 'AP Aging Report',
      description: 'Accounts Payable aging',
      icon: 'solar:bill-list-bold-duotone',
      color: '#FF5630',
      path: paths.dashboard.finance.reports.apAging,
    },
    {
      name: 'Payment History',
      description: 'All payment transactions',
      icon: 'solar:wallet-bold-duotone',
      color: '#22C55E',
      path: paths.dashboard.finance.reports.paymentHistory,
    },
    {
      name: 'Expense Report',
      description: 'Expenses by category',
      icon: 'solar:chart-2-bold-duotone',
      color: '#FFAB00',
      path: paths.dashboard.finance.reports.expenseByCategory,
    },
  ];

  return (
    <Card {...other}>
      <CardHeader title="Financial Reports" />

      <Stack spacing={2} sx={{ p: 3 }}>
        {reports.map((report) => (
          <Stack
            key={report.name}
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
            onClick={() => router.push(report.path)}
          >
            <Avatar sx={{ bgcolor: `${report.color}14` }}>
              <Iconify icon={report.icon} sx={{ color: report.color }} width={24} />
            </Avatar>

            <ListItemText
              primary={report.name}
              secondary={report.description}
              primaryTypographyProps={{ typography: 'subtitle2' }}
              secondaryTypographyProps={{ typography: 'caption', color: 'text.disabled' }}
            />

            <Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ color: 'text.disabled' }} />
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
