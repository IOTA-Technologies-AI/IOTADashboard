'use client';

import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';

import { fetchZohoInvoices } from 'src/utils/apiHelper'; // Import the fetchZohoInvoices function

import { Scrollbar } from 'src/components/scrollbar';
import { TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { AccountTableRow } from './account-table-row'; // Create this component for row rendering
//import Iconify from 'src/components/iconify';

const TABLE_HEAD = [
  { id: 'invoice_number', label: 'Invoice Number' },
  { id: 'customer_name', label: 'Customer Name' },
  { id: 'total', label: 'Total Amount' },
  { id: 'status', label: 'Status' },
  { id: 'paid_date', label: 'Paid Date' },
];

export function AccountsListView() {
  const [tableData, setTableData] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Fetch Zoho invoices on component mount
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const invoices = await fetchZohoInvoices(); // Fetch invoices from Zoho
        const formattedInvoices = invoices.map((invoice) => ({
          id: invoice.invoice_id,
          invoice_number: invoice.invoice_number,
          customer_name: invoice.customer_name,
          total: invoice.total,
          status: invoice.status,
          paid_date: invoice.last_payment_date,
        }));
        setTableData(formattedInvoices); // Update table data with fetched invoices
      } catch (error) {
        console.error('Failed to fetch Zoho invoices:', error);
      }
    };

    fetchInvoices();
  }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const dataInPage = tableData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleDeleteRow = (id) => {
    // Implement the delete functionality here
    console.log('Delete row with id:', id);
  };

  return (
    <Card>
      <Scrollbar>
        <Table>
          <TableHeadCustom headCells={TABLE_HEAD} />
          <TableBody>
            {dataInPage.map((row) => (
              <AccountTableRow key={row.id} row={row} onDeleteRow={() => handleDeleteRow(row.id)} />
            ))}
            <TableNoData notFound={!dataInPage.length} />
          </TableBody>
        </Table>
      </Scrollbar>

      <TablePaginationCustom
        count={tableData.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Card>
  );
}
