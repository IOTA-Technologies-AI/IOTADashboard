'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import { DataGrid } from '@mui/x-data-grid';
import CardHeader from '@mui/material/CardHeader';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { fetchPayrollRuns } from 'src/utils/apiHelper';

export default function PayrollListPage() {
  const router = useRouter();
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPayrolls = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPayrollRuns();
      const mapped = data.map((run) => ({
        id: run.id,
        period: `${new Date(run.periodYear, run.periodMonth - 1).toLocaleString('default', { month: 'long' })} ${run.periodYear}`,
        month: run.periodMonth,
        year: run.periodYear,
        totalEmployees: run.totalEmployees,
        totalAmount: run.totalNet ?? run.totalGross ?? 0,
        status: run.status,
        generatedBy: run.generatedBy,
        generatedAt: run.createdAt || run.approvedAt || '',
      }));
      setPayrolls(mapped);
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      toast.error('Failed to load payrolls');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayrolls();
  }, [fetchPayrolls]);

  const columns = [
    {
      field: 'period',
      headerName: 'Period',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'totalEmployees',
      headerName: 'Employees',
      flex: 0.7,
      minWidth: 100,
    },
    {
      field: 'totalAmount',
      headerName: 'Total Amount',
      flex: 1,
      minWidth: 150,
      valueFormatter: (value) => `SAR ${value?.toLocaleString() || 0}`,
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Box
          sx={{
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            bgcolor:
              params.value === 'Approved'
                ? 'success.lighter'
                : params.value === 'Rejected'
                  ? 'error.lighter'
                  : 'warning.lighter',
            color:
              params.value === 'Approved'
                ? 'success.darker'
                : params.value === 'Rejected'
                  ? 'error.darker'
                  : 'warning.darker',
          }}
        >
          {params.value}
        </Box>
      ),
    },
    {
      field: 'generatedAt',
      headerName: 'Generated On',
      flex: 1,
      minWidth: 180,
      valueFormatter: (value) => new Date(value).toLocaleString(),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          onClick={() =>
            router.push(`${paths.dashboard.hr.employee.root}/finance/payroll/${params.id}`)
          }
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Payroll Management"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee', href: paths.dashboard.hr.employee.root },
          { name: 'Finance' },
          { name: 'Payroll' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() =>
              router.push(`${paths.dashboard.hr.employee.root}/finance/payroll/generate`)
            }
          >
            Generate Payroll
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <CardHeader title="Payroll History" />
        <Box sx={{ height: 600 }}>
          <DataGrid
            rows={payrolls}
            columns={columns}
            loading={loading}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10 },
              },
            }}
          />
        </Box>
      </Card>
    </DashboardContent>
  );
}
