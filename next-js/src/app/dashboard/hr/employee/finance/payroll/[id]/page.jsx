'use client';

import PropTypes from 'prop-types';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';

import {
  getEmployees,
  fetchPayrollRun,
  fetchPayrollRuns,
  refreshPayrollRun,
  approvePayrollRun,
  postPayrollToBank,
  sendPayrollPayslips,
  updatePayrollLineItemEarnings,
  updatePayrollLineItemDeductions,
} from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { celebrate } from 'src/components/success-moment';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { manualDeductionRows } from 'src/sections/hr/payroll/payslip-document';
import {
  runFigures,
  periodLabel,
  STATUS_LABEL,
  PayrollCycleCard,
  PayrollBreakdown,
  PayrollReportTable,
  PayrollReviewDrawer,
  PayrollPaymentPanel,
  PayrollAdjustmentsList,
} from 'src/sections/hr/payroll/payroll-run-overview';

import { useAuthContext } from 'src/auth/hooks';

// Payslips are only worth sending once the run is committed — emailing a
// figure that is still pending approval invites a correction email after it.
const SENDABLE_STATUSES = ['approved', 'processed', 'paid'];

// Reasons HR reaches for most often. The field is free text — these only save
// typing and keep the wording on payslips consistent.
const DEDUCTION_REASONS = [
  'Salary advance recovery',
  'Loan repayment',
  'Unpaid leave',
  'Traffic fine',
  'Iqama / visa fees',
  'Dependent insurance premium',
  'Asset loss or damage',
  'Overpayment recovery',
];

const blankDeduction = () => ({ label: '', amount: '' });

// HR may pay a different transport or other allowance in a payroll, with a
// reason; basic and housing always come from the employee record.
const ADJUSTABLE = [
  {
    key: 'transportAllowance',
    standard: 'standardTransportAllowance',
    label: 'Transport Allowance',
  },
  { key: 'otherAllowances', standard: 'standardOtherAllowances', label: 'Other Allowances' },
];

const num = (value) => Math.round((Number(value) || 0) * 100) / 100;

/** The record's figure for an adjustable allowance; lines from before adjustments: what was paid. */
const standardOf = (item, { key, standard }) => num(item[standard] ?? item[key]);

/** What differs between a payroll line and the employee's record today. */
const profileChanges = (item, employee) => {
  if (!employee) return [];
  const fields = [
    ['basicSalary', 'Basic', num(item.basicSalary)],
    ['housingAllowance', 'Housing', num(item.housingAllowance)],
    ['transportAllowance', 'Transport', standardOf(item, ADJUSTABLE[0])],
    ['otherAllowances', 'Other', standardOf(item, ADJUSTABLE[1])],
    ['gosiDeduction', 'GOSI', num(item.gosiDeduction)],
  ];
  return fields
    .filter(([key, , was]) => num(employee[key]) !== was)
    .map(([key, label, was]) => ({ label, was, now: num(employee[key]) }));
};

