'use client';

import { varAlpha } from 'minimal-shared/utils';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import { useTheme } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';

import { fetchProformaInvoices } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
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
  TablePaginationCustom,
} from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

import { ProformaTableRow } from '../proforma-table-row';
import { ProformaApprovalDialog } from '../proforma-approval-dialog';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'proformaNumber', label: 'Customer' },
  { id: 'invoiceNumber', label: 'Invoice' },
  { id: 'issueDate', label: 'Issued' },
  { id: 'supplierName', label: 'Supplier' },
  { id: 'total', label: 'Amount' },
  { id: 'status', label: 'Status' },
  { id: '' },
];

const STATUS_TABS = [
  { value: 'all', label: 'All', color: 'default' },
  { value: 'draft', label: 'Draft', color: 'default' },
  { value: 'approved', label: 'Approved', color: 'info' },
  { value: 'dispatched', label: 'Dispatched', color: 'success' },
  { value: 'rejected', label: 'Rejected', color: 'error' },
];

const roleIdToName = { 1: 'regular', 2: 'manager', 3: 'admin', 4: 'superAdmin' };

const mapRow = (proforma) => ({
  // The table keys off proformaId — it is what the detail and print routes take
  id: proforma.proformaId,
  proformaId: proforma.proformaId,
  proformaNumber: proforma.proformaNumber,
  documentId: proforma.documentId,
  invoiceId: proforma.invoiceId,
  invoiceNumber: proforma.invoiceNumber || '',
  customerName: proforma.customerName || '',
  supplierName: proforma.supplierName || '',
  supplierEmail: proforma.supplierEmail || '',
  issueDate: proforma.issueDate || proforma.createdAt,
  total: proforma.total || 0,
  currencyCode: proforma.currencyCode || 'SAR',
  status: (proforma.status || 'draft').toLowerCase(),
  // Kept whole so the approval dialog has the full record without a refetch
  raw: proforma,
});

export function ProformaListView() {
  const theme = useTheme();
  const table = useTable({ defaultOrderBy: 'issueDate', defaultOrder: 'desc' });
  const { user } = useAuthContext();

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [approvalTarget, setApprovalTarget] = useState(null);

  const role = user?.role || roleIdToName[user?.roleId] || 'regular';
  const canApprove = role === 'admin' || role === 'superAdmin';

  const loadData = useCallback(async () => {
    setLoading(true);
    const list = await fetchProformaInvoices();
    setTableData((list || []).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprovalComplete = useCallback(
    (updated) => {
      setApprovalTarget(null);
      if (updated) {
        setTableData((prev) =>
          prev.map((row) => (row.id === updated.proformaId ? mapRow(updated) : row))
        );
      } else {
        loadData();
      }
    },
    [loadData]
  );

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    status,
    search,
  });

  const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);
  const notFound = !dataFiltered.length && !loading;

  const countFor = (value) =>
    value === 'all' ? tableData.length : tableData.filter((row) => row.status === value).length;

  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Proforma Invoice"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Proforma Invoice' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Card>
          <Tabs
            value={status}
            onChange={(_, value) => {
              setStatus(value);
              table.onResetPage();
            }}
            sx={{
              px: { md: 2.5 },
              boxShadow: `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
            }}
          >
            {STATUS_TABS.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                iconPosition="end"
                icon={
                  <Label
                    variant={((tab.value === 'all' || tab.value === status) && 'filled') || 'soft'}
                    color={tab.color}
                  >
                    {countFor(tab.value)}
                  </Label>
                }
              />
            ))}
          </Tabs>

          <Box sx={{ p: 2.5 }}>
            <TextField
              fullWidth
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                table.onResetPage();
              }}
              placeholder="Search proforma, invoice, customer or supplier…"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Box sx={{ position: 'relative' }}>
            <Scrollbar sx={{ minHeight: 444 }}>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 900 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headCells={TABLE_HEAD}
                  rowCount={dataFiltered.length}
                  onSort={table.onSort}
                />

                <TableBody>
                  {loading ? (
                    <TableSkeleton rowCount={table.rowsPerPage} cellCount={TABLE_HEAD.length} />
                  ) : (
                    <>
                      {dataInPage.map((row) => (
                        <ProformaTableRow
                          key={row.id}
                          row={row}
                          detailsHref={paths.dashboard.proformaInvoice.details(row.id)}
                          canApprove={canApprove}
                          onOpenApproval={(target) => setApprovalTarget(target.raw)}
                        />
                      ))}

                      <TableEmptyRows
                        height={table.dense ? 56 : 76}
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

      <ProformaApprovalDialog
        open={!!approvalTarget}
        onClose={() => setApprovalTarget(null)}
        proforma={approvalTarget}
        onComplete={handleApprovalComplete}
      />
    </>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, comparator, status, search }) {
  const stabilized = inputData.map((el, index) => [el, index]);

  stabilized.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  let data = stabilized.map((el) => el[0]);

  if (status !== 'all') {
    data = data.filter((row) => row.status === status);
  }

  if (search) {
    const needle = search.toLowerCase();
    data = data.filter((row) =>
      [row.proformaNumber, row.documentId, row.invoiceNumber, row.customerName, row.supplierName]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(needle))
    );
  }

  return data;
}
