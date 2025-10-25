'use client';

import { sumBy } from 'es-toolkit';
import { varAlpha } from 'minimal-shared/utils';
import { useState, useEffect, useCallback } from 'react';
import { useBoolean, useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fIsAfter } from 'src/utils/format-time';
import { fetchInvoices, deleteInvoice } from 'src/utils/apiHelper';

import { INVOICE_SERVICE_OPTIONS } from 'src/_mock';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  rowInPage,
  TableNoData,
  getComparator,
  TableSkeleton,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from 'src/components/table';

import { InvoiceAnalytic } from '../invoice-analytic';
import { InvoiceTableRow } from '../invoice-table-row';
import { InvoiceTableToolbar } from '../invoice-table-toolbar';
import { InvoiceTableFiltersResult } from '../invoice-table-filters-result';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'invoiceNumber', label: 'Customer' },
  { id: 'createDate', label: 'Create' },
  { id: 'dueDate', label: 'Due' },
  { id: 'price', label: 'Amount' },
  { id: 'sent', label: 'Sent', align: 'center' },
  { id: 'status', label: 'Status' },
  { id: '' },
];

// ----------------------------------------------------------------------

const mapBackendInvoiceToFrontend = (invoice) => ({
  // Required fields for table row
  id: invoice.invoiceId || invoice.id,
  invoiceNumber: invoice.invoiceNumber,

  // ✅ Convert customerName string to invoiceTo object
  invoiceTo: {
    name: invoice.customerName || 'Unknown Customer',
  },

  // ✅ Map field names
  createDate: invoice.invoiceDate || invoice.createdAt,
  dueDate: invoice.dueDate,
  totalAmount: invoice.total || 0,

  // ✅ Convert status to lowercase
  status: (invoice.status || 'draft').toLowerCase(),

  // Optional fields
  items: invoice.items || [],
  subtotal: invoice.baseAmount || 0,
  taxes: invoice.vatAmount ? `${invoice.vatRate}%` : '0%',
  vatAmount: invoice.vatAmount || 0,
  vatRate: invoice.vatRate || 0,
  balance: invoice.balance || 0,
  currencyCode: invoice.currencyCode || 'SAR',
  sent: invoice.isReminderSent ? 1 : 0,
});

