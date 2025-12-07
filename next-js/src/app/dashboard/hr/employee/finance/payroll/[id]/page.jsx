'use client';

import { use, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { toast } from 'src/components/snackbar';
import { fetchPayrollRun, approvePayrollRun, getEmployees, postPayrollToBank } from 'src/utils/apiHelper';
import { fCurrency } from 'src/utils/format-number';
import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

export default function PayrollDetailPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const payrollId = Number(id);
  const [payroll, setPayroll] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [approving, setApproving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [processing, setProcessing] = useState(false);

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
        if (n.includes('snb') || n.includes('national commercial') || n.includes('national bank')) return 'NCBKSAJE';
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

      const monthLabel = new Date(payroll.periodYear, payroll.periodMonth - 1).toLocaleString('default', {
        month: 'short',
      });
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
          <Button variant="outlined" onClick={() => router.push(paths.dashboard.hr.employee.finance.payroll.root)}>
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
              <Label color={payroll.status === 'approved' ? 'success' : payroll.status === 'pending_approval' ? 'warning' : payroll.status === 'rejected' ? 'error' : payroll.status === 'processed' ? 'info' : 'default'}>
                {formatStatus(payroll.status)}
              </Label>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Generated on {new Date(payroll.createdAt || payroll.approvedAt || payroll.generatedAt || Date.now()).toLocaleString()} by {payroll.generatedBy}
            </Typography>

            <Grid container spacing={2}>
              {[{ label: 'Total Net', value: fCurrency(payroll.totalNet ?? 0, { currency: 'SAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                { label: 'Total Gross', value: fCurrency(payroll.totalGross ?? 0, { currency: 'SAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                { label: 'Total Employees', value: payroll.totalEmployees },
                { label: 'Month', value: payroll.periodMonth },
                { label: 'Year', value: payroll.periodYear }].map((item) => (
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
                          <TableCell align="right">Gross</TableCell>
                          <TableCell align="right">Deductions</TableCell>
                          <TableCell align="right">Net</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lineItems.map((item) => (
                          <TableRow key={item.id} hover>
                            <TableCell>{item.employeeName}</TableCell>
                            <TableCell align="right">
                              {fCurrency(item.grossSalary || 0, {
                                currency: 'SAR',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell align="right">
                              {fCurrency(item.deductions || 0, {
                                currency: 'SAR',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell align="right">
                              {fCurrency(item.netSalary || 0, {
                                currency: 'SAR',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
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
    </DashboardContent>
  );
}

PayrollDetailPage.propTypes = {
  params: PropTypes.shape({ id: PropTypes.string }),
};
