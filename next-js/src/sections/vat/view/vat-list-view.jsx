'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';

import { getQuarterlyVATData, getMonthlyVATData } from 'src/utils/vat-api-helper';
import { postQuarterlyVAT, getVATPostingStatus, saveVATReturn } from 'src/utils/apiHelper';
import {
  getCurrentQuarter,
  getCurrentMonth,
  aggregateVATTotals,
  calculateZATCAPayable,
  getQuarterDates,
} from 'src/utils/vat-calculator';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomPopover } from 'src/components/custom-popover';
import { ConfirmDialog } from 'src/components/custom-dialog';
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
import { downloadVATReturnExcel, prepareVATReturnForStorage } from '../vat-return-export';

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
  { id: 'type', label: 'Type', width: 100 },
  { id: 'vatPosted', label: 'ZATCA Status', width: 120 },
];

// Columns the user is not allowed to hide (the record must stay identifiable).
const MANDATORY_COLUMNS = ['invoiceNumber'];
// localStorage key that remembers the user's column selection.
const COLUMN_STORAGE_KEY = 'vatVisibleColumns';
const ALL_COLUMN_IDS = TABLE_HEAD.map((c) => c.id);

// ----------------------------------------------------------------------

export function VATListView() {
  const table = useTable({ defaultRowsPerPage: 25 });
  const theme = useTheme();
  // Get current quarter and month by default
  const currentQuarter = getCurrentQuarter();
  const currentMonth = getCurrentMonth();

  const [filters, setFilters] = useState({
    year: currentQuarter.year,
    quarter: currentQuarter.quarter,
    month: currentMonth.month,
    periodType: 'quarterly', // 'quarterly' or 'monthly'
    type: 'all',
    currency: 'All',
    searchQuery: '',
  });

  const [vatRecords, setVATRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [popover, setPopover] = useState({ open: false, anchorEl: null });
  const [vatData, setVATData] = useState(null);

  // Column visibility (persisted per browser). Defaults to all columns; the
  // saved selection is loaded on mount to avoid an SSR hydration mismatch.
  const [visibleColumns, setVisibleColumns] = useState(ALL_COLUMN_IDS);
  const [columnsPopover, setColumnsPopover] = useState({ open: false, anchorEl: null });
  const columnsHydrated = useRef(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(COLUMN_STORAGE_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) {
        // Keep only known columns, and force mandatory ones to stay on.
        const next = ALL_COLUMN_IDS.filter(
          (id) => saved.includes(id) || MANDATORY_COLUMNS.includes(id)
        );
        setVisibleColumns(next);
      }
    } catch {
      /* ignore malformed storage */
    }
    columnsHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!columnsHydrated.current) return;
    try {
      window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns));
    } catch {
      /* ignore quota/availability errors */
    }
  }, [visibleColumns]);

  const handleToggleColumn = useCallback((id) => {
    if (MANDATORY_COLUMNS.includes(id)) return; // can't hide mandatory columns
    setVisibleColumns((prev) =>
      prev.includes(id)
        ? prev.filter((c) => c !== id)
        : ALL_COLUMN_IDS.filter((c) => prev.includes(c) || c === id)
    );
  }, []);

  const handleResetColumns = useCallback(() => setVisibleColumns(ALL_COLUMN_IDS), []);

  // Header cells for the currently-selected columns (preserves canonical order).
  const visibleHead = TABLE_HEAD.filter((c) => visibleColumns.includes(c.id));

  // VAT Posting state
  const [postingStatus, setPostingStatus] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const [postResult, setPostResult] = useState(null);

  // Fetch VAT posting status for quarterly view
  useEffect(() => {
    const fetchPostingStatus = async () => {
      if (filters.periodType === 'quarterly') {
        try {
          const status = await getVATPostingStatus(filters.year, filters.quarter);
          setPostingStatus(status);
        } catch (error) {
          console.error('Failed to fetch posting status:', error);
          setPostingStatus(null);
        }
      } else {
        setPostingStatus(null);
      }
    };
    fetchPostingStatus();
  }, [filters.year, filters.quarter, filters.periodType]);

  useEffect(() => {
    const fetchVATData = async () => {
      setLoading(true);
      setFetchError(null);
      setPostResult(null); // Clear any previous post result

      try {
        let data;

        if (filters.periodType === 'monthly') {
          console.log('🔍 Fetching VAT data for:', { year: filters.year, month: filters.month });
          data = await getMonthlyVATData(filters.year, filters.month);
        } else {
          console.log('🔍 Fetching VAT data for:', {
            year: filters.year,
            quarter: filters.quarter,
          });
          data = await getQuarterlyVATData(filters.year, filters.quarter);
        }

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
        setFetchError(error?.message || 'Failed to load VAT records. Please try again.');
        setVATData(null);
        setVATRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVATData();
  }, [filters.year, filters.quarter, filters.month, filters.periodType]);

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

      const selectedQuarterInfo = {
        ...getQuarterDates(filters.year, filters.quarter),
        year: filters.year,
        quarter: filters.quarter,
        label: `Q${filters.quarter}-${filters.year}`,
      };

      try {
        if (format === 'pdf-en' || format === 'pdf-ar') {
          const pdfLocale = format === 'pdf-ar' ? 'ar' : 'en';
        } else if (format === 'excel') {
          exportVATToExcel(vatData, selectedQuarterInfo);
        } else if (format === 'json') {
          exportVATToJSON(vatData, selectedQuarterInfo);
        }
      } catch (error) {
        console.error('Export failed:', error);
      } finally {
        setPopover({ open: false, anchorEl: null });
      }
    },
    [vatData, filters.year, filters.quarter]
  );

  // Handle Post VAT button click
  const handlePostVATClick = useCallback(() => {
    setConfirmDialog({ open: true });
  }, []);

  // Handle Post VAT confirmation
  const handlePostVATConfirm = useCallback(async () => {
    setConfirmDialog({ open: false });
    setIsPosting(true);
    setPostResult(null);

    try {
      // Step 1: Post VAT transactions to database
      const result = await postQuarterlyVAT(filters.year, filters.quarter);

      if (result.success && vatData) {
        // Step 2: Get quarter dates for the period
        const quarterDates = getQuarterDates(filters.year, filters.quarter);
        const periodInfo = {
          year: filters.year,
          quarter: filters.quarter,
          startDate: quarterDates.startDate,
          endDate: quarterDates.endDate,
          label: `Q${filters.quarter}-${filters.year}`,
        };

        // Step 3: Generate and download VAT Return Excel (3 sheets)
        try {
          const { fileName, summary } = downloadVATReturnExcel(vatData, periodInfo);
          console.log(`✅ Downloaded VAT Return Excel: ${fileName}`);

          // Step 4: Save VAT Return summary to database
          const vatReturnData = prepareVATReturnForStorage(vatData, periodInfo);
          await saveVATReturn(vatReturnData);
          console.log('✅ Saved VAT Return to database');
        } catch (exportError) {
          console.error('Warning: Failed to export/save VAT Return:', exportError);
          // Don't fail the whole operation if export fails
        }
      }

      setPostResult({
        success: result.success,
        message: result.message,
        summary: result.summary,
      });

      // Refresh posting status
      const status = await getVATPostingStatus(filters.year, filters.quarter);
      setPostingStatus(status);
    } catch (error) {
      setPostResult({
        success: false,
        message: error.message || 'Failed to post VAT',
      });
    } finally {
      setIsPosting(false);
    }
  }, [filters.year, filters.quarter, vatData]);

  // Get period label for display
  const getPeriodLabel = useCallback(() => {
    if (filters.periodType === 'monthly') {
      const monthNames = [
        '',
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      return `${monthNames[filters.month]} ${filters.year}`;
    }
    return `Q${filters.quarter} ${filters.year}`;
  }, [filters.periodType, filters.month, filters.quarter, filters.year]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="VAT Management"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'VAT', href: paths.dashboard.vat.root },
          { name: 'Summary' },
        ]}
        action={
          <Stack direction="row" spacing={1.5}>
            {/* Post VAT Button - Only show for quarterly view */}
            {filters.periodType === 'quarterly' && (
              <>
                {postingStatus?.isPosted ? (
                  <Chip
                    icon={<Iconify icon="eva:checkmark-circle-2-fill" />}
                    label={`Posted on ${new Date(postingStatus.postedAt).toLocaleDateString()}`}
                    color="success"
                    variant="soft"
                  />
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={
                      isPosting ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Iconify icon="eva:upload-outline" />
                      )
                    }
                    onClick={handlePostVATClick}
                    disabled={isPosting || loading || filteredRecords.length === 0}
                  >
                    {isPosting ? 'Posting...' : 'Post VAT'}
                  </Button>
                )}
              </>
            )}
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<Iconify icon="solar:tuning-2-linear" />}
              onClick={(e) => setColumnsPopover({ open: true, anchorEl: e.currentTarget })}
            >
              Columns
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<Iconify icon="eva:download-outline" />}
              onClick={(e) => setPopover({ open: true, anchorEl: e.currentTarget })}
            >
              Export Report
            </Button>
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {/* Fetch Error Alert */}
      {fetchError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setFetchError(null);
                setLoading(true);
                // Re-trigger the fetch effect by toggling a dummy value — simplest re-fetch
                setFilters((prev) => ({ ...prev }));
              }}
            >
              Retry
            </Button>
          }
        >
          {fetchError}
        </Alert>
      )}

      {/* Post Result Alert */}
      {postResult && (
        <Alert
          severity={postResult.success ? 'success' : 'error'}
          sx={{ mb: 3 }}
          onClose={() => setPostResult(null)}
        >
          {postResult.message}
          {postResult.success && postResult.summary && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              AR Records: {postResult.summary.arCount} | AP Records: {postResult.summary.apCount} |
              Net VAT: SAR {postResult.summary.netVAT?.toLocaleString()}
            </Typography>
          )}
        </Alert>
      )}

      {/* ZATCA Summary Card */}
      <Box sx={{ mb: { xs: 3, md: 5 } }}>
        <VATSummaryCard
          quarterInfo={
            filters.periodType === 'monthly'
              ? { label: getPeriodLabel() }
              : {
                  ...getQuarterDates(filters.year, filters.quarter),
                  year: filters.year,
                  quarter: filters.quarter,
                  label: `Q${filters.quarter}-${filters.year}`,
                }
          }
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
              <TableHeadCustom headCells={visibleHead} />

              <TableBody>
                {dataInPage.map((row) => (
                  <VATTableRow
                    key={row.invoice_id || row.payment_id}
                    row={row}
                    visibleColumns={visibleColumns}
                  />
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

      {/* Column Chooser Popover */}
      <CustomPopover
        open={columnsPopover.open}
        anchorEl={columnsPopover.anchorEl}
        onClose={() => setColumnsPopover({ open: false, anchorEl: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Stack sx={{ p: 1.5, minWidth: 200 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 1, pb: 0.5 }}
          >
            <Typography variant="subtitle2">Show columns</Typography>
            <Button size="small" variant="text" onClick={handleResetColumns}>
              Reset
            </Button>
          </Stack>
          <Divider sx={{ mb: 0.5 }} />
          {TABLE_HEAD.map((col) => {
            const mandatory = MANDATORY_COLUMNS.includes(col.id);
            return (
              <FormControlLabel
                key={col.id}
                sx={{ m: 0, px: 1, py: 0.25 }}
                control={
                  <Checkbox
                    size="small"
                    checked={visibleColumns.includes(col.id)}
                    disabled={mandatory}
                    onChange={() => handleToggleColumn(col.id)}
                  />
                }
                label={<Typography variant="body2">{col.label}</Typography>}
              />
            );
          })}
        </Stack>
      </CustomPopover>

      {/* Post VAT Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false })}
        title="Post Quarterly VAT"
        content={
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Are you sure you want to post VAT for{' '}
              <strong>
                Q{filters.quarter} {filters.year}
              </strong>
              ?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This will create permanent VAT transaction records from the current AP/AR data for
              ZATCA filing. This action cannot be undone.
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Output VAT (AR):</strong> SAR{' '}
                {arTotals.totalVAT?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>
              <Typography variant="body2">
                <strong>Input VAT (AP):</strong> SAR{' '}
                {apTotals.totalVAT?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 'bold',
                  color: zatcaPayable.isPayable ? 'error.main' : 'success.main',
                }}
              >
                <strong>Net VAT {zatcaPayable.status}:</strong> SAR{' '}
                {Math.abs(zatcaPayable.netAmount)?.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
              </Typography>
            </Stack>
          </Box>
        }
        action={
          <Button variant="contained" color="primary" onClick={handlePostVATConfirm}>
            Confirm Post VAT
          </Button>
        }
      />
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
