'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useBoolean, useSetState } from 'minimal-shared/hooks';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';

import { paths } from 'src/routes/paths';

import { apiHelper } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
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
  TablePaginationCustom,
} from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

import { VendorTableRow } from '../vendor-table-row';
import { VendorTableToolbar } from '../vendor-table-toolbar';
import { VendorTableFiltersResult } from '../vendor-table-filters-result';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'vendorCode', label: 'Vendor Code' },
  { id: 'vendorName', label: 'Vendor Name' },
  { id: 'vatNumber', label: 'VAT Number' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'status', label: 'Status' },
  { id: '', width: 88 },
];

// ----------------------------------------------------------------------

export function VendorListView({ vendors = [] }) {
  const table = useTable();
  const router = useRouter();
  const confirm = useBoolean();
  const { user, authenticated } = useAuthContext();

  const roleIdToName = { 1: 'regular', 2: 'manager', 3: 'admin', 4: 'superAdmin' };
  const normalizedRole = user?.role || roleIdToName[user?.roleId] || 'regular';
  const canEdit = normalizedRole === 'superAdmin';

  const [tableData, setTableData] = useState(vendors);
  const [loadError, setLoadError] = useState(null);
  // Starts true: until the first fetch resolves the table has no rows, and
  // without this the empty-state renders "No data" over a list that is simply
  // still loading.
  const [loading, setLoading] = useState(true);

  // Fetched on the client, not in the server component that renders this view:
  // both bearer-token sources are browser-only (`extractJWTFromSession` and
  // `getLiveAccessToken` return null when `typeof window === 'undefined'`), so
  // an SSR fetch cannot authenticate and silently yielded an empty list.
  useEffect(() => {
    // Wait for the session. The bearer token comes from the live Supabase
    // session, so firing on mount can send the request before that session is
    // restored — the gateway then rejects it with "Authentication required"
    // for a user who is perfectly well signed in. Re-runs when auth settles.
    if (!authenticated) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const rows = await apiHelper.getVendors();
        if (!cancelled) {
          setTableData(rows || []);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || 'Could not load vendors.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  const filters = useSetState({
    name: '',
    status: 'all',
  });

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters: filters.state,
  });

  const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);

  const canReset = !!filters.state.name || filters.state.status !== 'all';

  const notFound = !loading && !dataFiltered.length;

  const handleDeleteRow = useCallback(
    (id) => {
      const deleteRow = tableData.filter((row) => row.id !== id);
      setTableData(deleteRow);
      table.onUpdatePageDeleteRow(dataInPage.length);
    },
    [dataInPage.length, table, tableData]
  );

  const handleDeleteRows = useCallback(() => {
    const deleteRows = tableData.filter((row) => !table.selected.includes(row.id));
    setTableData(deleteRows);
    table.onUpdatePageDeleteRows({
      totalRowsInPage: dataInPage.length,
      totalRowsFiltered: dataFiltered.length,
    });
  }, [dataFiltered.length, dataInPage.length, table, tableData]);

  const handleEditRow = useCallback(
    (id) => {
      if (!canEdit) {
        toast.error('Only super admins can edit vendors');
        return;
      }
      router.push(paths.dashboard.vendor.edit(id));
    },
    [canEdit, router]
  );

  const handleViewRow = useCallback(
    (id) => {
      router.push(paths.dashboard.vendor.details(id));
    },
    [router]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Vendor List"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Vendor', href: paths.dashboard.vendor.root },
          { name: 'List' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => router.push(paths.dashboard.vendor.new)}
          >
            New Vendor
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <VendorTableToolbar
          filters={filters}
          onResetPage={table.onResetPage}
          options={{ statuses: ['all', 'active', 'inactive'] }}
        />

        {canReset && (
          <VendorTableFiltersResult
            filters={filters}
            totalResults={dataFiltered.length}
            onResetPage={table.onResetPage}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        <Scrollbar>
          <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
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
              {dataFiltered
                .slice(
                  table.page * table.rowsPerPage,
                  table.page * table.rowsPerPage + table.rowsPerPage
                )
                .map((row) => (
                  <VendorTableRow
                    key={row.id}
                    row={row}
                    selected={table.selected.includes(row.id)}
                    onSelectRow={() => table.onSelectRow(row.id)}
                    onDeleteRow={() => handleDeleteRow(row.id)}
                    onEditRow={() => handleEditRow(row.id)}
                    onViewRow={() => handleViewRow(row.id)}
                  />
                ))}

              <TableEmptyRows
                height={table.dense ? 56 : 76}
                emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
              />

              {/* A failed load must not look like an empty vendor list. */}
              {loadError ? (
                <TableNoData
                  notFound
                  title="Could not load vendors"
                  subTitle={loadError}
                  sx={{ '& .MuiTypography-h6': { color: 'error.main' } }}
                />
              ) : (
                <TableNoData notFound={notFound} />
              )}
            </TableBody>
          </Table>
        </Scrollbar>

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

// ----------------------------------------------------------------------

function applyFilter({ inputData, comparator, filters }) {
  const { name, status } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (name) {
    inputData = inputData.filter(
      (vendor) => vendor.vendorName.toLowerCase().indexOf(name.toLowerCase()) !== -1
    );
  }

  if (status !== 'all') {
    inputData = inputData.filter((vendor) => vendor.status === status);
  }

  return inputData;
}
