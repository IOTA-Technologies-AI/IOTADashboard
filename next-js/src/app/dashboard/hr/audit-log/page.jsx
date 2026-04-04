'use client';

import { useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { DataGrid } from '@mui/x-data-grid';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { getAuditLog } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

const ACTION_COLORS = {
  created: 'success',
  approval_decision: 'info',
  updated: 'warning',
  deleted: 'error',
};

const ENTITY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'visaRequest', label: 'Visa Request' },
  { value: 'serviceRequest', label: 'Service Request' },
  { value: 'reimbursementRequest', label: 'Reimbursement' },
  { value: 'travelRequest', label: 'Travel Request' },
  { value: 'letterRequest', label: 'Letter Request' },
];

export default function AuditLogPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    getAuditLog({ entityType: entityType || undefined, limit: 200 })
      .then((data) => setRows(data?.logs ?? []))
      .catch((e) => console.error('Failed to load audit log:', e))
      .finally(() => setLoading(false));
  }, [entityType]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      field: 'occurredAt',
      headerName: 'Date / Time',
      width: 180,
      valueFormatter: (value) => (value ? new Date(value).toLocaleString('en-GB') : '—'),
    },
    { field: 'entityType', headerName: 'Entity Type', width: 160 },
    { field: 'entityId', headerName: 'Entity ID', width: 100 },
    {
      field: 'action',
      headerName: 'Action',
      width: 160,
      renderCell: ({ value }) => (
        <Chip label={value} color={ACTION_COLORS[value] ?? 'default'} size="small" variant="soft" />
      ),
    },
    { field: 'changedBy', headerName: 'Changed By', flex: 1 },
    {
      field: 'notes',
      headerName: 'Notes',
      flex: 1,
      valueFormatter: (value) => value ?? '—',
    },
    {
      field: 'changedFields',
      headerName: 'Changed Fields',
      flex: 2,
      renderCell: ({ value }) => (
        <Typography variant="caption" noWrap>
          {value ? JSON.stringify(value) : '—'}
        </Typography>
      ),
    },
  ];

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Audit Log"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Audit Log' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Filter by Type"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          {ENTITY_TYPES.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              {t.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Card>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          sx={{ minHeight: 480 }}
        />
      </Card>
    </DashboardContent>
  );
}
