'use client';

import PropTypes from 'prop-types';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { fCurrency } from 'src/utils/format-number';
import {
  getEmployees,
  fetchPayrollRun,
  fetchPayrollYtd,
  approvePayrollRun,
  postPayrollToBank,
  sendPayrollPayslips,
  updatePayrollLineItemDeductions,
} from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// Payslips are only worth sending once the run is committed — emailing a
// figure that is still pending approval invites a correction email after it.
const SENDABLE_STATUSES = ['approved', 'processed', 'paid'];

const payslipDeliveryIcon = (item) => {
  if (item.payslipEmailStatus === 'sent') return 'mdi:email-check-outline';
  if (item.payslipEmailStatus === 'failed') return 'mdi:email-alert-outline';
  if (item.payslipEmailStatus === 'skipped') return 'mdi:email-off-outline';
  return 'mdi:email-outline';
};

const payslipDeliveryColor = (item) => {
  if (item.payslipEmailStatus === 'sent') return 'success';
  if (item.payslipEmailStatus === 'failed') return 'error';
  if (item.payslipEmailStatus === 'skipped') return 'warning';
  return 'inherit';
};

const payslipDeliveryHint = (item) => {
  if (item.payslipEmailStatus === 'sent') {
    const when = item.payslipEmailedAt ? new Date(item.payslipEmailedAt).toLocaleString() : '';
    return `Sent to ${item.employeeEmail || 'employee'}${when ? ` on ${when}` : ''}`;
  }
  if (item.payslipEmailStatus === 'failed') {
    return `Last attempt failed: ${item.payslipEmailError || 'unknown error'}`;
  }
  if (item.payslipEmailStatus === 'skipped' || !item.employeeEmail) {
    return 'No email address on file for this employee';
  }
  return `Email this payslip to ${item.employeeEmail}`;
};

