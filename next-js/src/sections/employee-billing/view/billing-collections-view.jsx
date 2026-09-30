'use client';

import useSWR from 'swr';
import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import { DataGrid } from '@mui/x-data-grid';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';
import { getBillingSummary, listBillingInvoices } from 'src/actions/employee-billing';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { StageLabel } from '../stage-label';
import { SendInvoiceDialog } from '../send-invoice-dialog';
import { GenerateRunDialog } from '../generate-run-dialog';
import { StageTransitionDialog } from '../stage-transition-dialog';
import { downloadInvoicePdf } from '../utils/build-invoice-for-pdf';
import { STAGES, periodLabel, isOpenStage, NEXT_ACTIONS } from '../utils/stages';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'follow_up', label: 'Needs follow-up' },
  { value: 'awaiting_approval', label: STAGES.awaiting_approval.short },
  { value: 'ready_to_send', label: STAGES.ready_to_send.short },
  { value: 'sent_to_customer', label: STAGES.sent_to_customer.short },
  { value: 'customer_queried', label: STAGES.customer_queried.short },
  { value: 'customer_approved', label: STAGES.customer_approved.short },
  { value: 'receipt_requested', label: STAGES.receipt_requested.short },
  { value: 'paid', label: STAGES.paid.short },
  { value: 'rejected', label: STAGES.rejected.short },
];

