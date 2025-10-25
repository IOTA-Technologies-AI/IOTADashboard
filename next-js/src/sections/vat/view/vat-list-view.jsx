'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';

import { getQuarterlyVATData } from 'src/utils/vat-api-helper';
import {
  getLastQuarter,
  aggregateVATTotals,
  calculateZATCAPayable,
} from 'src/utils/vat-calculator';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomPopover } from 'src/components/custom-popover';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { VATTableRow } from '../vat-table-row';
import { VATSummaryCard } from '../vat-summary-card';
import { VATTableToolbar } from '../vat-table-toolbar';
import { exportVATToJSON, exportVATToExcel } from '../vat-excel-export';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'invoiceNumber', label: 'Invoice #', width: 120 },
  { id: 'date', label: 'Date', width: 110 },
  { id: 'country', label: 'Country', width: 140 },
  { id: 'currency', label: 'Currency', width: 100 },
  { id: 'amount', label: 'Amount', width: 120, align: 'right' },
  { id: 'vatRate', label: 'VAT Rate', width: 100, align: 'center' },
  { id: 'vatAmount', label: 'VAT Amount', width: 130, align: 'right' },
  { id: 'total', label: 'Total', width: 130, align: 'right' },
  { id: 'type', label: 'Type', width: 120 },
];

// ----------------------------------------------------------------------

