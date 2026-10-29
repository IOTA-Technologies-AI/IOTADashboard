'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { num, sar } from './payroll-pay';
import { manualDeductionRows } from './payslip-document';

// ----------------------------------------------------------------------
// A payroll run laid out as a payroll cycle: where it stands and what to do
// next, the breakdown against the previous cycle, the report, and a review
// panel the approver works from.

const money = (value) =>
  num(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const signed = (value) => `${value > 0 ? '+' : '−'}${money(Math.abs(value))}`;

const day = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

export const STATUS_LABEL = {
  draft: { label: 'Draft', color: 'default' },
  pending_approval: { label: 'Awaiting approval', color: 'warning' },
  approved: { label: 'Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
  processed: { label: 'Posted to bank', color: 'info' },
  paid: { label: 'Paid', color: 'success' },
};

export const periodLabel = (run) =>
  run
    ? new Date(run.periodYear, run.periodMonth - 1).toLocaleString('en-GB', {
        month: 'long',
        year: 'numeric',
      })
    : '';

/** The allowances paid differently from the employee record on a line. */
export const allowanceAdjustments = (item) =>
  [
    ['Transport', 'transportAllowance', 'standardTransportAllowance'],
    ['Other', 'otherAllowances', 'standardOtherAllowances'],
  ]
    .map(([label, key, standard]) => ({
      label,
      standard: num(item[standard] ?? item[key]),
      paid: num(item[key]),
    }))
    .filter((a) => a.paid !== a.standard);

const adjustmentTotal = (item) =>
  allowanceAdjustments(item).reduce((sum, a) => sum + a.paid - a.standard, 0);

/** Totals the approver needs, from the line items. */
export function runFigures(lineItems) {
  const sum = (fn) => lineItems.reduce((s, li) => s + fn(li), 0);
  const adjusted = lineItems.filter((li) => allowanceAdjustments(li).length);
  const deducted = lineItems.filter((li) => num(li.manualDeductionAmount) > 0);
  return {
    employees: lineItems.length,
    gross: sum((li) => num(li.grossSalary)),
    net: sum((li) => num(li.netSalary)),
    deductions: sum((li) => num(li.deductions)),
    gosi: sum((li) => num(li.gosiDeduction)),
    extra: sum((li) => num(li.manualDeductionAmount)),
    lop: sum((li) => num(li.lopAmount)),
    adjusted,
    adjustment: sum(adjustmentTotal),
    deducted,
  };
}

// ----------------------------------------------------------------------

/**
 * The cycle as stages, Generated → Approval → Posted to bank → Paid →
 * Payslips sent, with the next action on the right.
 */
export function PayrollCycleCard({ run, onReview, onPostToBank, onEmailPayslips, busy }) {
  const s = run.status;
  const after = (...states) => states.includes(s);
  const stages = [
    { label: 'Generated', done: true, date: day(run.createdAt), note: run.generatedBy },
    {
      label: s === 'rejected' ? 'Rejected' : 'Approval',
      done: after('approved', 'processed', 'paid'),
      failed: s === 'rejected',
      current: s === 'pending_approval',
      date: day(run.approvedAt),
      note: run.approvedBy,
    },
    {
      label: 'Posted to bank',
      done: after('processed', 'paid'),
      current: s === 'approved',
    },
    { label: 'Paid', done: s === 'paid', current: s === 'processed', date: day(run.paymentDate) },
    {
      label: 'Payslips sent',
      done: !!run.payslipsSentAt,
      current: after('approved', 'processed', 'paid') && !run.payslipsSentAt,
      date: day(run.payslipsSentAt),
    },
  ];

  let action = null;
  if (s === 'pending_approval') {
    action = {
      title: 'Waiting for approval',
      text: 'Review the figures and adjustments, then approve or reject.',
      button: 'Review approval',
      onClick: onReview,
    };
  } else if (s === 'approved') {
    action = {
      title: 'Ready for the bank',
      text: 'Export the bank file, then mark the payroll as posted.',
      button: 'Post to bank',
      onClick: onPostToBank,
    };
  } else if (s === 'rejected') {
    action = {
      title: 'Rejected',
      text: run.notes || 'Generate the payroll again once the issues are fixed.',
    };
  } else if (!run.payslipsSentAt) {
    action = {
      title: 'Payslips not sent',
      text: 'Email each employee their payslip.',
      button: 'Email payslips',
      onClick: onEmailPayslips,
    };
  } else {
    action = { title: 'Complete', text: `Payslips sent ${day(run.payslipsSentAt)}.` };
  }

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="subtitle1" sx={{ mb: 2.5 }}>
        Payroll cycle for {periodLabel(run)}
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }}>
        <Stack direction="row" sx={{ flexGrow: 1, minWidth: 0 }}>
          {stages.map((stage, i) => {
            const color = stage.failed
              ? 'error.main'
              : stage.done
                ? 'success.main'
                : stage.current
                  ? 'warning.main'
                  : 'divider';
            return (
              <Box key={stage.label} sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center">
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'common.white',
                      bgcolor: stage.done || stage.failed ? color : 'background.paper',
                      border: (t) =>
                        `2px solid ${stage.done || stage.failed || stage.current ? 'currentColor' : t.palette.divider}`,
                      borderColor: color,
                    }}
                  >
                    {stage.failed ? (
                      <Iconify icon="mingcute:close-line" width={14} />
                    ) : stage.done ? (
                      <Iconify icon="eva:checkmark-fill" width={16} />
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{ color: stage.current ? 'warning.main' : 'text.disabled' }}
                      >
                        {i + 1}
                      </Typography>
                    )}
                  </Box>
                  {i < stages.length - 1 && (
                    <Box
                      sx={{
                        flexGrow: 1,
                        height: 3,
                        mx: 0.75,
                        borderRadius: 2,
                        bgcolor: stage.done ? 'success.main' : 'divider',
                      }}
                    />
                  )}
                </Stack>
                <Typography variant="subtitle2" sx={{ mt: 1, pr: 1 }} noWrap>
                  {stage.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap component="div">
                  {stage.date || (stage.current ? 'Next' : '—')}
                </Typography>
                {stage.note && (
                  <Typography variant="caption" color="text.disabled" noWrap component="div">
                    {stage.note}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Stack>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            width: { xs: 1, md: 280 },
            flexShrink: 0,
            borderRadius: 2,
            bgcolor: 'background.neutral',
          }}
        >
          <Typography variant="subtitle2">{action.title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {action.text}
          </Typography>
          {action.button && (
            <Button
              variant="contained"
              color="inherit"
              size="small"
              sx={{ mt: 1.5 }}
              onClick={action.onClick}
              disabled={busy}
            >
              {action.button}
            </Button>
          )}
        </Paper>
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

function Change({ now, before, percent, unit }) {
  if (before == null) {
    return (
      <Typography variant="caption" color="text.disabled">
        No previous cycle
      </Typography>
    );
  }
  const diff = now - before;
  if (!diff) {
    return (
      <Typography variant="caption" color="text.secondary">
        Same as last cycle
      </Typography>
    );
  }
  const text = percent
    ? `${Math.abs((diff / (before || 1)) * 100).toFixed(1)}%`
    : `${Math.abs(diff)}${unit ? ` ${unit}` : ''}`;
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Label variant="soft" color={diff > 0 ? 'warning' : 'info'}>
        {diff > 0 ? '▲' : '▼'} {text}
      </Label>
      <Typography variant="caption" color="text.secondary">
        {diff > 0 ? 'Higher' : 'Lower'} than last cycle
      </Typography>
    </Stack>
  );
}

/** Employees, payroll cost and its split, against the previous cycle. */
export function PayrollBreakdown({ figures, previous }) {
  const netShare = figures.gross ? (figures.net / figures.gross) * 100 : 0;
  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="subtitle1">Payroll breakdown</Typography>
        <Typography variant="body2" color="text.secondary">
          Your payroll at a glance
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        }}
      >
        <Card sx={{ p: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Employees
          </Typography>
          <Typography variant="h3" sx={{ my: 0.5 }}>
            {figures.employees}
          </Typography>
          <Change now={figures.employees} before={previous?.totalEmployees} />
        </Card>
        <Card sx={{ p: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Payroll cost (gross)
          </Typography>
          <Typography variant="h3" sx={{ my: 0.5 }}>
            {money(figures.gross)}{' '}
            <Typography component="span" variant="caption" color="text.secondary">
              SAR
            </Typography>
          </Typography>
          <Change now={figures.gross} before={previous ? num(previous.totalGross) : null} percent />
        </Card>
        <Card sx={{ p: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Cost breakdown
          </Typography>
          <Stack direction="row" spacing={3} sx={{ my: 1.25 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                ● Net pay
              </Typography>
              <Typography variant="subtitle2">{sar(figures.net)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                ○ Deductions
              </Typography>
              <Typography variant="subtitle2">{sar(figures.deductions)}</Typography>
            </Box>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={netShare}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Card>
      </Box>
    </Stack>
  );
}

// ----------------------------------------------------------------------

const deliveryIcon = {
  sent: { icon: 'mdi:email-check-outline', color: 'success.main' },
  failed: { icon: 'mdi:email-alert-outline', color: 'error.main' },
  skipped: { icon: 'mdi:email-off-outline', color: 'warning.main' },
};

/**
 * One row per employee: earnings, the allowance adjustment, deductions and
 * net pay. Payslips and edits are in the row's menu.
 */
export function PayrollReportTable({
  lineItems,
  editable,
  canSend,
  busyId,
  changesFor,
  onViewPayslip,
  onDownloadPayslip,
  onEmailPayslip,
  onAdjustAllowances,
  onAdjustDeductions,
}) {
  const [menu, setMenu] = useState(null); // { anchorEl, item }
  const close = () => setMenu(null);
  const run = (fn) => () => {
    const { item } = menu;
    close();
    fn(item);
  };

  return (
    <>
      <Table size="small" sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '30%' }}>Employee</TableCell>
            <TableCell align="right">Earnings</TableCell>
            <TableCell align="right">Adjustment</TableCell>
            <TableCell align="right">Deductions</TableCell>
            <TableCell align="right">Net Pay</TableCell>
            <TableCell align="center" sx={{ width: 64 }}>
              Payslip
            </TableCell>
            <TableCell sx={{ width: 52 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {lineItems.map((item) => {
            const adjustment = adjustmentTotal(item);
            const changes = changesFor(item);
            const extra = num(item.manualDeductionAmount);
            const delivery = deliveryIcon[item.payslipEmailStatus];
            return (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Typography variant="subtitle2" noWrap>
                    {item.employeeName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="div">
                    {[item.employeeId, item.designation].filter(Boolean).join(' · ')}
                  </Typography>
                  {changes.length > 0 && (
                    <Tooltip
                      title={changes
                        .map((c) => `${c.label}: ${sar(c.was)} → ${sar(c.now)}`)
                        .join(' · ')}
                    >
                      <Box component="span">
                        <Label variant="soft" color="warning" sx={{ mt: 0.5 }}>
                          Record changed
                        </Label>
                      </Box>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{money(item.grossSalary)}</Typography>
                  <Typography variant="caption" color="text.disabled" noWrap component="div">
                    Basic {money(item.basicSalary)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {adjustment ? (
                    <Tooltip title={item.earningsAdjustmentReason || ''}>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600 }}
                          color={adjustment > 0 ? 'warning.main' : 'info.main'}
                        >
                          {signed(adjustment)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ textDecoration: 'line-through' }}
                        >
                          {money(num(item.grossSalary) - adjustment)}
                        </Typography>
                      </Box>
                    </Tooltip>
                  ) : (
                    <Typography variant="body2" color="text.disabled">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    color={num(item.deductions) > 0 ? 'error.main' : 'text.disabled'}
                  >
                    {num(item.deductions) > 0 ? `−${money(item.deductions)}` : '—'}
                  </Typography>
                  {extra > 0 && (
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      incl. extra {money(extra)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography variant="subtitle2" color="success.main">
                    {money(item.netSalary)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {busyId === item.id ? (
                    <CircularProgress size={16} />
                  ) : (
                    <Tooltip
                      title={
                        item.payslipEmailStatus === 'sent'
                          ? `Sent to ${item.employeeEmail || 'employee'}`
                          : item.payslipEmailStatus === 'failed'
                            ? `Failed: ${item.payslipEmailError || 'unknown error'}`
                            : item.payslipEmailStatus === 'skipped' || !item.employeeEmail
                              ? 'No email address on file'
                              : 'Not sent yet'
                      }
                    >
                      <Iconify
                        icon={delivery?.icon || 'mdi:email-outline'}
                        sx={{ color: delivery?.color || 'text.disabled' }}
                      />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell padding="none">
                  <IconButton
                    onClick={(e) => setMenu({ anchorEl: e.currentTarget, item })}
                    aria-label={`Actions for ${item.employeeName}`}
                  >
                    <Iconify icon="eva:more-vertical-fill" />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Menu open={!!menu} anchorEl={menu?.anchorEl} onClose={close}>
        <MenuItem onClick={run(onViewPayslip)}>
          <Iconify icon="solar:eye-bold" sx={{ mr: 1 }} />
          View payslip
        </MenuItem>
        <MenuItem onClick={run(onDownloadPayslip)}>
          <Iconify icon="solar:download-bold" sx={{ mr: 1 }} />
          Download payslip
        </MenuItem>
        <MenuItem onClick={run(onEmailPayslip)} disabled={!canSend}>
          <Iconify icon="mdi:email-fast-outline" sx={{ mr: 1 }} />
          {menu?.item?.payslipEmailStatus === 'sent' ? 'Resend payslip' : 'Email payslip'}
        </MenuItem>
        {editable && <Divider />}
        {editable && (
          <MenuItem onClick={run(onAdjustAllowances)}>
            <Iconify icon="solar:pen-bold" sx={{ mr: 1 }} />
            Adjust allowances
          </MenuItem>
        )}
        {editable && (
          <MenuItem onClick={run(onAdjustDeductions)}>
            <Iconify icon="mdi:pencil-minus-outline" sx={{ mr: 1 }} />
            Adjust deductions
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

// ----------------------------------------------------------------------

/** Every allowance paid off-standard and every extra deduction, with its reason. */
export function PayrollAdjustmentsList({ lineItems }) {
  const rows = lineItems.filter(
    (li) => allowanceAdjustments(li).length || num(li.manualDeductionAmount) > 0
  );
  if (!rows.length) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Iconify icon="solar:check-circle-bold-duotone" width={40} sx={{ color: 'success.main' }} />
        <Typography variant="subtitle2" sx={{ mt: 1 }}>
          No adjustments
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Everyone is paid the standard figures from their records.
        </Typography>
      </Box>
    );
  }
  return (
    <Stack spacing={1.5} sx={{ p: 2 }}>
      {rows.map((li) => (
        <Paper key={li.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Box sx={{ width: { md: 240 }, flexShrink: 0 }}>
              <Typography variant="subtitle2">{li.employeeName}</Typography>
              <Typography variant="caption" color="text.secondary">
                {[li.employeeId, li.designation].filter(Boolean).join(' · ')}
              </Typography>
            </Box>
            <Stack spacing={1.25} sx={{ flexGrow: 1 }}>
              {allowanceAdjustments(li).length > 0 && (
                <Box>
                  {allowanceAdjustments(li).map((a) => (
                    <Typography key={a.label} variant="body2">
                      {a.label} allowance: {sar(a.standard)} → <b>{sar(a.paid)}</b>{' '}
                      <Typography
                        component="span"
                        variant="body2"
                        color={a.paid > a.standard ? 'warning.main' : 'info.main'}
                      >
                        ({signed(a.paid - a.standard)})
                      </Typography>
                    </Typography>
                  ))}
                  <Typography variant="caption" color="text.secondary">
                    Justification: {li.earningsAdjustmentReason || '—'}
                    {li.earningsAdjustedBy ? ` · ${li.earningsAdjustedBy}` : ''}
                  </Typography>
                </Box>
              )}
              {num(li.manualDeductionAmount) > 0 && (
                <Box>
                  {manualDeductionRows(li).map((row, i) => (
                    <Typography key={i} variant="body2">
                      Deduction: {row.label} —{' '}
                      <Typography component="span" variant="body2" color="error.main">
                        −{money(row.amount)}
                      </Typography>
                    </Typography>
                  ))}
                </Box>
              )}
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

// ----------------------------------------------------------------------

/** The bank file and the payslips. */
export function PayrollPaymentPanel({
  run,
  lineItems,
  exporting,
  sendingAll,
  canSend,
  onExport,
  onDownloadAll,
  onEmailAll,
}) {
  const count = (status) => lineItems.filter((li) => li.payslipEmailStatus === status).length;
  const sent = count('sent');
  const failed = count('failed');
  const missing = lineItems.filter((li) => !li.employeeEmail).length;
  const tile = (icon, title, text, actions) => (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Iconify icon={icon} width={28} sx={{ color: 'text.secondary', mt: 0.25 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle2">{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {text}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap">
            {actions}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      {run.status === 'pending_approval' && (
        <Alert severity="info">The payroll must be approved before it is paid.</Alert>
      )}
      {tile(
        'mdi:bank-transfer',
        'Bank file (WPS)',
        ['processed', 'paid'].includes(run.status)
          ? 'Posted to bank.'
          : 'The salary file in the bank’s format: net pay, IBAN, basic, housing and other earnings per employee.',
        <Button
          size="small"
          variant="outlined"
          onClick={onExport}
          disabled={exporting || !lineItems.length}
          startIcon={<Iconify icon="mdi:microsoft-excel" />}
        >
          {exporting ? 'Exporting…' : 'Export bank file'}
        </Button>
      )}
      {tile(
        'mdi:file-document-multiple-outline',
        'Payslips',
        `${sent} of ${lineItems.length} emailed${failed ? `, ${failed} failed` : ''}${
          missing ? `, ${missing} without an email address` : ''
        }.${canSend ? '' : ' They can be emailed once the payroll is approved.'}`,
        <>
          <Button
            size="small"
            variant="outlined"
            onClick={onDownloadAll}
            startIcon={<Iconify icon="solar:download-bold" />}
          >
            Download all
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={onEmailAll}
            disabled={!canSend || sendingAll}
            startIcon={
              sendingAll ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <Iconify icon="mdi:email-fast-outline" />
              )
            }
          >
            {sendingAll ? 'Sending…' : sent ? 'Email again' : 'Email payslips'}
          </Button>
        </>
      )}
    </Stack>
  );
}

// ----------------------------------------------------------------------

function Row({ label, value, sub, strong, icon }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: 1.5,
        bgcolor: strong ? 'background.neutral' : 'background.paper',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        {icon && <Iconify icon={icon} width={22} sx={{ color: 'text.secondary' }} />}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant={strong ? 'subtitle2' : 'body2'}>{label}</Typography>
          {sub && (
            <Typography variant="caption" color="text.secondary">
              {sub}
            </Typography>
          )}
        </Box>
        <Typography variant={strong ? 'subtitle1' : 'body2'} sx={{ whiteSpace: 'nowrap' }}>
          {value}
        </Typography>
      </Stack>
    </Paper>
  );
}

/**
 * Review payroll: what the approver checks before approving: status, the
 * cost, every adjustment with its reason, salary records that changed since
 * generation, and the documents. Approve asks for confirmation with the
 * totals; Reject asks for the reason, which HR sees on the cycle.
 */
export function PayrollReviewDrawer({
  open,
  run,
  figures,
  changedCount,
  refreshing,
  approving,
  exporting,
  onRefresh,
  onExport,
  onDownloadAll,
  onShowAdjustments,
  onApprove,
  onReject,
  onClose,
}) {
  const [confirm, setConfirm] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const status = STATUS_LABEL[run.status] || STATUS_LABEL.draft;
  const pending = run.status === 'pending_approval';
  const adjustedPreview = figures.adjusted.slice(0, 4);

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { width: { xs: 1, sm: 480 }, display: 'flex' } }}
      >
        <Stack direction="row" alignItems="flex-start" sx={{ px: 3, pt: 3, pb: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">Review payroll</Typography>
            <Typography variant="body2" color="text.secondary">
              Check the figures below before approving {periodLabel(run)}.
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close">
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>

        <Stack spacing={3} sx={{ px: 3, pb: 3, flexGrow: 1, overflowY: 'auto' }}>
          <Stack spacing={1}>
            <Row
              label="Status"
              value={
                <Label variant="soft" color={status.color}>
                  {status.label}
                </Label>
              }
            />
            <Row label="Generated by" value={run.generatedBy || '—'} sub={day(run.createdAt)} />
          </Stack>

          {changedCount > 0 && pending && (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" size="small" onClick={onRefresh} disabled={refreshing}>
                  {refreshing ? 'Updating…' : 'Update'}
                </Button>
              }
            >
              {changedCount} employee{changedCount === 1 ? '’s' : 's’'} salary record
              {changedCount === 1 ? ' has' : 's have'} changed since this payroll was generated.
            </Alert>
          )}

          <Stack spacing={1}>
            <Typography variant="subtitle2">Payroll cost</Typography>
            <Row strong label="Total gross" value={sar(figures.gross)} />
            <Row
              icon="solar:users-group-rounded-bold-duotone"
              label="Net salaries"
              sub={`${figures.employees} employee${figures.employees === 1 ? '' : 's'}`}
              value={sar(figures.net)}
            />
            <Row
              icon="solar:bill-list-bold-duotone"
              label="Deductions"
              sub={[
                `GOSI ${money(figures.gosi)}`,
                figures.extra ? `extra ${money(figures.extra)}` : null,
                figures.lop ? `LOP ${money(figures.lop)}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              value={sar(figures.deductions)}
            />
          </Stack>

          <Stack spacing={1}>
            <Stack direction="row" alignItems="center">
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                Adjustments
              </Typography>
              {(figures.adjusted.length > 0 || figures.deducted.length > 0) && (
                <Button size="small" onClick={onShowAdjustments}>
                  View all
                </Button>
              )}
            </Stack>
            {figures.adjusted.length === 0 && figures.deducted.length === 0 ? (
              <Row
                icon="solar:check-circle-bold-duotone"
                label="None"
                sub="Everyone is paid the standard figures from their records"
                value=""
              />
            ) : (
              <>
                {figures.adjusted.length > 0 && (
                  <Row
                    icon="solar:pen-bold-duotone"
                    label="Allowances paid off-standard"
                    sub={`${figures.adjusted.length} employee${figures.adjusted.length === 1 ? '' : 's'}`}
                    value={signed(figures.adjustment)}
                  />
                )}
                {adjustedPreview.map((li) => (
                  <Box key={li.id} sx={{ pl: 2, borderLeft: 2, borderColor: 'warning.light' }}>
                    <Typography variant="body2">
                      {li.employeeName}{' '}
                      <Typography component="span" variant="body2" color="warning.main">
                        {signed(adjustmentTotal(li))}
                      </Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {li.earningsAdjustmentReason || 'No justification'}
                    </Typography>
                  </Box>
                ))}
                {figures.adjusted.length > adjustedPreview.length && (
                  <Typography variant="caption" color="text.secondary">
                    and {figures.adjusted.length - adjustedPreview.length} more
                  </Typography>
                )}
                {figures.deducted.length > 0 && (
                  <Row
                    icon="mdi:pencil-minus-outline"
                    label="Extra deductions"
                    sub={`${figures.deducted.length} employee${figures.deducted.length === 1 ? '' : 's'}`}
                    value={`−${money(figures.extra)}`}
                  />
                )}
              </>
            )}
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2">Documents</Typography>
            <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2">Bank file (WPS)</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Excel, one row per employee
                  </Typography>
                </Box>
                <Button size="small" variant="outlined" onClick={onExport} disabled={exporting}>
                  Download
                </Button>
              </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2">Payslips</Typography>
                  <Typography variant="caption" color="text.secondary">
                    PDF, one per employee
                  </Typography>
                </Box>
                <Button size="small" variant="outlined" onClick={onDownloadAll}>
                  Download all
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Stack>

        {pending && (
          <>
            <Divider />
            <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setRejecting(true)}
                disabled={approving}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                color="inherit"
                onClick={() => setConfirm(true)}
                disabled={approving}
              >
                Approve payroll
              </Button>
            </Stack>
          </>
        )}
      </Drawer>

      <Dialog open={confirm} onClose={() => setConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center' }}>Approve payroll?</DialogTitle>
        <DialogContent>
          <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
            Once approved, the payroll can be posted to the bank and the payslips emailed. It can no
            longer be changed.
          </Alert>
          <Stack spacing={1}>
            <Row strong label="Period" value={periodLabel(run)} />
            <Row label="Total employees" value={figures.employees} />
            <Row label="Total gross" value={sar(figures.gross)} />
            <Row label="Deductions" value={sar(figures.deductions)} />
            {figures.adjusted.length > 0 && (
              <Row
                label="Allowance adjustments"
                value={`${signed(figures.adjustment)} (${figures.adjusted.length})`}
              />
            )}
            <Row strong label="Net pay" value={sar(figures.net)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button fullWidth variant="outlined" onClick={() => setConfirm(false)}>
            No, go back
          </Button>
          <Button
            fullWidth
            variant="contained"
            color="inherit"
            disabled={approving}
            onClick={async () => {
              await onApprove();
              setConfirm(false);
            }}
          >
            {approving ? 'Approving…' : 'Yes, approve payroll'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejecting} onClose={() => setRejecting(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject payroll</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Say what needs fixing. HR sees it on the payroll, and generates it again once it is
            fixed.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            inputProps={{ maxLength: 1000 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setRejecting(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!reason.trim() || approving}
            onClick={async () => {
              await onReject(reason.trim());
              setRejecting(false);
              setReason('');
            }}
          >
            {approving ? 'Rejecting…' : 'Reject payroll'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