function SummaryCard({ title, count, amount, currency, color, hint }) {
  return (
    <Card sx={{ p: 2, minWidth: 180, flex: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h4" fontWeight={700} sx={{ color }}>
        {count}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {fCurrency(amount || 0, { currencyCode: currency })}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.disabled">
          {hint}
        </Typography>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------

export function BillingCollectionsView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const roleId =
    Number(user?.roleId) || (user?.role === 'superAdmin' ? 4 : user?.role === 'admin' ? 3 : 1);
  const canMarkPaid = roleId >= 3;

  const [tab, setTab] = useState('all');
  const [period, setPeriod] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [menu, setMenu] = useState({ anchor: null, row: null });
  const [dialog, setDialog] = useState({ kind: null, row: null, action: null });
  const [generateOpen, setGenerateOpen] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const {
    data: rows = [],
    isLoading,
    mutate,
  } = useSWR(['employee-billing/invoices', period], () =>
    listBillingInvoices(period ? { period } : {})
  );
  const { data: summary, mutate: mutateSummary } = useSWR(
    'employee-billing/summary',
    getBillingSummary
  );

  const refresh = useCallback(() => {
    mutate();
    mutateSummary();
  }, [mutate, mutateSummary]);

  const filtered = useMemo(() => {
    let list = rows;
    if (tab === 'follow_up') list = list.filter((r) => r.needsFollowUp);
    else if (tab !== 'all') list = list.filter((r) => r.effectiveStage === tab);
    else if (onlyOpen) list = list.filter((r) => isOpenStage(r.effectiveStage) || r.needsFollowUp);
    return list;
  }, [rows, tab, onlyOpen]);

  const countFor = (value) => {
    if (value === 'all') return rows.length;
    if (value === 'follow_up') return rows.filter((r) => r.needsFollowUp).length;
    return rows.filter((r) => r.effectiveStage === value).length;
  };

  const openMenu = (event, row) => setMenu({ anchor: event.currentTarget, row });
  const closeMenu = () => setMenu({ anchor: null, row: null });

  const startAction = (row, action) => {
    closeMenu();
    if (action.kind === 'send') setDialog({ kind: 'send', row, action });
    else setDialog({ kind: 'stage', row, action });
  };

  const handleDownload = async (row) => {
    closeMenu();
    setDownloading(row.invoiceId);
    try {
      await downloadInvoicePdf(row.invoiceId);
    } catch (e) {
      toast.error(e?.message || 'Could not render the PDF');
    } finally {
      setDownloading(null);
    }
  };

  const currency = summary?.currencyCode || rows[0]?.currencyCode || 'SAR';
  const byStage = useMemo(() => {
    const map = {};
    (summary?.byStage || []).forEach((s) => {
      map[s.stage] = s;
    });
    return map;
  }, [summary]);

  const columns = [
    {
      field: 'invoiceNumber',
      headerName: 'Invoice',
      flex: 1,
      minWidth: 200,
      renderCell: ({ row }) => (
        <Box sx={{ py: 0.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {row.invoiceNumber}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.contractNumber} ·{' '}
            {row.contractType === 'managed_services' ? 'Managed services' : 'Single employee'}
          </Typography>
        </Box>
      ),
    },
    { field: 'customerName', headerName: 'Customer', flex: 1, minWidth: 160 },
    {
      field: 'period',
      headerName: 'Period',
      width: 100,
      valueFormatter: (value) => periodLabel(value),
    },
    { field: 'headcount', headerName: 'Staff', width: 70, type: 'number' },
    {
      field: 'total',
      headerName: 'Total',
      width: 140,
      type: 'number',
      valueFormatter: (value, row) => fCurrency(value, { currencyCode: row.currencyCode }),
    },
    {
      field: 'dueDate',
      headerName: 'Due',
      width: 120,
      renderCell: ({ row }) => (
        <Stack>
          <Typography variant="body2">{row.dueDate ? fDate(row.dueDate) : '—'}</Typography>
          {row.daysOverdue > 0 && (
            <Typography variant="caption" color="error.main">
              {row.daysOverdue}d overdue
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      field: 'effectiveStage',
      headerName: 'Stage',
      width: 190,
      renderCell: ({ value }) => <StageLabel stage={value} />,
    },
    {
      field: 'nextFollowUpDate',
      headerName: 'Follow-up',
      width: 130,
      renderCell: ({ row }) =>
        row.needsFollowUp ? (
          <Label variant="soft" color="error">
            Chase now
          </Label>
        ) : row.nextFollowUpDate ? (
          <Typography variant="body2">{fDate(row.nextFollowUpDate)}</Typography>
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: ({ row }) => (
        <IconButton onClick={(e) => openMenu(e, row)}>
          <Iconify icon="eva:more-vertical-fill" />
        </IconButton>
      ),
    },
  ];

  const menuRow = menu.row;
  const nextActions = menuRow ? NEXT_ACTIONS[menuRow.effectiveStage] || [] : [];

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Employee Billing — Collections"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee Billing' },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="eva:file-text-fill" />}
              onClick={() => router.push(paths.dashboard.hr.employeeBilling.contracts.root)}
            >
              Contracts
            </Button>
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:flash-fill" />}
              onClick={() => setGenerateOpen(true)}
            >
              Generate Monthly Invoices
            </Button>
          </Stack>
        }
        sx={{ mb: 3 }}
      />

      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <SummaryCard
          title="Needs follow-up"
          count={summary?.needsFollowUp?.count ?? 0}
          amount={summary?.needsFollowUp?.amount}
          currency={currency}
          color="error.main"
          hint="Follow-up date reached or past due"
        />
        <SummaryCard
          title="Awaiting internal approval"
          count={byStage.awaiting_approval?.count ?? 0}
          amount={byStage.awaiting_approval?.amount}
          currency={currency}
          color="warning.main"
        />
        <SummaryCard
          title="With customer"
          count={(byStage.sent_to_customer?.count ?? 0) + (byStage.customer_queried?.count ?? 0)}
          amount={(byStage.sent_to_customer?.amount ?? 0) + (byStage.customer_queried?.amount ?? 0)}
          currency={currency}
          color="primary.main"
          hint="Sent, or queried by the customer"
        />
        <SummaryCard
          title="Pending payment"
          count={(byStage.customer_approved?.count ?? 0) + (byStage.receipt_requested?.count ?? 0)}
          amount={
            (byStage.customer_approved?.amount ?? 0) + (byStage.receipt_requested?.amount ?? 0)
          }
          currency={currency}
          color="info.main"
          hint="Customer approved; receipt / payment outstanding"
        />
        <SummaryCard
          title="Outstanding (all open)"
          count={summary?.outstanding?.count ?? 0}
          amount={summary?.outstanding?.amount}
          currency={currency}
          color="text.primary"
        />
        <SummaryCard
          title="Paid this month"
          count={summary?.paidThisMonth?.count ?? 0}
          amount={summary?.paidThisMonth?.amount}
          currency={currency}
          color="success.main"
        />
      </Stack>

      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {TABS.map((t) => (
            <Tab
              key={t.value}
              value={t.value}
              iconPosition="end"
              icon={
                <Label
                  variant={tab === t.value ? 'filled' : 'soft'}
                  color={t.value === 'follow_up' ? 'error' : STAGES[t.value]?.color || 'default'}
                >
                  {countFor(t.value)}
                </Label>
              }
              label={t.label}
            />
          ))}
        </Tabs>

        <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 2 }}>
          <TextField
            label="Period"
            type="month"
            size="small"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 180 }}
          />
          {period && (
            <Button size="small" onClick={() => setPeriod('')}>
              Clear
            </Button>
          )}
          {tab === 'all' && (
            <FormControlLabel
              control={
                <Switch checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
              }
              label="Open invoices only"
            />
          )}
        </Stack>

        <DataGrid
          rows={filtered}
          columns={columns}
          loading={isLoading}
          autoHeight
          disableRowSelectionOnClick
          getRowId={(r) => r.invoiceId}
          getRowHeight={() => 'auto'}
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          sx={{ border: 'none', '& .MuiDataGrid-cell': { py: 1 } }}
        />
      </Card>

      <Menu open={!!menu.anchor} anchorEl={menu.anchor} onClose={closeMenu}>
        {menuRow && (
          <MenuItem onClick={() => router.push(paths.dashboard.invoice.details(menuRow.invoiceId))}>
            <ListItemIcon>
              <Iconify icon="eva:eye-fill" />
            </ListItemIcon>
            <ListItemText>View invoice</ListItemText>
          </MenuItem>
        )}
        {menuRow && (
          <MenuItem
            onClick={() => handleDownload(menuRow)}
            disabled={downloading === menuRow.invoiceId}
          >
            <ListItemIcon>
              <Iconify icon="eva:download-fill" />
            </ListItemIcon>
            <ListItemText>
              {downloading === menuRow.invoiceId ? 'Rendering…' : 'Download PDF'}
            </ListItemText>
          </MenuItem>
        )}
        {menuRow && (
          <MenuItem
            onClick={() =>
              router.push(paths.dashboard.hr.employeeBilling.contracts.details(menuRow.contractId))
            }
          >
            <ListItemIcon>
              <Iconify icon="eva:file-text-fill" />
            </ListItemIcon>
            <ListItemText>Open contract</ListItemText>
          </MenuItem>
        )}
        {menuRow?.effectiveStage === 'awaiting_approval' && (
          <MenuItem disabled>
            <ListItemText secondary="Approve it in the Invoice module (super-admin, TOTP)">
              Awaiting internal approval
            </ListItemText>
          </MenuItem>
        )}
        {menuRow?.effectiveStage === 'rejected' && (
          <MenuItem onClick={() => router.push(paths.dashboard.invoice.edit(menuRow.invoiceId))}>
            <ListItemIcon>
              <Iconify icon="eva:edit-fill" />
            </ListItemIcon>
            <ListItemText secondary={menuRow.rejectionReason}>Edit & resubmit</ListItemText>
          </MenuItem>
        )}
        {nextActions.map((action) => {
          const blocked = action.kind === 'paid' && !canMarkPaid;
          return (
            <Tooltip key={action.label} title={blocked ? 'Admins and super-admins only' : ''}>
              <span>
                <MenuItem onClick={() => startAction(menuRow, action)} disabled={blocked}>
                  <ListItemIcon>
                    <Iconify icon={action.icon} />
                  </ListItemIcon>
                  <ListItemText>{action.label}</ListItemText>
                </MenuItem>
              </span>
            </Tooltip>
          );
        })}
        {menuRow &&
          isOpenStage(menuRow.effectiveStage) &&
          menuRow.effectiveStage !== 'awaiting_approval' && (
            <MenuItem
              onClick={() => startAction(menuRow, { kind: 'follow_up', label: 'Log follow-up' })}
            >
              <ListItemIcon>
                <Iconify icon="eva:message-circle-fill" />
              </ListItemIcon>
              <ListItemText>Log a follow-up</ListItemText>
            </MenuItem>
          )}
      </Menu>

      <SendInvoiceDialog
        open={dialog.kind === 'send'}
        onClose={() => setDialog({ kind: null, row: null, action: null })}
        invoice={dialog.row}
        onDone={refresh}
      />
      <StageTransitionDialog
        open={dialog.kind === 'stage'}
        onClose={() => setDialog({ kind: null, row: null, action: null })}
        invoice={dialog.row}
        action={dialog.action}
        onDone={refresh}
      />
      <GenerateRunDialog
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onDone={refresh}
      />
    </DashboardContent>
  );
}
