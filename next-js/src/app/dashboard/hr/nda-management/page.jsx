'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';

import { paths } from 'src/routes/paths';

import { getNdas } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';
import { runNdaReview, ndaNeedsReview } from 'src/actions/nda-review';

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

/** The review column: what the IOTA standard review says about this NDA. */
function reviewChip(row) {
  if (!('reviewStatus' in row))
    return { label: '—', color: 'default', hint: 'Review not set up yet' };
  if (!ndaNeedsReview(row))
    return { label: 'Standard', color: 'default', hint: "IOTA's own template, unchanged" };
  if (row.reviewStatus === 'clear')
    return { label: 'Clear', color: 'success', hint: 'Meets the IOTA standard' };
  if (row.reviewStatus === 'attention') {
    if (row.exceptionStatus === 'approved')
      return {
        label: 'Exception approved',
        color: 'info',
        hint: 'Approved despite flagged clauses',
      };
    if (row.exceptionStatus === 'pending')
      return { label: 'Awaiting approval', color: 'warning', hint: 'Exception requested' };
    if (row.exceptionStatus === 'rejected')
      return { label: 'Exception rejected', color: 'error', hint: 'Clauses must be corrected' };
    return {
      label: 'Needs attention',
      color: 'error',
      hint: 'Clauses depart from the IOTA standard',
    };
  }
  return {
    label: 'Not reviewed',
    color: 'warning',
    hint: 'Not yet checked against the IOTA standard',
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NdaManagementPage() {
  const router = useRouter();
  const [ndas, setNdas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bulk, setBulk] = useState(null); // { done, total, current }

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Existing NDAs that have never been checked (cancelled and expired ones aside).
  const unreviewed = ndas.filter(
    (n) =>
      'reviewStatus' in n &&
      ndaNeedsReview(n) &&
      (!n.reviewStatus || n.reviewStatus === 'not_reviewed') &&
      !['cancelled', 'expired'].includes(n.status)
  );

  const handleReviewAll = async () => {
    const queue = [...unreviewed];
    let flagged = 0;
    const failed = [];
    for (let i = 0; i < queue.length; i += 1) {
      setBulk({ done: i, total: queue.length, current: queue[i].ndaNumber });
      try {
        // One at a time: each is a full document read and AI call.
         
        const review = await runNdaReview(queue[i].id);
        if (review?.reviewStatus === 'attention') flagged += 1;
      } catch (err) {
        failed.push(`${queue[i].ndaNumber}: ${err?.response?.data?.message || err.message}`);
      }
    }
    setBulk(null);
    await load();
    const done = queue.length - failed.length;
    toast[flagged || failed.length ? 'warning' : 'success'](
      `Reviewed ${done} NDA${done === 1 ? '' : 's'}${flagged ? ` — ${flagged} need${flagged === 1 ? 's' : ''} attention` : ''}.`
    );
    if (failed.length) toast.error(failed.join(' · '));
  };

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
      field: 'reviewStatus',
      headerName: 'IOTA review',
      width: 180,
      sortable: true,
      valueGetter: (value, row) => reviewChip(row).label,
      renderCell: ({ row }) => {
        const chip = reviewChip(row);
        return (
          <Tooltip title={chip.hint}>
            <Chip size="small" label={chip.label} color={chip.color} variant="soft" />
          </Tooltip>
        );
      },
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
          <Stack direction="row" spacing={1}>
            <Tooltip
              title={
                unreviewed.length
                  ? `Check the ${unreviewed.length} unreviewed NDA${unreviewed.length === 1 ? '' : 's'} against the IOTA standard, one by one`
                  : 'Every NDA has been reviewed'
              }
            >
              <span>
                <Button
                  variant="outlined"
                  disabled={!unreviewed.length || !!bulk}
                  startIcon={<Iconify icon="solar:shield-check-bold" />}
                  onClick={handleReviewAll}
                >
                  Review existing NDAs{unreviewed.length ? ` (${unreviewed.length})` : ''}
                </Button>
              </span>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => router.push(paths.dashboard.hr.ndaManagement.new)}
            >
              New NDA
            </Button>
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {bulk ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Reviewing {bulk.current} ({bulk.done + 1} of {bulk.total}) — about a minute each. Keep
            this page open.
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(bulk.done / bulk.total) * 100}
            sx={{ mt: 1 }}
          />
        </Box>
      ) : null}

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