export default function PayrollDetailPage({ params }) {
  const router = useRouter();
  const { id } = params;
  const payrollId = Number(id);
  const [payroll, setPayroll] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [ytdByEmployee, setYtdByEmployee] = useState({});
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [approving, setApproving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Adjust-deduction dialog state
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustRemarks, setAdjustRemarks] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const isPayrollFinal = SENDABLE_STATUSES.includes(payroll?.status);

  const formatStatus = (status) => {
    if (!status) return '-';
    if (status === 'pending_approval') return 'Pending for Approval';
    return status
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchPayrollRun(payrollId);
        setPayroll(data.payrollRun);
        setLineItems(data.lineItems || []);
      } catch (error) {
        console.error('Failed to load payroll', error);
        setPayroll(null);
      }

      // YTD feeds the payslip's right-hand column. A failure here degrades the
      // payslip to a current-period-only document rather than blocking the page.
      try {
        const entries = await fetchPayrollYtd(payrollId);
        setYtdByEmployee(
          Object.fromEntries(entries.map((entry) => [entry.employeeDbId, entry]))
        );
      } catch (error) {
        console.error('Failed to load year-to-date totals', error);
        setYtdByEmployee({});
      }
    };
    if (Number.isFinite(payrollId)) {
      load();
    }
  }, [payrollId]);

  // Fetch employees to obtain national IDs for export mapping
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const list = await getEmployees();
        setEmployees(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error('Failed to load employees for export mapping', error);
      }
    };
    loadEmployees();
  }, []);

  const handleApprove = useCallback(
    async (status) => {
      if (!payroll) return;
      setApproving(true);
      try {
        const response = await approvePayrollRun({
          id: payrollId,
          approvedBy: 'admin',
          status,
          notes: undefined,
        });
        setPayroll(response.payrollRun);
        toast.success(status === 'approved' ? 'Payroll approved' : 'Payroll rejected');
      } catch (error) {
        console.error('Failed to update payroll status', error);
        toast.error('Failed to update payroll status');
      } finally {
        setApproving(false);
      }
    },
    [payroll, payrollId]
  );

  const handleExportExcel = useCallback(async () => {
    if (!payroll) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx');

      const bankNameToBic = (name = '') => {
        const n = name.toLowerCase();
        if (n.includes('rajhi')) return 'RJHISARI';
        if (n.includes('sabb')) return 'SABBSARI';
        if (n.includes('snb') || n.includes('national commercial') || n.includes('national bank'))
          return 'NCBKSAJE';
        if (n.includes('riyad')) return 'RIBLSARI';
        if (n.includes('fransi') || n.includes('bsf')) return 'BSFRSARI';
        if (n.includes('investment') || n.includes('saib')) return 'SIBCSARI';
        if (n.includes('alinma')) return 'INMASARI';
        if (n.includes('bilad')) return 'ALBISARI';
        if (n.includes('jazira')) return 'BJAZSAJE';
        if (n.includes('gulf') || n.includes('gib')) return 'GULFSARI';
        return '';
      };

      // SAIB format: exact columns and data only
      const header = [
        'Net Salary',
        'Beneficiary Account',
        'Beneficiary Name',
        'Beneficiary Address 1',
        'Beneficiary Address 2',
        'Beneficiary Address 3',
        'Beneficiary Bank',
        'Payment Description (Optional)',
        'Basic Salary',
        'Housing Allowance',
        'Other Earnings',
        'Deductions',
        'Beneficiary ID',
      ];

      const rows = lineItems.map((item) => {
        const emp = employees.find((e) => e.id === item.employeeDbId);
        const beneficiaryId =
          emp?.iqamaNumber || emp?.nationalId || item.iqamaNumber || item.nationalId || '';
        const beneficiaryAddress = emp?.currentAddress || '';
        const beneficiaryBank = bankNameToBic(emp?.bankName || item.bankName || '');
        const otherEarnings = (item.transportAllowance || 0) + (item.otherAllowances || 0);
        return [
          Number(item.netSalary || 0).toFixed(2),
          item.iban || item.bankAccountNumber || '',
          item.employeeName || '',
          beneficiaryAddress,
          beneficiaryAddress,
          beneficiaryAddress,
          beneficiaryBank,
          '', // Payment description optional
          Number(item.basicSalary || 0).toFixed(2),
          Number(item.housingAllowance || 0).toFixed(2),
          Number(otherEarnings).toFixed(2),
          Number(item.deductions || 0).toFixed(2),
          beneficiaryId,
        ];
      });

      const sheet = [header, ...rows];

      const worksheet = XLSX.utils.aoa_to_sheet(sheet);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll');

      const monthLabel = new Date(payroll.periodYear, payroll.periodMonth - 1).toLocaleString(
        'default',
        {
          month: 'short',
        }
      );
      const fileName = `WPS ${monthLabel} Batch ${Date.now()}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success('Excel file generated');
    } catch (error) {
      console.error('Failed to export payroll', error);
      toast.error('Failed to generate Excel file');
    } finally {
      setExporting(false);
    }
  }, [employees, lineItems, payroll]);

  const handlePostToBank = useCallback(async () => {
    if (!payroll) return;
    setProcessing(true);
    try {
      const response = await postPayrollToBank(payrollId);
      setPayroll(response.payrollRun);
      toast.success('Payroll marked as processed (posted to bank)');
    } catch (error) {
      console.error('Failed to post payroll to bank', error);
      toast.error('Failed to post payroll to bank');
    } finally {
      setProcessing(false);
    }
  }, [payroll, payrollId]);

  // ── Adjust deductions ──────────────────────────────────────────────────
  const handleOpenAdjust = useCallback((item) => {
    setAdjustTarget(item);
    setAdjustAmount(String(item.manualDeductionAmount ?? item.deductions ?? ''));
    setAdjustRemarks(item.manualDeductionRemarks || item.remarks || '');
  }, []);

  const handleCloseAdjust = useCallback(() => {
    setAdjustTarget(null);
    setAdjustAmount('');
    setAdjustRemarks('');
  }, []);

  const handleSaveAdjust = useCallback(async () => {
    if (!adjustTarget) return;
    const amount = Number(adjustAmount) || 0;
    setAdjusting(true);
    try {
      const response = await updatePayrollLineItemDeductions(adjustTarget.id, {
        manualDeductionAmount: amount,
        manualDeductionRemarks: adjustRemarks || undefined,
      });
      // The API returns the full updated line item including manualDeductionAmount
      // and manualDeductionRemarks now that the DB columns exist.
      const saved = response?.lineItem;
      setLineItems((prev) =>
        prev.map((li) => {
          if (li.id !== adjustTarget.id) return li;
          if (saved) return saved;
          // Fallback: compute locally if API didn't return the item. Statutory
          // and attendance deductions stand alongside the manual one — only the
          // manual component is being edited here.
          const standing = Number(li.gosiDeduction || 0) + Number(li.lopAmount || 0);
          return {
            ...li,
            manualDeductionAmount: amount,
            manualDeductionRemarks: adjustRemarks || null,
            deductions: standing + amount,
            netSalary: (li.grossSalary || 0) - standing - amount,
          };
        })
      );
      toast.success('Deduction updated successfully');
      handleCloseAdjust();
    } catch (error) {
      console.error('Failed to update deduction', error);
      toast.error('Failed to update deduction');
    } finally {
      setAdjusting(false);
    }
  }, [adjustTarget, adjustAmount, adjustRemarks, handleCloseAdjust]);

  // ── Payslips ───────────────────────────────────────────────────────────
  // One renderer serves both the download and the email, so the PDF an
  // employee receives is byte-for-byte the one HR can pull from this page.
  const renderPayslipBlob = useCallback(
    async (item) => {
      const [{ pdf }, { PayslipDocument }, { createElement }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('src/sections/hr/payroll/payslip-document'),
        import('react'),
      ]);
      return pdf(
        createElement(PayslipDocument, {
          lineItem: item,
          payroll,
          ytd: ytdByEmployee[item.employeeDbId] || null,
        })
      ).toBlob();
    },
    [payroll, ytdByEmployee]
  );

  const payslipFileName = useCallback(
    (item) => {
      const monthName = new Date(payroll.periodYear, payroll.periodMonth - 1).toLocaleString(
        'default',
        { month: 'short' }
      );
      return `Payslip_${(item.employeeName || 'employee').replace(/\s+/g, '_')}_${monthName}_${payroll.periodYear}.pdf`;
    },
    [payroll]
  );

  const handleDownloadPayslip = useCallback(
    async (item) => {
      if (!payroll) return;
      try {
        const blob = await renderPayslipBlob(item);
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = payslipFileName(item);
        link.click();
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error('Failed to generate payslip', error);
        toast.error('Failed to generate payslip PDF');
      }
    },
    [payroll, payslipFileName, renderPayslipBlob]
  );

  const handleDownloadAllPayslips = useCallback(async () => {
    if (!payroll || !lineItems.length) return;
    for (const item of lineItems) {
      await handleDownloadPayslip(item);
    }
  }, [handleDownloadPayslip, lineItems, payroll]);

  // ── Payslip email delivery ─────────────────────────────────────────────
  const toBase64 = async (blob) => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    // Chunked rather than a single spread: btoa is fine with the string, but
    // String.fromCharCode(...bytes) blows the argument limit on a large PDF.
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  };

  const applyDeliveryResults = useCallback((results) => {
    const byLineItem = new Map(results.map((r) => [r.lineItemId, r]));
    setLineItems((prev) =>
      prev.map((li) => {
        const result = byLineItem.get(li.id);
        if (!result) return li;
        return {
          ...li,
          payslipEmailStatus: result.status,
          payslipEmailedAt: result.status === 'sent' ? new Date().toISOString() : null,
          payslipEmailError: result.error || null,
        };
      })
    );
  }, []);

  const sendPayslipsFor = useCallback(
    async (items) => {
      const payslips = [];
      for (const item of items) {
        // Sequential: react-pdf is single-threaded here, and rendering a whole
        // payroll's worth of documents at once starves the UI thread.
        const blob = await renderPayslipBlob(item);
        payslips.push({ lineItemId: item.id, pdfBase64: await toBase64(blob) });
      }

      const summary = await sendPayrollPayslips(payrollId, payslips);
      applyDeliveryResults(summary.results || []);
      return summary;
    },
    [applyDeliveryResults, payrollId, renderPayslipBlob]
  );

  const describeDelivery = ({ sent, failed, skipped }) => {
    const parts = [`${sent} sent`];
    if (failed) parts.push(`${failed} failed`);
    if (skipped) parts.push(`${skipped} without an email address`);
    return parts.join(', ');
  };

  const handleEmailAllPayslips = useCallback(async () => {
    if (!payroll || !lineItems.length) return;
    setSendingAll(true);
    try {
      const summary = await sendPayslipsFor(lineItems);
      const message = describeDelivery(summary);
      if (summary.failed || summary.skipped) {
        toast.warning(`Payslips: ${message}`);
      } else {
        toast.success(`Payslips emailed — ${message}`);
      }
    } catch (error) {
      console.error('Failed to email payslips', error);
      toast.error('Failed to email payslips');
    } finally {
      setSendingAll(false);
    }
  }, [lineItems, payroll, sendPayslipsFor]);

  const handleEmailPayslip = useCallback(
    async (item) => {
      if (!payroll) return;
      setSendingId(item.id);
      try {
        const summary = await sendPayslipsFor([item]);
        const result = summary.results?.[0];
        if (result?.status === 'sent') {
          toast.success(`Payslip emailed to ${result.toEmail}`);
        } else if (result?.status === 'skipped') {
          toast.warning(`${item.employeeName} has no email address on file`);
        } else {
          toast.error(`Failed to email payslip: ${result?.error || 'unknown error'}`);
        }
      } catch (error) {
        console.error('Failed to email payslip', error);
        toast.error('Failed to email payslip');
      } finally {
        setSendingId(null);
      }
    },
    [payroll, sendPayslipsFor]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Payroll Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee', href: paths.dashboard.hr.employee.root },
          { name: 'Finance' },
          { name: 'Payroll', href: paths.dashboard.hr.employee.finance.payroll.root },
          { name: payroll ? `${payroll.periodMonth}/${payroll.periodYear}` : 'Not found' },
        ]}
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<Iconify icon="mdi:export-variant" />}
              onClick={handleExportExcel}
              disabled={!payroll || lineItems.length === 0 || exporting}
            >
              {exporting ? 'Exporting…' : 'Export Excel'}
            </Button>
            {lineItems.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<Iconify icon="mdi:file-document-outline" />}
                onClick={handleDownloadAllPayslips}
              >
                Download All Payslips
              </Button>
            )}
            {lineItems.length > 0 && (
              <Button
                variant="contained"
                color="primary"
                startIcon={
                  sendingAll ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Iconify icon="mdi:email-fast-outline" />
                  )
                }
                onClick={handleEmailAllPayslips}
                disabled={sendingAll || !isPayrollFinal}
              >
                {sendingAll ? 'Sending…' : 'Email Payslips'}
              </Button>
            )}
            {payroll?.status === 'pending_approval' && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Iconify icon="mdi:check" />}
                  onClick={() => handleApprove('approved')}
                  disabled={approving}
                >
                  {approving ? 'Updating…' : 'Approve'}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Iconify icon="mdi:close" />}
                  onClick={() => handleApprove('rejected')}
                  disabled={approving}
                >
                  {approving ? 'Updating…' : 'Reject'}
                </Button>
              </>
            )}
            {payroll?.status === 'approved' && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Iconify icon="mdi:bank-transfer" />}
                onClick={handlePostToBank}
                disabled={processing}
              >
                {processing ? 'Posting…' : 'Post to Bank'}
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Iconify icon="mdi:arrow-left" />}
              onClick={() => router.push(paths.dashboard.hr.employee.finance.payroll.root)}
            >
              Back to List
            </Button>
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {!payroll ? (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Payroll not found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The requested payroll entry does not exist. Please return to the list.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => router.push(paths.dashboard.hr.employee.finance.payroll.root)}
          >
            Go to Payroll List
          </Button>
        </Card>
      ) : (
        <Card sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h4" sx={{ mb: 0.5 }}>
                {new Date(payroll.periodYear, payroll.periodMonth - 1).toLocaleString('default', {
                  month: 'long',
                })}{' '}
                {payroll.periodYear}
              </Typography>
              <Label
                color={
                  payroll.status === 'approved'
                    ? 'success'
                    : payroll.status === 'pending_approval'
                      ? 'warning'
                      : payroll.status === 'rejected'
                        ? 'error'
                        : payroll.status === 'processed'
                          ? 'info'
                          : 'default'
                }
              >
                {formatStatus(payroll.status)}
              </Label>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Generated on{' '}
              {new Date(
                payroll.createdAt || payroll.approvedAt || payroll.generatedAt || Date.now()
              ).toLocaleString()}{' '}
              by {payroll.generatedBy}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: 'repeat(auto-fit, minmax(180px, 1fr))',
                  sm: 'repeat(auto-fit, minmax(200px, 1fr))',
                },
              }}
            >
              {[
                {
                  label: 'Total Net',
                  value: fCurrency(payroll.totalNet ?? 0, {
                    currency: 'SAR',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }),
                },
                {
                  label: 'Total Gross',
                  value: fCurrency(payroll.totalGross ?? 0, {
                    currency: 'SAR',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }),
                },
                { label: 'Total Employees', value: payroll.totalEmployees },
                { label: 'Month', value: payroll.periodMonth },
                { label: 'Year', value: payroll.periodYear },
              ].map((item) => (
                <Paper key={item.label} variant="outlined" sx={{ p: 1.75, borderRadius: 2 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="subtitle1">{item.value}</Typography>
                  </Stack>
                </Paper>
              ))}
            </Box>

            {lineItems.length > 0 && (
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={1} sx={{ mb: 1 }}>
                    <Typography variant="h6">Payroll Breakdown</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Summary and per-employee amounts for this run.
                    </Typography>
                  </Stack>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    {[
                      {
                        label: 'Total Gross',
                        value: fCurrency(
                          lineItems.reduce((sum, li) => sum + (li.grossSalary || 0), 0),
                          { currency: 'SAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        ),
                      },
                      {
                        label: 'Total Deductions',
                        value: fCurrency(
                          lineItems.reduce((sum, li) => sum + (li.deductions || 0), 0),
                          { currency: 'SAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        ),
                      },
                      {
                        label: 'Total Net',
                        value: fCurrency(
                          lineItems.reduce((sum, li) => sum + (li.netSalary || 0), 0),
                          { currency: 'SAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        ),
                      },
                    ].map((item) => (
                      <Grid key={item.label} item xs={12} sm={6} md={4}>
                        <Stack spacing={0.25}>
                          <Typography variant="body2" color="text.secondary">
                            {item.label}
                          </Typography>
                          <Typography variant="subtitle1">{item.value}</Typography>
                        </Stack>
                      </Grid>
                    ))}
                  </Grid>

                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Employee</TableCell>
                          <TableCell>Designation / Dept</TableCell>
                          <TableCell align="right">Gross</TableCell>
                          <TableCell align="right">LOP</TableCell>
                          <TableCell align="right" sx={{ color: 'error.main' }}>
                            Extra Deductions
                          </TableCell>
                          <TableCell>Deduction Reason</TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}>
                            Net Pay
                          </TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lineItems.map((item) => (
                          <TableRow key={item.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="600">
                                {item.employeeName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.employeeId}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{item.designation || '—'}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.department || ''}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {fCurrency(item.grossSalary || 0, {
                                currency: 'SAR',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ color: item.lopDays > 0 ? 'warning.main' : 'text.secondary' }}
                            >
                              {item.lopDays > 0
                                ? `${item.lopDays}d / SAR ${Number(item.lopAmount || 0).toFixed(2)}`
                                : '—'}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color:
                                  (item.manualDeductionAmount ?? item.deductions ?? 0) > 0
                                    ? 'error.main'
                                    : 'text.secondary',
                              }}
                            >
                              {(item.manualDeductionAmount ?? item.deductions ?? 0) > 0
                                ? fCurrency(item.manualDeductionAmount ?? item.deductions, {
                                    currency: 'SAR',
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                : '—'}
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {item.manualDeductionRemarks || item.remarks || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="subtitle2" sx={{ color: 'success.main' }}>
                                {fCurrency(item.netSalary || 0, {
                                  currency: 'SAR',
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Stack direction="row" spacing={0.5} justifyContent="center">
                                {payroll?.status === 'pending_approval' && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    startIcon={<Iconify icon="mdi:pencil-minus-outline" />}
                                    onClick={() => handleOpenAdjust(item)}
                                  >
                                    Adjust
                                  </Button>
                                )}
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Iconify icon="mdi:file-document-outline" />}
                                  onClick={() => handleDownloadPayslip(item)}
                                >
                                  Payslip
                                </Button>
                                <Tooltip title={payslipDeliveryHint(item)}>
                                  <span>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color={payslipDeliveryColor(item)}
                                      startIcon={
                                        sendingId === item.id ? (
                                          <CircularProgress size={14} color="inherit" />
                                        ) : (
                                          <Iconify icon={payslipDeliveryIcon(item)} />
                                        )
                                      }
                                      onClick={() => handleEmailPayslip(item)}
                                      disabled={sendingAll || sendingId === item.id || !isPayrollFinal}
                                    >
                                      {item.payslipEmailStatus === 'sent' ? 'Resend' : 'Email'}
                                    </Button>
                                  </span>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Card>
      )}

      {/* Adjust-deduction dialog */}
      <AdjustDeductionDialog
        open={Boolean(adjustTarget)}
        item={adjustTarget}
        amount={adjustAmount}
        remarks={adjustRemarks}
        saving={adjusting}
        onAmountChange={setAdjustAmount}
        onRemarksChange={setAdjustRemarks}
        onSave={handleSaveAdjust}
        onClose={handleCloseAdjust}
      />
    </DashboardContent>
  );
}

PayrollDetailPage.propTypes = {
  params: PropTypes.shape({ id: PropTypes.string }),
};

// ---------------------------------------------------------------------------
// Adjust-Deductions Dialog (separate to keep render tree clean)
// ---------------------------------------------------------------------------

function AdjustDeductionDialog({
  open,
  item,
  amount,
  remarks,
  saving,
  onAmountChange,
  onRemarksChange,
  onSave,
  onClose,
}) {
  if (!item) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Adjust Deduction — {item.employeeName}</DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            Gross salary: <strong>SAR {Number(item.grossSalary || 0).toFixed(2)}</strong>. Enter an
            extra deduction amount to subtract from the gross. The net pay will be updated
            accordingly.
          </Typography>
          <TextField
            label="Deduction Amount (SAR)"
            type="number"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start">SAR</InputAdornment>,
              inputProps: { min: 0 },
            }}
            fullWidth
          />
          <TextField
            label="Reason"
            placeholder="e.g. Advance repayment, loan deduction…"
            value={remarks}
            onChange={(e) => onRemarksChange(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          {amount > 0 && (
            <Paper
              variant="outlined"
              sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'background.neutral' }}
            >
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Gross
                </Typography>
                <Typography variant="body2">
                  SAR {Number(item.grossSalary || 0).toFixed(2)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="error">
                  Deduction
                </Typography>
                <Typography variant="body2" color="error">
                  − SAR {Number(amount || 0).toFixed(2)}
                </Typography>
              </Stack>
              <Divider sx={{ my: 0.75 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle2" color="success.main">
                  Net Pay
                </Typography>
                <Typography variant="subtitle2" color="success.main">
                  SAR {Math.max(0, Number(item.grossSalary || 0) - Number(amount || 0)).toFixed(2)}
                </Typography>
              </Stack>
            </Paper>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Deduction'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
