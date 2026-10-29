'use client';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import TablePagination from '@mui/material/TablePagination';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { num, sar, isAdjusted, problemsOf, adjustmentOf, recalculateRow } from './payroll-pay';

// ----------------------------------------------------------------------

const money = (value) =>
  num(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const signed = (value) => `${value > 0 ? '+' : '−'}${money(Math.abs(value))}`;

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'adjusted', label: 'Adjusted' },
];

/**
 * The payroll being prepared, one compact row per employee: days, earnings,
 * the allowance adjustment, deductions and net pay. Everything else, and all
 * the editing, is in the side panel a row opens, with "Save & next" to move
 * through the employees without going back to the table.
 */
export function PayrollReview({ rows, onRowChange }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [openId, setOpenId] = useState(null);

  const counts = useMemo(
    () => ({
      all: rows.length,
      attention: rows.filter((r) => problemsOf(r).length).length,
      adjusted: rows.filter(isAdjusted).length,
    }),
    [rows]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'attention' && !problemsOf(r).length) return false;
      if (filter === 'adjusted' && !isAdjusted(r)) return false;
      if (!q) return true;
      return [r.fullName, r.employeeId, r.department].some((v) =>
        String(v || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }, [rows, filter, search]);

  useEffect(() => setPage(0), [filter, search]);

  const openIndex = visible.findIndex((r) => r.id === openId);
  const openRow = rows.find((r) => r.id === openId) || null;

  return (
    <>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ md: 'center' }}
        sx={{ px: 2.5, pb: 1 }}
      >
        <Tabs value={filter} onChange={(_, v) => setFilter(v)} sx={{ flexGrow: 1 }}>
          {FILTERS.map((f) => (
            <Tab
              key={f.value}
              value={f.value}
              iconPosition="end"
              label={f.label}
              icon={
                <Label
                  variant={f.value === filter ? 'filled' : 'soft'}
                  color={
                    f.value === 'attention' && counts.attention
                      ? 'error'
                      : f.value === 'adjusted' && counts.adjusted
                        ? 'warning'
                        : 'default'
                  }
                >
                  {counts[f.value]}
                </Label>
              }
            />
          ))}
        </Tabs>
        <TextField
          size="small"
          placeholder="Search name, ID or department"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: 1, md: 280 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      <Table size="small" sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '28%' }}>Employee</TableCell>
            <TableCell sx={{ width: '12%' }}>Days</TableCell>
            <TableCell align="right">Earnings</TableCell>
            <TableCell align="right">Adjustment</TableCell>
            <TableCell align="right">Deductions</TableCell>
            <TableCell align="right">Net Pay</TableCell>
            <TableCell sx={{ width: 150 }}>Status</TableCell>
            <TableCell sx={{ width: 48 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {visible.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
            const problems = problemsOf(row);
            const adjustment = adjustmentOf(row);
            return (
              <TableRow
                key={row.id}
                hover
                selected={row.id === openId}
                onClick={() => setOpenId(row.id)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Typography variant="subtitle2" noWrap>
                    {row.fullName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="div">
                    {[row.employeeId, row.department].filter(Boolean).join(' · ')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {row.eligibleWorkingDays}/{row.totalWorkingDays}
                  </Typography>
                  {(row.lop > 0 || row.partMonth) && (
                    <Typography variant="caption" color="warning.main" component="div" noWrap>
                      {row.lop > 0 ? `${row.lop}d unpaid` : 'Joined mid-month'}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">{money(row.grossSalary)}</TableCell>
                <TableCell align="right">
                  {adjustment ? (
                    <>
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
                        {money(row.grossSalary - adjustment)}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.disabled">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={row.deductions > 0 ? 'error.main' : 'inherit'}>
                    {row.deductions > 0 ? `−${money(row.deductions)}` : '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="subtitle2" color="success.main">
                    {money(row.netSalary)}
                  </Typography>
                </TableCell>
                <TableCell>
                  {problems.length ? (
                    <Label variant="soft" color="error">
                      {problems.length === 1 ? 'Needs attention' : `${problems.length} to fix`}
                    </Label>
                  ) : isAdjusted(row) || row.manualDeductionAmount > 0 ? (
                    <Label variant="soft" color="warning">
                      Adjusted
                    </Label>
                  ) : (
                    <Label variant="soft" color="success">
                      Ready
                    </Label>
                  )}
                </TableCell>
                <TableCell padding="none">
                  <Iconify icon="eva:arrow-ios-forward-fill" sx={{ color: 'text.disabled' }} />
                </TableCell>
              </TableRow>
            );
          })}
          {!visible.length && (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                {filter === 'attention' ? 'Nothing needs attention.' : 'No employees match.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <TablePagination
        component="div"
        count={visible.length}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(Number(e.target.value));
          setPage(0);
        }}
      />

      <PayrollLineDrawer
        row={openRow}
        position={openIndex >= 0 ? `${openIndex + 1} of ${visible.length}` : ''}
        hasNext={openIndex >= 0 && openIndex < visible.length - 1}
        hasPrevious={openIndex > 0}
        onClose={() => setOpenId(null)}
        onSave={(next, move) => {
          onRowChange(recalculateRow(next));
          if (move === 'next') setOpenId(visible[openIndex + 1]?.id ?? null);
          else if (move === 'previous') setOpenId(visible[openIndex - 1]?.id ?? null);
          else setOpenId(null);
        }}
      />
    </>
  );
}

// ----------------------------------------------------------------------

function Line({ label, value, hint, color, strong }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
      <Box>
        <Typography variant={strong ? 'subtitle2' : 'body2'} color={color || 'text.secondary'}>
          {label}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.disabled">
            {hint}
          </Typography>
        )}
      </Box>
      <Typography variant={strong ? 'subtitle1' : 'body2'} color={color}>
        {value}
      </Typography>
    </Stack>
  );
}

function Section({ title, children }) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="overline" color="text.secondary">
        {title}
      </Typography>
      {children}
    </Stack>
  );
}

/**
 * One employee's pay, with the editable parts: the transport and other
 * allowance (a justification when they differ from the record) and an extra
 * deduction with its reason. Basic and housing come from the record.
 */
function PayrollLineDrawer({ row, position, hasNext, hasPrevious, onClose, onSave }) {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    setDraft(
      row
        ? {
            ...row,
            transportAllowance: String(row.transportAllowance ?? 0),
            otherAllowances: String(row.otherAllowances ?? 0),
            manualDeductionAmount: row.manualDeductionAmount
              ? String(row.manualDeductionAmount)
              : '',
          }
        : null
    );
  }, [row]);

  if (!row || !draft) return <Drawer anchor="right" open={false} onClose={onClose} />;

  const preview = recalculateRow(draft);
  const problems = problemsOf(preview);
  const adjusted = isAdjusted(preview);
  const invalid =
    problems.length > 0 ||
    [draft.transportAllowance, draft.otherAllowances, draft.manualDeductionAmount].some(
      (v) => Number(v) < 0
    );
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const allowance = (key, standardKey, label) => {
    const diff = num(draft[key]) - num(row[standardKey]);
    return (
      <TextField
        label={label}
        type="number"
        size="small"
        value={draft[key]}
        onChange={(e) => set({ [key]: e.target.value })}
        error={Number(draft[key]) < 0}
        helperText={
          diff
            ? `Standard ${sar(row[standardKey])} · ${signed(diff)}`
            : `Standard ${sar(row[standardKey])}`
        }
        InputProps={{
          startAdornment: <InputAdornment position="start">SAR</InputAdornment>,
          inputProps: { min: 0 },
        }}
      />
    );
  };

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: 1, sm: 460 }, display: 'flex' } }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2.5, py: 2 }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {row.fullName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {[row.employeeId, row.designation, row.department].filter(Boolean).join(' · ')}
          </Typography>
        </Box>
        {position && (
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {position}
          </Typography>
        )}
        <IconButton onClick={onClose} aria-label="Close">
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Stack>
      <Divider />

      <Stack spacing={3} sx={{ p: 2.5, flexGrow: 1, overflowY: 'auto' }}>
        <Section title="Attendance">
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
            <Stack spacing={0.75}>
              <Line
                label="Eligible working days"
                value={`${row.eligibleWorkingDays} of ${row.totalWorkingDays}`}
              />
              <Line label="Days worked" value={row.actualDaysWorked} />
              <Line label="Paid leave" value={`${row.paidLeaves || 0} days`} />
              <Line
                label="Unpaid leave"
                value={`${row.unpaidLeaves || 0} days`}
                color={row.unpaidLeaves > 0 ? 'warning.main' : undefined}
              />
              <Line label="Leave balance" value={`${row.leaveBalance ?? '—'} days`} />
            </Stack>
          </Paper>
          {(row.lop > 0 || row.partMonth) && (
            <Alert severity="warning" variant="outlined">
              {row.partMonth ? 'Joined part-way through the month' : null}
              {row.partMonth && row.lop > 0 ? ' and ' : null}
              {row.lop > 0
                ? `${row.partMonth ? 'took' : 'Took'} ${row.lop} days unpaid leave`
                : null}
              . Pay is not reduced automatically: add an extra deduction below if it should be.
            </Alert>
          )}
        </Section>

        <Section title="Earnings">
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
            <Stack spacing={0.75}>
              <Line label="Basic Salary" value={sar(row.basicSalary)} />
              <Line label="Housing Allowance" value={sar(row.housingAllowance)} />
              <Typography variant="caption" color="text.disabled">
                From the employee record; change them on the profile.
              </Typography>
            </Stack>
          </Paper>
          {allowance('transportAllowance', 'standardTransportAllowance', 'Transport Allowance')}
          {allowance('otherAllowances', 'standardOtherAllowances', 'Other Allowances')}
          <TextField
            label="Justification"
            size="small"
            multiline
            minRows={2}
            value={draft.earningsAdjustmentReason || ''}
            onChange={(e) => set({ earningsAdjustmentReason: e.target.value })}
            disabled={!adjusted}
            error={adjusted && !String(draft.earningsAdjustmentReason || '').trim()}
            placeholder="e.g. Site allowance for the client deployment"
            helperText={
              adjusted
                ? 'Required: the approver sees it next to the standard figure.'
                : 'Needed only when an allowance differs from the standard.'
            }
            inputProps={{ maxLength: 500 }}
          />
        </Section>

        <Section title="Deductions">
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
            <Line
              label="GOSI"
              hint="Held on the employee record"
              value={row.gosiDeduction > 0 ? `−${money(row.gosiDeduction)}` : '—'}
            />
          </Paper>
          <Stack direction="row" spacing={1.5}>
            <TextField
              label="Extra deduction"
              type="number"
              size="small"
              value={draft.manualDeductionAmount}
              onChange={(e) => set({ manualDeductionAmount: e.target.value })}
              error={Number(draft.manualDeductionAmount) < 0}
              sx={{ width: 180, flexShrink: 0 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">SAR</InputAdornment>,
                inputProps: { min: 0 },
              }}
            />
            <TextField
              label="Reason"
              size="small"
              fullWidth
              value={draft.manualDeductionRemarks || ''}
              onChange={(e) => set({ manualDeductionRemarks: e.target.value })}
              error={num(draft.manualDeductionAmount) > 0 && !draft.manualDeductionRemarks?.trim()}
              helperText="Printed on the payslip"
              inputProps={{ maxLength: 120 }}
            />
          </Stack>
        </Section>
      </Stack>

      <Divider />
      <Stack spacing={1} sx={{ px: 2.5, py: 2, bgcolor: 'background.neutral' }}>
        <Line label="Gross" value={sar(preview.grossSalary)} />
        <Line label="Deductions" value={`− ${sar(preview.deductions)}`} />
        <Line
          strong
          label="Net Pay"
          value={sar(preview.netSalary)}
          color={preview.netSalary < 0 ? 'error.main' : 'success.main'}
        />
        {problems.length > 0 && (
          <Typography variant="caption" color="error">
            {problems.join(' · ')}
          </Typography>
        )}
        <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
          <Button
            variant="outlined"
            disabled={!hasPrevious || invalid}
            onClick={() => onSave(draft, 'previous')}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          >
            Previous
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" disabled={invalid} onClick={() => onSave(draft, 'close')}>
            Save
          </Button>
          <Button
            variant="contained"
            disabled={!hasNext || invalid}
            onClick={() => onSave(draft, 'next')}
            endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
          >
            Save & next
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
