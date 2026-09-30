'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';
import { listContracts } from 'src/actions/employee-billing';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

export const CONTRACT_STATUS = {
  draft: { label: 'Draft', color: 'default' },
  proposal_sent: { label: 'Proposal sent', color: 'info' },
  customer_approved: { label: 'Customer approved', color: 'info' },
  sow_received: { label: 'SOW received', color: 'primary' },
  signed: { label: 'Signed — onboarding', color: 'secondary' },
  active: { label: 'Active', color: 'success' },
  renewal_due: { label: 'Renewal due', color: 'warning' },
  suspended: { label: 'Suspended', color: 'warning' },
  ended: { label: 'Ended', color: 'error' },
};

export function ContractStatusLabel({ status }) {
  const meta = CONTRACT_STATUS[status] || { label: status, color: 'default' };
  return (
    <Label variant="soft" color={meta.color}>
      {meta.label}
    </Label>
  );
}

// ----------------------------------------------------------------------

export function ContractListView() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: contracts = [], isLoading } = useSWR('employee-billing/contracts', () =>
    listContracts()
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter((c) =>
      [c.contractNumber, c.title, c.customerName, c.status].some((v) =>
        String(v || '')
          .toLowerCase()
          .includes(q)
      )
    );
  }, [contracts, search]);

  const columns = [
    {
      field: 'contractNumber',
      headerName: 'Contract',
      flex: 1,
      minWidth: 220,
      renderCell: ({ row }) => (
        <Stack sx={{ py: 0.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {row.contractNumber}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.title}
          </Typography>
        </Stack>
      ),
    },
    { field: 'customerName', headerName: 'Customer', flex: 1, minWidth: 160 },
    {
      field: 'contractType',
      headerName: 'Type',
      width: 150,
      valueFormatter: (value) =>
        value === 'managed_services' ? 'Managed services' : 'Single employee',
    },
    { field: 'activeHeadcount', headerName: 'Staff', width: 80, type: 'number' },
    {
      field: 'monthlyTotal',
      headerName: 'Monthly (ex-VAT)',
      width: 150,
      type: 'number',
      valueFormatter: (value, row) => fCurrency(value, { currencyCode: row.currencyCode }),
    },
    { field: 'iotaOffice', headerName: 'Office', width: 80 },
    {
      field: 'startDate',
      headerName: 'Start',
      width: 110,
      valueFormatter: (value) => (value ? fDate(value) : '—'),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: ({ value }) => <ContractStatusLabel status={value} />,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      width: 90,
      getActions: ({ row }) => [
        <GridActionsCellItem
          key="view"
          icon={<Iconify icon="eva:eye-fill" />}
          label="Open"
          onClick={() => router.push(paths.dashboard.hr.employeeBilling.contracts.details(row.id))}
        />,
        <GridActionsCellItem
          key="edit"
          icon={<Iconify icon="eva:edit-fill" />}
          label="Edit"
          onClick={() => router.push(paths.dashboard.hr.employeeBilling.contracts.edit(row.id))}
        />,
      ],
    },
  ];

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Billing Contracts"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee Billing', href: paths.dashboard.hr.employeeBilling.root },
          { name: 'Contracts' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="eva:plus-fill" />}
            onClick={() => router.push(paths.dashboard.hr.employeeBilling.contracts.new)}
          >
            New Contract
          </Button>
        }
        sx={{ mb: 3 }}
      />

      <Card>
        <Stack direction="row" sx={{ p: 2 }}>
          <TextField
            size="small"
            placeholder="Search contract, customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 320 }}
          />
        </Stack>
        <DataGrid
          rows={filtered}
          columns={columns}
          loading={isLoading}
          autoHeight
          disableRowSelectionOnClick
          getRowId={(r) => r.id}
          getRowHeight={() => 'auto'}
          pageSizeOptions={[25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          sx={{ border: 'none', '& .MuiDataGrid-cell': { py: 1 } }}
        />
      </Card>
    </DashboardContent>
  );
}
