'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';
import { getMonthlyVATData, getQuarterlyVATData } from 'src/utils/vat-api-helper';
import { getCurrentQuarter, getCurrentMonth, aggregateVATTotals } from 'src/utils/vat-calculator';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { VATTableToolbar } from '../vat-table-toolbar';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'reference', label: 'Reference #', width: 150 },
  { id: 'date', label: 'Date', width: 110 },
  { id: 'vendor', label: 'Vendor / Employee', width: 200 },
  { id: 'currency', label: 'Currency', width: 100 },
  { id: 'amount', label: 'Base Amount', width: 140, align: 'right' },
  { id: 'vatRate', label: 'VAT Rate', width: 100, align: 'center' },
  { id: 'vatAmount', label: 'VAT Amount', width: 130, align: 'right' },
  { id: 'total', label: 'Total', width: 130, align: 'right' },
  { id: 'zatcaStatus', label: 'ZATCA Status', width: 120 },
  { id: 'action', label: 'View', width: 80, align: 'center' },
];

// ----------------------------------------------------------------------

export function VATAPView() {
  const table = useTable({ defaultRowsPerPage: 25 });
  const theme = useTheme();
  const currentQuarter = getCurrentQuarter();
  const currentMonth = getCurrentMonth();

  const [filters, setFilters] = useState({
    year: currentQuarter.year,
    quarter: currentQuarter.quarter,
    month: currentMonth.month,
    periodType: 'quarterly',
    type: 'AP',
    currency: 'All',
    searchQuery: '',
  });

  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const data =
          filters.periodType === 'monthly'
            ? await getMonthlyVATData(filters.year, filters.month)
            : await getQuarterlyVATData(filters.year, filters.quarter);
        setAllRecords(data?.records?.ap || []);
      } catch (err) {
        setFetchError(err?.message || 'Failed to load AP VAT records.');
        setAllRecords([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filters.year, filters.quarter, filters.month, filters.periodType]);

  const filteredRecords = allRecords.filter((record) => {
    if (filters.currency !== 'All' && record.currency !== filters.currency) return false;
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const num = (record.invoice_number || '').toLowerCase();
      const vendor = (record.customer_name || '').toLowerCase();
      if (!num.includes(q) && !vendor.includes(q)) return false;
    }
    return true;
  });

  const totals = aggregateVATTotals(filteredRecords);
  const dataInPage = filteredRecords.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  const getPeriodLabel = () => {
    if (filters.periodType === 'monthly') {
      const names = [
        '',
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return `${names[filters.month]} ${filters.year}`;
    }
    return `Q${filters.quarter} ${filters.year}`;
  };

  const handleFiltersChange = useCallback(
    (newFilters) => {
      setFilters({ ...newFilters, type: 'AP' });
      table.onResetPage();
    },
    [table]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="VAT – Accounts Payable"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'VAT', href: paths.dashboard.vat.root },
          { name: 'AP' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {/* Period label */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
        <Iconify icon="solar:calendar-bold-duotone" width={20} sx={{ color: 'text.secondary' }} />
        <Typography variant="body2" color="text.secondary">
          Period:
        </Typography>
        <Chip label={getPeriodLabel()} size="small" color="warning" variant="soft" />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
          Input VAT (paid to vendors / employee expenses)
        </Typography>
      </Stack>

      {fetchError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => setFilters((p) => ({ ...p }))}>
              Retry
            </Button>
          }
        >
          {fetchError}
        </Alert>
      )}

      {/* Summary strip */}
      <Card sx={{ mb: { xs: 3, md: 4 } }}>
        <Scrollbar sx={{ minHeight: 100 }}>
          <Stack
            direction="row"
            divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
            sx={{ py: 2 }}
          >
            <APMetricBox
              label="Total AP Bills / Expenses"
              value={totals.totalInvoices}
              icon="solar:bill-list-bold-duotone"
              color={theme.vars.palette.warning.main}
            />
            <APMetricBox
              label="Total Base Amount"
              value={`SAR ${(totals.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              icon="solar:wallet-bold-duotone"
              color={theme.vars.palette.primary.main}
            />
            <APMetricBox
              label="Input VAT Paid"
              value={`SAR ${(totals.totalVAT || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              icon="solar:dollar-minimalistic-bold-duotone"
              color={theme.vars.palette.error.main}
            />
            <APMetricBox
              label="VAT-Applicable"
              value={totals.vatApplicableCount}
              icon="solar:check-circle-bold-duotone"
              color={theme.vars.palette.success.main}
            />
          </Stack>
        </Scrollbar>
      </Card>

      {/* Table */}
      <Card>
        <VATTableToolbar
          filters={{ ...filters, type: 'all' }}
          onFiltersChange={handleFiltersChange}
        />

        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1100 }}>
              <TableHeadCustom headCells={TABLE_HEAD} />
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={TABLE_HEAD.length} align="center" sx={{ py: 8 }}>
                      <Typography variant="body2" color="text.secondary">
                        Loading AP records…
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {dataInPage.map((row) => (
                      <APTableRow key={row.payment_id || row.invoice_number} row={row} />
                    ))}
                    <TableNoData notFound={!filteredRecords.length && !loading} />
                  </>
                )}
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
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function APTableRow({ row }) {
  const {
    invoice_number,
    date,
    customer_name,
    currency,
    baseAmount,
    vatRatePercent,
    vatAmount,
    totalWithVAT,
    isVATApplicable,
    vatTaxPeriod,
  } = row;

  // Expense-linked bills carry the EXP- prefix; link back to the Expense detail page.
  const isExpense = invoice_number?.startsWith('EXP-');
  const expenseRefId = isExpense ? invoice_number.replace('EXP-', '') : null;
  const expenseHref = expenseRefId ? `/dashboard/expense/${expenseRefId}` : null;

  return (
    <TableRow hover sx={{ '&:hover': { backgroundColor: 'rgba(255, 140, 0, 0.06)' } }}>
      {/* Reference */}
      <TableCell>
        {expenseHref ? (
          <Link
            component={RouterLink}
            href={expenseHref}
            color="inherit"
            underline="always"
            title={invoice_number}
          >
            {invoice_number || '-'}
          </Link>
        ) : (
          <Typography variant="body2">{invoice_number || '-'}</Typography>
        )}
      </TableCell>

      {/* Date */}
      <TableCell>{date ? fDate(date) : '-'}</TableCell>

      {/* Vendor / Employee */}
      <TableCell>
        <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
          {customer_name || '-'}
        </Typography>
      </TableCell>

      {/* Currency */}
      <TableCell>
        <Chip label={currency || 'SAR'} size="small" variant="soft" />
      </TableCell>

      {/* Base Amount */}
      <TableCell align="right">
        {fCurrency(baseAmount || 0, { currency: currency || 'SAR' })}
      </TableCell>

      {/* VAT Rate */}
      <TableCell align="center">
        {isVATApplicable ? (
          <Label color="warning">{vatRatePercent?.toFixed(0)}%</Label>
        ) : (
          <Label color="default">0%</Label>
        )}
      </TableCell>

      {/* VAT Amount */}
      <TableCell align="right">
        <Box sx={{ fontWeight: 'bold', color: isVATApplicable ? 'error.main' : 'text.secondary' }}>
          {fCurrency(vatAmount || 0, { currency: currency || 'SAR' })}
        </Box>
      </TableCell>

      {/* Total */}
      <TableCell align="right">
        {fCurrency(totalWithVAT || baseAmount || 0, { currency: currency || 'SAR' })}
      </TableCell>

      {/* ZATCA Status */}
      <TableCell>
        {vatTaxPeriod ? (
          <Label variant="soft" color="success">
            Posted
          </Label>
        ) : (
          <Label variant="soft" color="default">
            Pending
          </Label>
        )}
      </TableCell>

      {/* View Expense */}
      <TableCell align="center">
        {expenseHref ? (
          <Button
            component={RouterLink}
            href={expenseHref}
            size="small"
            variant="soft"
            color="warning"
            startIcon={<Iconify icon="solar:eye-bold" width={14} />}
          >
            Expense
          </Button>
        ) : (
          <Typography variant="caption" color="text.disabled">
            —
          </Typography>
        )}
      </TableCell>
    </TableRow>
  );
}

// ----------------------------------------------------------------------

function APMetricBox({ label, value, icon, color }) {
  return (
    <Box sx={{ flexGrow: 1, textAlign: 'center', px: 3 }}>
      <Stack spacing={0.5} alignItems="center">
        <Iconify icon={icon} width={28} sx={{ color }} />
        <Typography variant="h5">{value}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
      </Stack>
    </Box>
  );
}
