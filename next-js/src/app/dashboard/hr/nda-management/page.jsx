'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';

import { getNdas } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ── Status colour map ──────────────────────────────────────────────────────

const STATUS_COLOR = {
  draft: 'default',
  pending_iota_signatures: 'warning',
  pending_partner_signatures: 'info',
  fully_executed: 'success',
  expired: 'error',
  cancelled: 'error',
};

const STATUS_LABEL = {
  draft: 'Draft',
  pending_iota_signatures: 'Pending IOTA Signatures',
  pending_partner_signatures: 'Pending Partner Signatures',
  fully_executed: 'Fully Executed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function NdaManagementPage() {
  const router = useRouter();
  const [ndas, setNdas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await getNdas();
        setNdas(data || []);
      } catch (err) {
        console.error('Error fetching NDAs:', err);
        toast.error('Failed to load NDAs');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleView = useCallback(
    (id) => router.push(paths.dashboard.hr.ndaManagement.details(id)),
    [router]
  );

  const columns = [
    { field: 'ndaNumber', headerName: 'NDA #', width: 150 },
    { field: 'partnerCompanyName', headerName: 'Partner', flex: 1.5, minWidth: 180 },
    { field: 'title', headerName: 'Title', flex: 2, minWidth: 200 },
    {
      field: 'effectiveDate',
      headerName: 'Effective Date',
      width: 140,
      valueFormatter: (value) => (value ? new Date(value).toLocaleDateString('en-GB') : '—'),
    },
    {
      field: 'expiryDate',
      headerName: 'Expiry',
      width: 130,
      renderCell: ({ value, row }) => (
        <span>
          {row?.isPerpetual
            ? 'Perpetual'
            : value
              ? new Date(value).toLocaleDateString('en-GB')
              : '—'}
        </span>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 220,
      renderCell: ({ value }) => (
        <Chip
          size="small"
          label={STATUS_LABEL[value] || value}
          color={STATUS_COLOR[value] || 'default'}
          variant="soft"
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      width: 60,
      getActions: ({ row }) => [
        <GridActionsCellItem
          key="view"
          icon={<Iconify icon="solar:eye-bold" />}
          label="View"
          onClick={() => handleView(row.id)}
          showInMenu={false}
        />,
      ],
    },
  ];

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="NDA Management"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'NDA Management' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => router.push(paths.dashboard.hr.ndaManagement.new)}
          >
            New NDA
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Box sx={{ height: 600 }}>
        <DataGrid
          rows={ndas}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          onRowClick={({ row }) => handleView(row.id)}
          sx={{ cursor: 'pointer' }}
        />
      </Box>
    </DashboardContent>
  );
}
