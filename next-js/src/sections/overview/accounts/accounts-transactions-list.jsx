'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { TableHeadCustom } from 'src/components/table';

// ----------------------------------------------------------------------

const HEAD_CELLS = [
  { id: 'description', label: 'Description' },
  { id: 'type', label: 'Type', align: 'center' },
  { id: 'date', label: 'Date' },
  { id: 'category', label: 'Category' },
  { id: 'amount', label: 'Amount', align: 'right' },
  { id: 'reconciliation', label: 'Reconciliation', align: 'center' },
];

const CATEGORY_ICONS = {
  salary: 'solar:user-bold',
  rent: 'solar:home-bold',
  utilities: 'solar:bolt-bold',
  vendor_payment: 'solar:cart-3-bold',
  customer_receipt: 'solar:wallet-money-bold',
  bank_fees: 'solar:card-recive-bold',
  vat: 'solar:document-bold',
  transfer_in: 'solar:arrow-down-bold',
  transfer_out: 'solar:arrow-up-bold',
  maintenance_fee: 'solar:settings-bold',
  other: 'solar:widget-bold',
};

function ReconciliationChip({ transaction }) {
  if (transaction.reconciled) {
    return (
      <Chip
        size="small"
        label="Matched"
        icon={<Iconify icon="solar:check-circle-bold" width={14} />}
        color="success"
        variant="soft"
      />
    );
  }
  if (transaction.statementId) {
    return (
      <Chip
        size="small"
        label="Statement"
        icon={<Iconify icon="solar:file-text-bold" width={14} />}
        color="info"
        variant="soft"
      />
    );
  }
  return (
    <Chip
      size="small"
      label="Pending"
      icon={<Iconify icon="solar:clock-circle-bold" width={14} />}
      color="warning"
      variant="soft"
    />
  );
}

function TransactionRow({ row }) {
  const isIncoming = row.transactionType === 'credit';
  const categoryIcon = CATEGORY_ICONS[row.category] || CATEGORY_ICONS.other;

  return (
    <TableRow hover>
      {/* Description */}
      <TableCell sx={{ minWidth: 220 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: isIncoming ? 'success.lighter' : 'error.lighter',
            }}
          >
            <Iconify
              icon={categoryIcon}
              width={18}
              sx={{ color: isIncoming ? 'success.dark' : 'error.dark' }}
            />
          </Avatar>
          <ListItemText
            primary={
              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                {row.description || row.counterpartyName || '—'}
              </Typography>
            }
            secondary={
              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                {row.counterpartyName || row.referenceNumber || ''}
              </Typography>
            }
          />
        </Box>
      </TableCell>

      {/* Type */}
      <TableCell align="center">
        <Chip
          size="small"
          label={isIncoming ? 'Incoming' : 'Outgoing'}
          icon={
            <Iconify
              icon={isIncoming ? 'solar:arrow-down-bold' : 'solar:arrow-up-bold'}
              width={14}
            />
          }
          color={isIncoming ? 'success' : 'error'}
          variant="soft"
        />
      </TableCell>

      {/* Date */}
      <TableCell>
        <Typography variant="caption" color="text.secondary">
          {row.transactionDate ? fDate(row.transactionDate) : '—'}
        </Typography>
      </TableCell>

      {/* Category */}
      <TableCell>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
          {row.category?.replace(/_/g, ' ') || '—'}
        </Typography>
      </TableCell>

      {/* Amount */}
      <TableCell align="right">
        <Typography variant="subtitle2" sx={{ color: isIncoming ? 'success.main' : 'error.main' }}>
          {isIncoming ? '+' : '-'}
          {fCurrency(Math.abs(row.amount || 0), { currencyCode: 'SAR' })}
        </Typography>
      </TableCell>

      {/* Reconciliation */}
      <TableCell align="center">
        <ReconciliationChip transaction={row} />
      </TableCell>
    </TableRow>
  );
}

// ----------------------------------------------------------------------

export function AccountsTransactionsList({ title, subheader, tableData = [], sx, ...other }) {
  const [tab, setTab] = useState('all');

  const TAB_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'credit', label: 'Incoming' },
    { value: 'debit', label: 'Outgoing' },
    { value: 'unreconciled', label: 'Unreconciled' },
  ];

  const filtered = tableData.filter((row) => {
    if (tab === 'credit') return row.transactionType === 'credit';
    if (tab === 'debit') return row.transactionType === 'debit';
    if (tab === 'unreconciled') return !row.reconciled;
    return true;
  });

  const displayRows = filtered.slice(0, 50);

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} />

      {/* Filter Tabs */}
      <Box sx={{ px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {TAB_OPTIONS.map((opt) => {
            const count =
              opt.value === 'all'
                ? tableData.length
                : opt.value === 'unreconciled'
                  ? tableData.filter((r) => !r.reconciled).length
                  : tableData.filter((r) => r.transactionType === opt.value).length;
            return <Tab key={opt.value} value={opt.value} label={`${opt.label} (${count})`} />;
          })}
        </Tabs>
      </Box>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Scrollbar sx={{ minHeight: 400 }}>
        <Table sx={{ minWidth: 720 }}>
          <TableHeadCustom headCells={HEAD_CELLS} />
          <TableBody>
            {displayRows.length > 0 ? (
              displayRows.map((row) => <TransactionRow key={row.id} row={row} />)
            ) : (
              <TableRow>
                <TableCell colSpan={HEAD_CELLS.length} align="center" sx={{ py: 6 }}>
                  <Box sx={{ color: 'text.secondary' }}>
                    <Iconify icon="solar:file-text-bold" width={40} sx={{ mb: 1, opacity: 0.4 }} />
                    <Typography variant="body2">No transactions found</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Scrollbar>

      {filtered.length > displayRows.length && (
        <>
          <Divider sx={{ borderStyle: 'dashed' }} />
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Button
              size="small"
              color="inherit"
              endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
            >
              View all {filtered.length} transactions
            </Button>
          </Box>
        </>
      )}
    </Card>
  );
}