export function InvoiceListView() {
  const theme = useTheme();
  const table = useTable({ defaultOrderBy: 'createDate' });
  const confirmDialog = useBoolean();
  const [tableData, setTableData] = useState([]); // ✅ Changed from _invoices to []
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        const invoices = await fetchInvoices();
        console.log('✅ Fetched raw invoices:', invoices);

        // ✅ Map backend data to frontend format
        const mappedInvoices = invoices.map(mapBackendInvoiceToFrontend);
        console.log('✅ Mapped invoices:', mappedInvoices);

        setTableData(mappedInvoices);
      } catch (error) {
        console.error('❌ Failed to fetch invoices:', error);
        toast.error('Failed to load invoices');
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, []);

  const filters = useSetState({
    name: '',
    service: [],
    status: 'all',
    startDate: null,
    endDate: null,
  });
  const { state: currentFilters, setState: updateFilters } = filters;

  const dateError = fIsAfter(currentFilters.startDate, currentFilters.endDate);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters: currentFilters,
    dateError,
  });

  const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);

  const canReset =
    !!currentFilters.name ||
    currentFilters.service.length > 0 ||
    currentFilters.status !== 'all' ||
    (!!currentFilters.startDate && !!currentFilters.endDate);

  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const getInvoiceLength = (status) => tableData.filter((item) => item.status === status).length;

  const getTotalAmount = (status) =>
    sumBy(
      tableData.filter((item) => item.status === status),
      (invoice) => invoice.totalAmount
    );

  const getPercentByStatus = (status) =>
    tableData.length > 0 ? (getInvoiceLength(status) / tableData.length) * 100 : 0;

  const TABS = [
    {
      value: 'all',
      label: 'All',
      color: 'default',
      count: tableData.length,
    },
    {
      value: 'paid',
      label: 'Paid',
      color: 'success',
      count: tableData.filter((item) => item.status.toLowerCase() === 'paid').length,
    },
    {
      value: 'pending',
      label: 'Pending',
      color: 'warning',
      count: tableData.filter((item) => item.status.toLowerCase() === 'pending').length,
    },
    {
      value: 'overdue',
      label: 'Overdue',
      color: 'error',
      count: getInvoiceLength('overdue'),
    },
    {
      value: 'draft',
      label: 'Draft',
      color: 'default',
      count: getInvoiceLength('draft'),
    },
  ];

  const handleDeleteRow = useCallback(
    async (id) => {
      try {
        // Call backend API to delete invoice
        await deleteInvoice(id);

        // Remove from local state after successful backend deletion
        const deleteRow = tableData.filter((row) => row.id !== id);
        setTableData(deleteRow);
        table.onUpdatePageDeleteRow(dataInPage.length);

        toast.success('Invoice deleted successfully!');
      } catch (error) {
        console.error('Failed to delete invoice:', error);
        toast.error('Failed to delete invoice');
      }
    },
    [dataInPage.length, table, tableData]
  );

  const handleDeleteRows = useCallback(async () => {
    try {
      // Call backend API to delete all selected invoices
      const deletePromises = table.selected.map((id) => deleteInvoice(id));
      await Promise.all(deletePromises);

      // Remove from local state after successful backend deletion
      const deleteRows = tableData.filter((row) => !table.selected.includes(row.id));
      setTableData(deleteRows);
      table.onUpdatePageDeleteRows(dataInPage.length, dataFiltered.length);

      toast.success(`${table.selected.length} invoices deleted successfully!`);
    } catch (error) {
      console.error('Failed to delete invoices:', error);
      toast.error('Failed to delete invoices');
    }
  }, [dataFiltered.length, dataInPage.length, table, tableData]);

  const handleFilterStatus = useCallback(
    (event, newValue) => {
      table.onResetPage();
      updateFilters({ status: newValue });
    },
    [updateFilters, table]
  );

  const renderConfirmDialog = () => (
    <ConfirmDialog
      open={confirmDialog.value}
      onClose={confirmDialog.onFalse}
      title="Delete"
      content={
        <>
          Are you sure want to delete <strong> {table.selected.length} </strong> items?
        </>
      }
      action={
        <Button
          variant="contained"
          color="error"
          onClick={() => {
            handleDeleteRows();
            confirmDialog.onFalse();
          }}
        >
          Delete
        </Button>
      }
    />
  );

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="List"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Invoice', href: paths.dashboard.invoice.root },
            { name: 'List' },
          ]}
          action={
            <Button
              component={RouterLink}
              href={paths.dashboard.invoice.new}
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              Add invoice
            </Button>
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card sx={{ mb: { xs: 3, md: 5 } }}>
          <Scrollbar sx={{ minHeight: 108 }}>
            <Stack
              divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
              sx={{ py: 2, flexDirection: 'row' }}
            >
              <InvoiceAnalytic
                title="Total"
                total={tableData.length}
                percent={100}
                price={sumBy(tableData, (invoice) => invoice.totalAmount)}
                icon="solar:bill-list-bold-duotone"
                color={theme.vars.palette.info.main}
              />

              <InvoiceAnalytic
                title="Paid"
                total={tableData.filter((item) => item.status.toLowerCase() === 'paid').length}
                percent={getPercentByStatus('paid')}
                price={tableData
                  .filter((item) => item.status.toLowerCase() === 'paid')
                  .reduce((sum, invoice) => sum + invoice.totalAmount, 0)}
                icon="solar:file-check-bold-duotone"
                color={theme.vars.palette.success.main}
              />

              <InvoiceAnalytic
                title="Pending"
                total={tableData.filter((item) => item.status.toLowerCase() === 'pending').length}
                percent={getPercentByStatus('pending')}
                price={tableData
                  .filter((item) => item.status.toLowerCase() === 'pending')
                  .reduce((sum, invoice) => sum + invoice.totalAmount, 0)}
                icon="solar:sort-by-time-bold-duotone"
                color={theme.vars.palette.warning.main}
              />

              <InvoiceAnalytic
                title="Overdue"
                total={getInvoiceLength('overdue')}
                percent={getPercentByStatus('overdue')}
                price={getTotalAmount('overdue')}
                icon="solar:bell-bing-bold-duotone"
                color={theme.vars.palette.error.main}
              />

              <InvoiceAnalytic
                title="Draft"
                total={getInvoiceLength('draft')}
                percent={getPercentByStatus('draft')}
                price={getTotalAmount('draft')}
                icon="solar:file-corrupted-bold-duotone"
                color={theme.vars.palette.text.secondary}
              />
            </Stack>
          </Scrollbar>
        </Card>

        <Card>
          <Tabs
            value={currentFilters.status}
            onChange={handleFilterStatus}
            sx={{
              px: { md: 2.5 },
              boxShadow: `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
            }}
          >
            {TABS.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                iconPosition="end"
                icon={
                  <Label
                    variant={
                      ((tab.value === 'all' || tab.value === currentFilters.status) && 'filled') ||
                      'soft'
                    }
                    color={tab.color}
                  >
                    {tab.count}
                  </Label>
                }
              />
            ))}
          </Tabs>

          <InvoiceTableToolbar
            filters={filters}
            dateError={dateError}
            onResetPage={table.onResetPage}
            options={{ services: INVOICE_SERVICE_OPTIONS.map((option) => option.name) }}
          />

          {canReset && (
            <InvoiceTableFiltersResult
              filters={filters}
              onResetPage={table.onResetPage}
              totalResults={dataFiltered.length}
              sx={{ p: 2.5, pt: 0 }}
            />
          )}

          <Box sx={{ position: 'relative' }}>
            <TableSelectedAction
              dense={table.dense}
              numSelected={table.selected.length}
              rowCount={dataFiltered.length}
              onSelectAllRows={(checked) => {
                table.onSelectAllRows(
                  checked,
                  dataFiltered.map((row) => row.id)
                );
              }}
              action={
                <Box sx={{ display: 'flex' }}>
                  <Tooltip title="Sent">
                    <IconButton color="primary">
                      <Iconify icon="custom:send-fill" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Download">
                    <IconButton color="primary">
                      <Iconify icon="solar:download-bold" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Print">
                    <IconButton color="primary">
                      <Iconify icon="solar:printer-minimalistic-bold" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Delete">
                    <IconButton color="primary" onClick={confirmDialog.onTrue}>
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />

            <Scrollbar sx={{ minHeight: 444 }}>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headCells={TABLE_HEAD}
                  rowCount={dataFiltered.length}
                  numSelected={table.selected.length}
                  onSort={table.onSort}
                  onSelectAllRows={(checked) =>
                    table.onSelectAllRows(
                      checked,
                      dataFiltered.map((row) => row.id)
                    )
                  }
                />

                <TableBody>
                  {loading ? (
                    <TableSkeleton
                      rowCount={table.rowsPerPage}
                      cellCount={TABLE_HEAD.length}
                      sx={{ height: table.dense ? 56 : 76 }}
                    />
                  ) : (
                    <>
                      {dataFiltered
                        .slice(
                          table.page * table.rowsPerPage,
                          table.page * table.rowsPerPage + table.rowsPerPage
                        )
                        .map((row) => (
                          <InvoiceTableRow
                            key={row.id}
                            row={row}
                            selected={table.selected.includes(row.id)}
                            onSelectRow={() => table.onSelectRow(row.id)}
                            onDeleteRow={() => handleDeleteRow(row.id)}
                            editHref={paths.dashboard.invoice.edit(row.id)}
                            detailsHref={paths.dashboard.invoice.details(row.id)}
                          />
                        ))}

                      <TableEmptyRows
                        height={table.dense ? 56 : 56 + 20}
                        emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                      />

                      <TableNoData notFound={notFound} />
                    </>
                  )}
                </TableBody>
              </Table>
            </Scrollbar>
          </Box>

          <TablePaginationCustom
            page={table.page}
            dense={table.dense}
            count={dataFiltered.length}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onChangeDense={table.onChangeDense}
            onRowsPerPageChange={table.onChangeRowsPerPage}
          />
        </Card>
      </DashboardContent>

      {renderConfirmDialog()}
    </>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, comparator, filters, dateError }) {
  const { name, status, service, startDate, endDate } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (name) {
    inputData = inputData.filter(({ invoice_id, invoiceTo }) =>
      [invoice_id, invoiceTo.name, invoiceTo.company, invoiceTo.phoneNumber].some((field) =>
        field?.toLowerCase().includes(name.toLowerCase())
      )
    );
  }

  if (status !== 'all') {
    inputData = inputData.filter((invoice) => invoice.status === status);
  }

  if (service.length) {
    inputData = inputData.filter((invoice) =>
      invoice.items.some((filterItem) => service.includes(filterItem.service))
    );
  }

  if (!dateError) {
    if (startDate && endDate) {
      inputData = inputData.filter((invoice) => {
        const invoiceDate = new Date(invoice.createDate);
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Set all times to start of day for date-only comparison
        invoiceDate.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999); // Set end to end of day to include all invoices on that date

        return invoiceDate >= start && invoiceDate <= end;
      });
    }
  }

  return inputData;
}
