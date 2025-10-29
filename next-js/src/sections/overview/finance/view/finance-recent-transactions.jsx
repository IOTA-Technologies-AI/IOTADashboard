'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';

import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { TableHeadCustom } from 'src/components/table';

// ----------------------------------------------------------------------

export function FinanceRecentTransactions({
  title,
  subheader,
  tableData = [],
  headCells = [],
  ...other
}) {
  return (
    <Card {...other}>
      <CardHeader title={title} subheader={subheader} sx={{ mb: 3 }} />

      <TableContainer sx={{ overflow: 'unset' }}>
        <Scrollbar>
          <Table sx={{ minWidth: 720 }}>
            <TableHeadCustom headCells={headCells} />

            <TableBody>
              {tableData.map((row) => (
                <FinanceRecentTransactionRow key={row.id} row={row} />
              ))}
            </TableBody>
          </Table>
        </Scrollbar>
      </TableContainer>
    </Card>
  );
}

// ----------------------------------------------------------------------

function FinanceRecentTransactionRow({ row }) {
  return (
    <TableRow>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar alt={row.name} src={row.avatarUrl} sx={{ mr: 2, width: 48, height: 48 }} />

          <Box>
            <Box sx={{ typography: 'subtitle2' }}>{row.name}</Box>
            <Box sx={{ typography: 'body2', color: 'text.secondary' }}>{row.message}</Box>
          </Box>
        </Box>
      </TableCell>

      <TableCell>
        <Box sx={{ typography: 'body2' }}>{row.date}</Box>
      </TableCell>

      <TableCell>
        <Box sx={{ typography: 'subtitle2' }}>{fCurrency(row.amount)}</Box>
      </TableCell>

      <TableCell>
        <Label
          variant="soft"
          color={
            (row.type === 'Income' && 'success') ||
            (row.type === 'Expenses' && 'error') ||
            'default'
          }
        >
          {row.type}
        </Label>
      </TableCell>

      <TableCell align="right" sx={{ pr: 1 }}>
        <IconButton>
          <Iconify icon="eva:more-vertical-fill" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