export function VATListView() {
  const table = useTable({ defaultRowsPerPage: 25 });
  const theme = useTheme();
  // Get last quarter by default
  const lastQuarter = getLastQuarter();

  const [filters, setFilters] = useState({
    year: lastQuarter.year,
    quarter: lastQuarter.quarter,
    type: 'all',
    currency: 'All',
    searchQuery: '',
  });

  const [vatRecords, setVATRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popover, setPopover] = useState({ open: false, anchorEl: null });
  const [vatData, setVATData] = useState(null);

  useEffect(() => {
    const fetchVATData = async () => {
      setLoading(true);
      console.log('🔍 Fetching VAT data for:', { year: filters.year, quarter: filters.quarter });

      try {
        const data = await getQuarterlyVATData(filters.year, filters.quarter);

        console.log('✅ VAT data received:', {
          totalRecords: data?.records?.all?.length || 0,
          arCount: data?.records?.ar?.length || 0,
          apCount: data?.records?.ap?.length || 0,
          summary: data?.summary,
        });

        setVATData(data);
        setVATRecords(data?.records?.all || []);
      } catch (error) {
        console.error('❌ Failed to fetch VAT data:', error);
        console.error('Error details:', error.message, error.stack);
        setVATData(null);
        setVATRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVATData();
  }, [filters.year, filters.quarter]);

  // Filter records
  const filteredRecords = vatRecords.filter((record) => {
    // Filter by type
    if (filters.type !== 'all' && record.type !== filters.type) return false;

    // Filter by currency
    if (filters.currency !== 'All' && record.currency !== filters.currency) return false;

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const invoiceNum = (record.invoice_number || record.invoiceNumber || '').toLowerCase();
      const customer = (record.customer_name || record.invoiceTo?.name || '').toLowerCase();
      if (!invoiceNum.includes(query) && !customer.includes(query)) return false;
    }

    return true;
  });

  // Calculate totals
  const arRecords = filteredRecords.filter((r) => r.type === 'AR');
  const apRecords = filteredRecords.filter((r) => r.type === 'AP');

  const arTotals = aggregateVATTotals(arRecords);
  const apTotals = aggregateVATTotals(apRecords);

  const zatcaPayable = calculateZATCAPayable(arTotals.totalVAT, apTotals.totalVAT);

  // Pagination
  const dataInPage = filteredRecords.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  const notFound = !filteredRecords.length && !loading;

  const handleFiltersChange = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      table.onResetPage();
    },
    [table]
  );

  const handleExport = useCallback(
    (format) => {
      if (!vatData) {
        console.error('No VAT data available for export');
        return;
      }

      try {
        if (format === 'pdf-en' || format === 'pdf-ar') {
          const pdfLocale = format === 'pdf-ar' ? 'ar' : 'en';
        } else if (format === 'excel') {
          exportVATToExcel(vatData, lastQuarter);
        } else if (format === 'json') {
          exportVATToJSON(vatData, lastQuarter);
        }
      } catch (error) {
        console.error('Export failed:', error);
      } finally {
        setPopover({ open: false, anchorEl: null });
      }
    },
    [vatData, lastQuarter]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="VAT Management"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Invoice', href: paths.dashboard.invoice.root },
          { name: 'VAT' },
        ]}
        action={
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<Iconify icon="eva:download-outline" />}
            onClick={(e) => setPopover({ open: true, anchorEl: e.currentTarget })}
          >
            Export Report
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {/* ZATCA Summary Card */}
      <Box sx={{ mb: { xs: 3, md: 5 } }}>
        <VATSummaryCard
          quarterInfo={lastQuarter}
          arVAT={arTotals.totalVAT}
          apVAT={apTotals.totalVAT}
          zatcaPayable={zatcaPayable}
        />
      </Box>

      {/* Analytics Cards */}
      <Card sx={{ mb: { xs: 3, md: 5 } }}>
        <Scrollbar sx={{ minHeight: 108 }}>
          <Stack
            divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
            sx={{ py: 2, flexDirection: 'row' }}
          >
            <VATAnalyticCard
              title="Total VAT Collected (AR)"
              total={arRecords.length}
              amount={arTotals.totalVAT}
              icon="solar:sale-bold-duotone"
              color={theme.vars.palette.info.main}
            />

            <VATAnalyticCard
              title="Total VAT Paid (AP)"
              total={apRecords.length}
              amount={apTotals.totalVAT}
              icon="solar:bill-list-bold-duotone"
              color={theme.vars.palette.warning.main}
            />

            <VATAnalyticCard
              title="VAT Applicable"
              total={arTotals.vatApplicableCount + apTotals.vatApplicableCount}
              amount={arTotals.vatApplicableAmount + apTotals.vatApplicableAmount}
              icon="solar:check-circle-bold-duotone"
              color={theme.vars.palette.success.main}
            />

            <VATAnalyticCard
              title="Non-VAT"
              total={arTotals.nonVATCount + apTotals.nonVATCount}
              amount={arTotals.nonVATAmount + apTotals.nonVATAmount}
              icon="solar:close-circle-bold-duotone"
              color={theme.vars.palette.text.secondary}
            />
          </Stack>
        </Scrollbar>
      </Card>

      {/* VAT Records Table */}
      <Card>
        <VATTableToolbar filters={filters} onFiltersChange={handleFiltersChange} />

        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1200 }}>
              <TableHeadCustom headCells={TABLE_HEAD} />

              <TableBody>
                {dataInPage.map((row) => (
                  <VATTableRow key={row.invoice_id || row.payment_id} row={row} />
                ))}

                <TableNoData notFound={notFound} />
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={filteredRecords.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>

      {/* Export Popover */}
      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={() => setPopover({ open: false, anchorEl: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuList>
          <MenuItem onClick={() => handleExport('pdf-en')}>
            <Iconify icon="vscode-icons:file-type-pdf2" sx={{ mr: 1 }} />
            PDF - English
          </MenuItem>
          <MenuItem onClick={() => handleExport('pdf-ar')}>
            <Iconify icon="vscode-icons:file-type-pdf2" sx={{ mr: 1 }} />
            PDF - Arabic (PDF - عربي)
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => handleExport('excel')}>
            <Iconify icon="vscode-icons:file-type-excel" sx={{ mr: 1 }} />
            Excel / CSV
          </MenuItem>
          <MenuItem onClick={() => handleExport('json')}>
            <Iconify icon="vscode-icons:file-type-json" sx={{ mr: 1 }} />
            JSON
          </MenuItem>
        </MenuList>
      </CustomPopover>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function VATAnalyticCard({ title, total, amount, icon, color }) {
  return (
    <Box sx={{ flexGrow: 1, textAlign: 'center', px: 3 }}>
      <Stack spacing={1} alignItems="center">
        <Iconify icon={icon} width={32} sx={{ color }} />
        <Typography variant="h4">{total}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {title}
        </Typography>
        <Typography variant="subtitle2" sx={{ color }}>
          SAR {amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Typography>
      </Stack>
    </Box>
  );
}
