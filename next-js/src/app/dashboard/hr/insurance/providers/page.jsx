'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import { DataGrid } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { listInsuranceProviders, updateInsuranceProvider } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

export default function InsuranceProvidersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    listInsuranceProviders()
      .then((providers) => setRows(providers))
      .catch((e) => console.error('Failed to load providers:', e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleToggleActive = useCallback(
    async (id, isActive) => {
      try {
        await updateInsuranceProvider(id, { isActive: !isActive });
        toast.success('Provider updated');
        reload();
      } catch {
        toast.error('Failed to update provider');
      }
    },
    [reload]
  );

  const columns = useMemo(
    () => [
      { field: 'id', headerName: '#', width: 60 },
      { field: 'name', headerName: 'Name', flex: 1 },
      { field: 'networkType', headerName: 'Network', width: 140 },
      { field: 'country', headerName: 'Country', width: 100 },
      { field: 'contactName', headerName: 'Contact', width: 150 },
      { field: 'contactEmail', headerName: 'Email', flex: 1 },
      {
        field: 'isActive',
        headerName: 'Active',
        width: 100,
        renderCell: ({ value, row }) => (
          <Switch
            checked={!!value}
            size="small"
            onChange={() => handleToggleActive(row.id, value)}
          />
        ),
      },
    ],
    [handleToggleActive]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Insurance Providers"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Insurance', href: paths.dashboard.hr.insurance.root },
          { name: 'Providers' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.hr.insurance.providersNew}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New Provider
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <Card>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          pageSizeOptions={[25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          sx={{ minHeight: 400 }}
        />
      </Card>
    </DashboardContent>
  );
}