const sar = (value) =>
  `SAR ${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function PayrollDetailPage({ params }) {
  const router = useRouter();
  const { user } = useAuthContext();
  const { id } = params;
  const payrollId = Number(id);
  const [payroll, setPayroll] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [approving, setApproving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Adjust-deduction dialog state
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustItems, setAdjustItems] = useState([]);
  const [adjusting, setAdjusting] = useState(false);

  // Edit-earnings dialog state
  const [earningsTarget, setEarningsTarget] = useState(null);
  const [earnings, setEarnings] = useState({});
  const [savingEarnings, setSavingEarnings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Payslip button menu (View / Download) and the on-screen viewer
  const [reviewOpen, setReviewOpen] = useState(false);
  const [tab, setTab] = useState('report');
  const [previousRun, setPreviousRun] = useState(null);
  const [payslipView, setPayslipView] = useState(null); // { item, url }
  const [payslipBusyId, setPayslipBusyId] = useState(null);

  const isPayrollFinal = SENDABLE_STATUSES.includes(payroll?.status);

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
    };
    if (Number.isFinite(payrollId)) {
      load();
    }
  }, [payrollId]);

  // The cycle before this one, for the breakdown's comparison.
  useEffect(() => {
    if (!payroll) return;
    const key = (r) => r.periodYear * 12 + r.periodMonth;
    fetchPayrollRuns()
      .then((runs) => {
        const earlier = (runs || [])
          .filter((r) => key(r) < key(payroll) && r.status !== 'rejected')
          .sort((a, b) => key(b) - key(a));
        setPreviousRun(earlier[0] || null);
      })
      .catch(() => setPreviousRun(null));
    // Only the period matters; refetching on every status change is wasted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payroll?.periodYear, payroll?.periodMonth]);

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
    async (status, notes) => {
      if (!payroll) return false;
      setApproving(true);
      try {
        const response = await approvePayrollRun({
          id: payrollId,
          approvedBy: user?.displayName || user?.name || user?.email || 'admin',
          status,
          notes: notes || undefined,
        });
        setPayroll(response.payrollRun);
        if (status === 'approved') {
          celebrate({
            kind: 'signed',
            chip: 'Payroll approved',
            title: `${periodLabel(response.payrollRun)} payroll approved`,
            description: 'Next: export the bank file and post it to the bank.',
          });
        } else {
          toast.success('Payroll rejected');
        }
        return true;
      } catch (error) {
        console.error('Failed to update payroll status', error);
        toast.error(error?.response?.data?.message || 'Failed to update payroll status');
        return false;
      } finally {
        setApproving(false);
      }
    },
    [payroll, payrollId, user]
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
    // Start from what is stored: the breakdown, or the lump sum saved before
    // the breakdown existed. Always leave one row to type into.
    const rows = manualDeductionRows(item).map((row) => ({
      label: row.label === 'Other Deductions' ? '' : row.label,
      amount: String(row.amount),
    }));
    setAdjustItems(rows.length ? rows : [blankDeduction()]);
  }, []);

  const handleCloseAdjust = useCallback(() => {
    setAdjustTarget(null);
    setAdjustItems([]);
  }, []);

  const handleSaveAdjust = useCallback(async () => {
    if (!adjustTarget) return;
    const items = adjustItems
      .map((row) => ({ label: String(row.label || '').trim(), amount: Number(row.amount) || 0 }))
      .filter((row) => row.amount > 0);
    const amount = items.reduce((sum, row) => sum + row.amount, 0);
    setAdjusting(true);
    try {
      const response = await updatePayrollLineItemDeductions(adjustTarget.id, {
        manualDeductionAmount: amount,
        manualDeductionItems: items,
      });
      const saved = response?.lineItem;
      setLineItems((prev) =>
        prev.map((li) => {
          if (li.id !== adjustTarget.id) return li;
          // Keep the breakdown just entered even if the API could not store it
          // yet (column not migrated) — the summary in the remarks still was.
          if (saved) return { ...saved, manualDeductionItems: saved.manualDeductionItems ?? items };
          const standing = Number(li.gosiDeduction || 0) + Number(li.lopAmount || 0);
          return {
            ...li,
            manualDeductionAmount: amount,
            manualDeductionItems: items,
            deductions: standing + amount,
            netSalary: (li.grossSalary || 0) - standing - amount,
          };
        })
      );
      toast.success('Deductions updated successfully');
      handleCloseAdjust();
    } catch (error) {
      console.error('Failed to update deduction', error);
      toast.error(error?.response?.data?.message || 'Failed to update deductions');
    } finally {
      setAdjusting(false);
    }
  }, [adjustTarget, adjustItems, handleCloseAdjust]);

  // ── Edit earnings ──────────────────────────────────────────────────────
  const handleOpenEarnings = useCallback((item) => {
    setEarningsTarget(item);
    setEarnings({
      ...Object.fromEntries(ADJUSTABLE.map(({ key }) => [key, String(item[key] ?? 0)])),
      reason: item.earningsAdjustmentReason || '',
    });
  }, []);

  const handleCloseEarnings = useCallback(() => {
    setEarningsTarget(null);
    setEarnings({});
  }, []);

  const handleSaveEarnings = useCallback(async () => {
    if (!earningsTarget) return;
    setSavingEarnings(true);
    try {
      await updatePayrollLineItemEarnings(earningsTarget.id, {
        transportAllowance: Number(earnings.transportAllowance) || 0,
        otherAllowances: Number(earnings.otherAllowances) || 0,
        earningsAdjustmentReason: earnings.reason?.trim() || undefined,
      });
      const data = await fetchPayrollRun(payrollId);
      setPayroll(data.payrollRun);
      setLineItems(data.lineItems || []);
      toast.success('Allowances updated');
      handleCloseEarnings();
    } catch (error) {
      console.error('Failed to update earnings', error);
      toast.error(error?.response?.data?.message || 'Failed to update earnings');
    } finally {
      setSavingEarnings(false);
    }
  }, [earningsTarget, earnings, handleCloseEarnings, payrollId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [data, list] = await Promise.all([refreshPayrollRun(payrollId), getEmployees()]);
      setPayroll(data.payrollRun);
      setLineItems(data.lineItems || []);
      setEmployees(Array.isArray(list) ? list : []);
      toast.success(
        data.updated
          ? `${data.updated} employee${data.updated === 1 ? '' : 's'} updated from their records`
          : 'Already up to date with the employee records'
      );
    } catch (error) {
      console.error('Failed to refresh payroll', error);
      toast.error(error?.response?.data?.message || 'Failed to refresh from employee records');
    } finally {
      setRefreshing(false);
    }
  }, [payrollId]);

  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const isPending = payroll?.status === 'pending_approval';
  const changedLines = isPending
    ? lineItems.filter((li) => profileChanges(li, employeeById.get(li.employeeDbId)).length)
    : [];
  const figures = runFigures(lineItems);

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
        })
      ).toBlob();
    },
    [payroll]
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
      setPayslipBusyId(item.id);
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
      } finally {
        setPayslipBusyId(null);
      }
    },
    [payroll, payslipFileName, renderPayslipBlob]
  );

  // The viewer shows the same PDF the download and the email produce.
  const handleViewPayslip = useCallback(
    async (item) => {
      if (!payroll) return;
      setPayslipBusyId(item.id);
      try {
        const blob = await renderPayslipBlob(item);
        setPayslipView({ item, url: URL.createObjectURL(blob) });
      } catch (error) {
        console.error('Failed to generate payslip', error);
        toast.error('Failed to generate payslip PDF');
      } finally {
        setPayslipBusyId(null);
      }
    },
    [payroll, renderPayslipBlob]
  );

  const handleClosePayslipView = useCallback(() => {
    setPayslipView((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  }, []);

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
        celebrate({
          kind: 'sent',
          chip: 'Payslips sent',
          title: 'Payslips emailed',
          description: message,
        });
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
        heading={payroll ? `${periodLabel(payroll)} payroll` : 'Payroll'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Payroll', href: paths.dashboard.hr.employee.finance.payroll.root },
          { name: payroll ? periodLabel(payroll) : 'Not found' },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            {isPending && (
              <Button
                variant="contained"
                color="inherit"
                startIcon={<Iconify icon="solar:clipboard-check-bold" />}
                onClick={() => setReviewOpen(true)}
              >
                Review approval
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Iconify icon="mdi:arrow-left" />}
              onClick={() => router.push(paths.dashboard.hr.employee.finance.payroll.root)}
            >
              Back
            </Button>
          </Stack>
        }
        sx={{ mb: 2 }}
      />

      {!payroll ? (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Payroll not found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The requested payroll does not exist. Return to the list.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => router.push(paths.dashboard.hr.employee.finance.payroll.root)}
          >
            Go to Payroll List
          </Button>
        </Card>
      ) : (
        <Stack spacing={3}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Label variant="soft" color={(STATUS_LABEL[payroll.status] || {}).color || 'default'}>
              {(STATUS_LABEL[payroll.status] || {}).label || payroll.status}
            </Label>
            <Label variant="soft">KSA · SAR</Label>
            {figures.adjusted.length > 0 && (
              <Label variant="soft" color="warning">
                {figures.adjusted.length} allowance adjustment
                {figures.adjusted.length === 1 ? '' : 's'}
              </Label>
            )}
          </Stack>

          {changedLines.length > 0 && (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" size="small" onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? 'Updating…' : 'Update from records'}
                </Button>
              }
            >
              {changedLines.length === 1
                ? `${changedLines[0].employeeName}'s salary record has changed`
                : `${changedLines.length} employees' salary records have changed`}{' '}
              since this payroll was generated. Updating keeps allowances adjusted with a reason,
              and the deductions.
            </Alert>
          )}

          <PayrollCycleCard
            run={payroll}
            busy={processing || sendingAll}
            onReview={() => setReviewOpen(true)}
            onPostToBank={handlePostToBank}
            onEmailPayslips={handleEmailAllPayslips}
          />

          <PayrollBreakdown figures={figures} previous={previousRun} />

          <Card>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2.5 }}>
              <Tab value="report" label="Payroll report" />
              <Tab
                value="adjustments"
                label="Adjustments"
                iconPosition="end"
                icon={
                  figures.adjusted.length + figures.deducted.length ? (
                    <Label variant="soft" color="warning">
                      {new Set([...figures.adjusted, ...figures.deducted].map((li) => li.id)).size}
                    </Label>
                  ) : undefined
                }
              />
              <Tab value="payment" label="Payment" />
            </Tabs>
            <Divider />
            {tab === 'report' && (
              <PayrollReportTable
                lineItems={lineItems}
                editable={isPending}
                canSend={isPayrollFinal && !sendingAll}
                busyId={payslipBusyId ?? sendingId}
                changesFor={(item) =>
                  isPending ? profileChanges(item, employeeById.get(item.employeeDbId)) : []
                }
                onViewPayslip={handleViewPayslip}
                onDownloadPayslip={handleDownloadPayslip}
                onEmailPayslip={handleEmailPayslip}
                onAdjustAllowances={handleOpenEarnings}
                onAdjustDeductions={handleOpenAdjust}
              />
            )}
            {tab === 'adjustments' && <PayrollAdjustmentsList lineItems={lineItems} />}
            {tab === 'payment' && (
              <PayrollPaymentPanel
                run={payroll}
                lineItems={lineItems}
                exporting={exporting}
                sendingAll={sendingAll}
                canSend={isPayrollFinal}
                onExport={handleExportExcel}
                onDownloadAll={handleDownloadAllPayslips}
                onEmailAll={handleEmailAllPayslips}
              />
            )}
          </Card>

          <PayrollReviewDrawer
            open={reviewOpen}
            run={payroll}
            figures={figures}
            changedCount={changedLines.length}
            refreshing={refreshing}
            approving={approving}
            exporting={exporting}
            onRefresh={handleRefresh}
            onExport={handleExportExcel}
            onDownloadAll={handleDownloadAllPayslips}
            onShowAdjustments={() => {
              setReviewOpen(false);
              setTab('adjustments');
            }}
            onApprove={async () => {
              if (await handleApprove('approved')) setReviewOpen(false);
            }}
            onReject={async (notes) => {
              if (await handleApprove('rejected', notes)) setReviewOpen(false);
            }}
            onClose={() => setReviewOpen(false)}
          />
        </Stack>
      )}

      {/* Payslip viewer */}
      <Dialog open={Boolean(payslipView)} onClose={handleClosePayslipView} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flexGrow: 1 }}>Payslip — {payslipView?.item?.employeeName}</Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="solar:download-bold" />}
            onClick={() => payslipView && handleDownloadPayslip(payslipView.item)}
          >
            Download
          </Button>
          <IconButton onClick={handleClosePayslipView} aria-label="Close payslip">
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0, height: '80vh' }}>
          {payslipView?.url && (
            <iframe
              title={`Payslip — ${payslipView.item?.employeeName || ''}`}
              // Fit the page to the dialog width and hide the browser's side panel
              src={`${payslipView.url}#view=FitH&navpanes=0`}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit-earnings dialog */}
      <EditEarningsDialog
        open={Boolean(earningsTarget)}
        item={earningsTarget}
        values={earnings}
        saving={savingEarnings}
        onChange={setEarnings}
        onSave={handleSaveEarnings}
        onClose={handleCloseEarnings}
      />

      {/* Adjust-deduction dialog */}
      <AdjustDeductionDialog
        open={Boolean(adjustTarget)}
        item={adjustTarget}
        items={adjustItems}
        saving={adjusting}
        onItemsChange={setAdjustItems}
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

function AdjustDeductionDialog({ open, item, items, saving, onItemsChange, onSave, onClose }) {
  if (!item) return null;

  const gross = Number(item.grossSalary || 0);
  // GOSI and loss of pay stand whatever is entered here.
  const standing = Number(item.gosiDeduction || 0) + Number(item.lopAmount || 0);
  const total = items.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const net = gross - standing - total;

  const setRow = (index, patch) =>
    onItemsChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const removeRow = (index) => {
    const next = items.filter((_, i) => i !== index);
    onItemsChange(next.length ? next : [blankDeduction()]);
  };

  // Each deduction is printed on the payslip, so it has to say what it is for.
  const missingReason = (row) => Number(row.amount) > 0 && !String(row.label || '').trim();
  const badAmount = (row) => Number(row.amount) < 0;
  const invalid = items.some((row) => missingReason(row) || badAmount(row)) || net < 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Adjust Deductions — {item.employeeName}</DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            List each deduction with its reason. Every line is printed on the payslip exactly as
            written here.
          </Typography>

          {items.map((row, index) => (
            <Stack key={index} direction="row" spacing={1.5} alignItems="flex-start">
              <Autocomplete
                freeSolo
                fullWidth
                options={DEDUCTION_REASONS}
                inputValue={row.label}
                onInputChange={(_, value) => setRow(index, { label: value })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Reason"
                    placeholder="e.g. Salary advance recovery"
                    error={missingReason(row)}
                    helperText={missingReason(row) ? 'Say what this deduction is for' : undefined}
                    inputProps={{ ...params.inputProps, maxLength: 120 }}
                  />
                )}
              />
              <TextField
                label="Amount"
                type="number"
                value={row.amount}
                onChange={(e) => setRow(index, { amount: e.target.value })}
                error={badAmount(row)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">SAR</InputAdornment>,
                  inputProps: { min: 0 },
                }}
                sx={{ width: 200, flexShrink: 0 }}
              />
              <Tooltip title="Remove this deduction">
                <IconButton color="error" onClick={() => removeRow(index)} sx={{ mt: 1 }}>
                  <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}

          <Box>
            <Button
              size="small"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => onItemsChange([...items, blankDeduction()])}
            >
              Add deduction
            </Button>
          </Box>

          <Paper
            variant="outlined"
            sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'background.neutral' }}
          >
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Gross
              </Typography>
              <Typography variant="body2">{sar(gross)}</Typography>
            </Stack>
            {standing > 0 && (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  GOSI / loss of pay
                </Typography>
                <Typography variant="body2">− {sar(standing)}</Typography>
              </Stack>
            )}
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="error">
                Deductions entered here
              </Typography>
              <Typography variant="body2" color="error">
                − {sar(total)}
              </Typography>
            </Stack>
            <Divider sx={{ my: 0.75 }} />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="subtitle2" color={net < 0 ? 'error' : 'success.main'}>
                Net Pay
              </Typography>
              <Typography variant="subtitle2" color={net < 0 ? 'error' : 'success.main'}>
                {sar(net)}
              </Typography>
            </Stack>
          </Paper>
          {net < 0 && (
            <Typography variant="caption" color="error">
              The deductions are more than the pay for this period.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSave} disabled={saving || invalid}>
          {saving ? 'Saving…' : 'Save Deductions'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit-Earnings Dialog
// ---------------------------------------------------------------------------

function EditEarningsDialog({ open, item, values, saving, onChange, onSave, onClose }) {
  if (!item) return null;

  const basic = num(item.basicSalary);
  const housing = num(item.housingAllowance);
  const paid = Object.fromEntries(ADJUSTABLE.map(({ key }) => [key, num(values[key])]));
  const gross = basic + housing + paid.transportAllowance + paid.otherAllowances;
  const deductions = num(item.deductions);
  const net = gross - deductions;
  const adjusted = ADJUSTABLE.some((field) => paid[field.key] !== standardOf(item, field));
  const missingReason = adjusted && !values.reason?.trim();
  const invalid = ADJUSTABLE.some(({ key }) => Number(values[key]) < 0) || net < 0 || missingReason;

  const row = (label, value, color) => (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" color={color || 'text.secondary'}>
        {label}
      </Typography>
      <Typography variant="body2" color={color}>
        {value}
      </Typography>
    </Stack>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Adjust Allowances — {item.employeeName}</DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
            {row('Basic Salary', sar(basic))}
            {row('Housing Allowance', sar(housing))}
            <Typography variant="caption" color="text.secondary">
              From the employee record; not editable here.
            </Typography>
          </Paper>

          {ADJUSTABLE.map((field) => {
            const standardValue = standardOf(item, field);
            const diff = paid[field.key] - standardValue;
            return (
              <TextField
                key={field.key}
                label={field.label}
                type="number"
                value={values[field.key] ?? ''}
                onChange={(e) => onChange({ ...values, [field.key]: e.target.value })}
                error={Number(values[field.key]) < 0}
                helperText={
                  diff
                    ? `Standard ${sar(standardValue)} · ${diff > 0 ? '+' : '−'}${sar(Math.abs(diff))}`
                    : `Standard ${sar(standardValue)}`
                }
                InputProps={{
                  startAdornment: <InputAdornment position="start">SAR</InputAdornment>,
                  inputProps: { min: 0 },
                }}
              />
            );
          })}

          <TextField
            label="Justification"
            multiline
            minRows={2}
            value={values.reason ?? ''}
            onChange={(e) => onChange({ ...values, reason: e.target.value })}
            disabled={!adjusted}
            error={missingReason}
            placeholder="e.g. Site allowance for the Riyadh client deployment"
            helperText={
              adjusted
                ? 'Required: the approver sees it next to the standard figure.'
                : 'Needed only when an allowance differs from the standard.'
            }
            inputProps={{ maxLength: 500 }}
          />

          <Paper
            variant="outlined"
            sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'background.neutral' }}
          >
            {row('Gross', sar(gross))}
            {row('Deductions', `− ${sar(deductions)}`)}
            <Divider sx={{ my: 0.75 }} />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="subtitle2" color={net < 0 ? 'error' : 'success.main'}>
                Net Pay
              </Typography>
              <Typography variant="subtitle2" color={net < 0 ? 'error' : 'success.main'}>
                {sar(net)}
              </Typography>
            </Stack>
          </Paper>

          <Typography variant="caption" color="text.secondary">
            This changes this payroll only; the employee record keeps its figures.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSave} disabled={saving || invalid}>
          {saving ? 'Saving…' : 'Save Allowances'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

EditEarningsDialog.propTypes = {
  item: PropTypes.object,
  onChange: PropTypes.func,
  onClose: PropTypes.func,
  onSave: PropTypes.func,
  open: PropTypes.bool,
  saving: PropTypes.bool,
  values: PropTypes.object,
};
