'use client';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

export function AccountTableRow({ row }) {
  const { invoice_number, customer_name, total, status, last_payment_date } = row;

  return (
    <TableRow>
      <TableCell>{invoice_number}</TableCell>
      <TableCell>{customer_name}</TableCell>
      <TableCell>{total}</TableCell>
      <TableCell>{status}</TableCell>
      <TableCell>{last_payment_date}</TableCell>
    </TableRow>
  );
}
