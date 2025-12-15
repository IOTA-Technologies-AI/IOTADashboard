'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useBoolean, useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  rowInPage,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from 'src/components/table';

import { DealTableRow } from '../deal-table-row';
import { DealTableToolbar } from '../deal-table-toolbar';
import { DealTableFiltersResult } from '../deal-table-filters-result';

const TABLE_HEAD = [
  { id: 'dealNumber', label: 'Deal #' },
  { id: 'dealName', label: 'Deal Name', width: 200 },
  { id: 'dealDate', label: 'Date', width: 160 },
  { id: 'arInvoiceAmount', label: 'Revenue (AR)', width: 180 },
  { id: 'apInvoiceAmount', label: 'Cost (AP)', width: 180 },
  { id: 'grossProfit', label: 'Gross Profit', width: 180 },
  { id: 'bdmCommissionAmount', label: 'BDM Commission', width: 180 },
  { id: 'bdmPendingAmount', label: 'BDM Pending', width: 180 },
  { id: 'netProfitAfterBDM', label: 'Net Profit', width: 180 },
  { id: 'status', label: 'Status', width: 110 },
  { id: '', width: 88 },
];

const defaultFilters = {
  name: '',
  status: 'all',
  region: 'all',
};

export function DealListView({ deals: initialDeals = [] }) {
  const router = useRouter();
  const table = useTable({ defaultOrderBy: 'dealDate', defaultOrder: 'desc' });
  const confirm = useBoolean();

  const [tableData, setTableData] = useState(initialDeals);

  const filters = useSetState(defaultFilters);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters: filters.state,
  });

  const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);

  const canReset = !!(
    filters.state.name ||
    filters.state.status !== 'all' ||
    filters.state.region !== 'all'
  );

  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const handleViewRow = useCallback(
    (id) => {
      router.push(paths.dashboard.deals.details(id));
    },
    [router]
  );

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.dashboard.deals.edit(id));
    },
    [router]
  );

  const handleDeleteRow = useCallback(
    async (id) => {
      const updatedData = tableData.filter((row) => row.id !== id);
      setTableData(updatedData);
      table.onUpdatePageDeleteRow(dataInPage.length);
    },
    [dataInPage.length, table, tableData]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Deals"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Deals', href: paths.dashboard.deals.root },
          { name: 'List' },
        ]}
        action={
          <Button
            onClick={() => router.push(paths.dashboard.deals.new)}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New Deal
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <DealTableToolbar
          filters={filters}
          onResetPage={table.onResetPage}
          options={{
            statuses: ['all', 'draft', 'active', 'completed', 'cancelled'],
            regions: ['all', 'UAE', 'KSA'],
          }}
        />

        {canReset && (
          <DealTableFiltersResult
            filters={filters}
            totalResults={dataFiltered.length}
            onResetPage={table.onResetPage}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        <Box sx={{ position: 'relative' }}>
          <TableSelectedAction
            dense={table.dense}
            numSelected={table.selected.length}
            rowCount={dataFiltered.length}
            onSelectAllRows={(checked) =>
              table.onSelectAllRows(
                checked,
                dataFiltered.map((row) => row.id)
              )
            }
            action={
              <Tooltip title="Delete">
                <IconButton color="primary" onClick={confirm.onTrue}>
                  <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
              </Tooltip>
            }
          />

          <Scrollbar sx={{ minHeight: 444 }}>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1200 }}>
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
                {dataInPage.map((row) => (
                  <DealTableRow
                    key={row.id}
                    row={row}
                    selected={table.selected.includes(row.id)}
                    onSelectRow={() => table.onSelectRow(row.id)}
                    onViewRow={() => handleViewRow(row.id)}
                    onEditRow={() => handleEditRow(row.id)}
                    onDeleteRow={() => handleDeleteRow(row.id)}
                  />
                ))}

                <TableEmptyRows
                  height={table.dense ? 56 : 56 + 20}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                />

                <TableNoData notFound={notFound} />
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
  );
}

function applyFilter({ inputData, comparator, filters }) {
  const { name, status, region } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  let data = stabilizedThis.map((el) => el[0]);

  if (name) {
    data = data.filter(
      (deal) =>
        deal.dealNumber?.toLowerCase().includes(name.toLowerCase()) ||
        deal.dealName?.toLowerCase().includes(name.toLowerCase())
    );
  }

  if (status !== 'all') {
    data = data.filter((deal) => deal.status === status);
  }

  if (region !== 'all') {
    data = data.filter((deal) => deal.region === region);
  }

  return data;
}
