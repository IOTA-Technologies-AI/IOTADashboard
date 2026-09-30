'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';
import { getEmployees } from 'src/utils/apiHelper';
import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';
import { getContract, updateContract, deleteContractLine } from 'src/actions/employee-billing';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { StageLabel } from '../stage-label';
import { ContractStatusLabel } from './contract-list-view';
import { ContractLineDialog } from '../contract-line-dialog';
import { periodLabel, portalLabel, SUBMISSION_CHANNELS } from '../utils/stages';

// ----------------------------------------------------------------------

function InfoRow({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 170, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {String(value)}
      </Typography>
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function ContractDetailsView({ id }) {
  const router = useRouter();
  const lineDialog = useBoolean();
  const confirmDelete = useBoolean();
  const [editingLine, setEditingLine] = useState(null);
  const [deletingLine, setDeletingLine] = useState(null);
  const [changingStatus, setChangingStatus] = useState(false);

  const { data, isLoading, mutate } = useSWR(id ? `employee-billing/contracts/${id}` : null, () =>
    getContract(id)
  );
  const { data: employees } = useSWR('employees/all', () => getEmployees(), {
    revalidateOnFocus: false,
  });
  const employeeList = useMemo(
    () => (Array.isArray(employees) ? employees : []).filter((e) => e?.id),
    [employees]
  );

  if (isLoading || !data) {
    return (
      <DashboardContent>
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
        </Stack>
      </DashboardContent>
    );
  }

  const { contract, lines = [], invoices = [] } = data;
  const currency = contract.currencyCode || 'SAR';
  const channel = contract.submissionChannel || 'email';
  // Contracts saved before the contact list existed still show their single contact
  const contacts =
    Array.isArray(contract.customerContacts) && contract.customerContacts.length
      ? contract.customerContacts
      : [
          (contract.customerContactName || contract.customerContactEmail) && {
            id: 'c1',
            name: contract.customerContactName,
            email: contract.customerContactEmail,
            role: 'approver',
            notify: true,
          },
          (contract.financeContactName || contract.financeContactEmail) && {
            id: 'f1',
            name: contract.financeContactName,
            email: contract.financeContactEmail,
            role: 'finance',
            notify: true,
          },
        ].filter(Boolean);
  const activeLines = lines.filter((l) => l.isActive);
  const monthlyTotal = activeLines.reduce(
    (s, l) => s + (Number(l.rateOverride ?? l.monthlyRate) || 0),
    0
  );
  const vat = (monthlyTotal * Number(contract.vatRate || 0)) / 100;
  const canAddLine = contract.contractType === 'managed_services' || lines.length === 0;

  const setStatus = async (status) => {
    setChangingStatus(true);
    try {
      await updateContract(contract.id, { status });
      toast.success(`Contract ${status}`);
      mutate();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Update failed');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleDeleteLine = async () => {
    if (!deletingLine) return;
    try {
      await deleteContractLine(contract.id, deletingLine.id);
      toast.success('Employee removed from contract');
      confirmDelete.onFalse();
      setDeletingLine(null);
      mutate();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Remove failed');
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={contract.contractNumber}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee Billing', href: paths.dashboard.hr.employeeBilling.root },
          { name: 'Contracts', href: paths.dashboard.hr.employeeBilling.contracts.root },
          { name: contract.contractNumber },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="eva:edit-fill" />}
              onClick={() =>
                router.push(paths.dashboard.hr.employeeBilling.contracts.edit(contract.id))
              }
            >
              Edit
            </Button>
            {!['active', 'renewal_due', 'ended'].includes(contract.status) && (
              <LoadingButton
                variant="contained"
                color="success"
                loading={changingStatus}
                disabled={!activeLines.length}
                onClick={() => setStatus('active')}
              >
                Activate
              </LoadingButton>
            )}
            {contract.status === 'active' && (
              <LoadingButton
                variant="outlined"
                color="warning"
                loading={changingStatus}
                onClick={() => setStatus('suspended')}
              >
                Suspend
              </LoadingButton>
            )}
            {contract.status !== 'ended' && (
              <LoadingButton
                variant="outlined"
                color="error"
                loading={changingStatus}
                onClick={() => setStatus('ended')}
              >
                End
              </LoadingButton>
            )}
          </Stack>
        }
        sx={{ mb: 3 }}
      />

      {contract.status !== 'active' && (
        <Alert severity={contract.status === 'draft' ? 'info' : 'warning'} sx={{ mb: 3 }}>
          This contract is <strong>{contract.status}</strong> and is skipped by the monthly run.
          {contract.status === 'draft' &&
            !activeLines.length &&
            ' Add at least one employee, then activate it.'}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {contract.title}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {contract.customerName}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Label variant="soft" color="primary">
                  {contract.contractType === 'managed_services'
                    ? 'Managed services'
                    : 'Single employee'}
                </Label>
                <ContractStatusLabel status={contract.status} />
              </Stack>
            </Stack>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow
                  label="Invoices submitted by"
                  value={
                    channel === 'portal'
                      ? `${portalLabel(contract.portalSystem)}${contract.portalAccountRef ? ` · supplier ${contract.portalAccountRef}` : ''}`
                      : SUBMISSION_CHANNELS[channel]
                  }
                />
                {channel === 'portal' && contract.portalUrl && (
                  <InfoRow label="Portal" value={contract.portalUrl} />
                )}
                {contacts.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No customer contacts on this contract.
                  </Typography>
                )}
                {contacts.map((c) => {
                  const actsFor = c.delegateFor
                    ? contacts.find((a) => a.id === c.delegateFor)
                    : null;
                  return (
                    <Stack key={c.id} sx={{ mb: 1.25 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="body2" fontWeight={600}>
                          {c.name || c.email}
                        </Typography>
                        <Label
                          variant="soft"
                          color={c.role === 'delegate' ? 'secondary' : 'default'}
                        >
                          {c.role}
                        </Label>
                        {c.notify === false ? (
                          <Label variant="soft" color="warning">
                            Do not disturb
                          </Label>
                        ) : (
                          <Label variant="soft" color="success">
                            Emails on
                          </Label>
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {[
                          c.title,
                          c.email,
                          c.role === 'delegate' &&
                            `acts for ${actsFor?.name || actsFor?.email || 'any approver'}${c.delegateUntil ? ` until ${fDate(c.delegateUntil)}` : ''}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Typography>
                    </Stack>
                  );
                })}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow
                  label="Issuing office"
                  value={`${contract.iotaOffice} · ${currency} · VAT ${contract.vatRate}%`}
                />
                <InfoRow
                  label="Requisition / PO"
                  value={contract.requisitionNumber || contract.poNumber}
                />
                <InfoRow label="Payment terms" value={`${contract.paymentTermsDays} days`} />
                <InfoRow label="Invoice day" value={contract.billingDay} />
                <InfoRow
                  label="Start"
                  value={contract.startDate ? fDate(contract.startDate) : ''}
                />
                <InfoRow label="End" value={contract.endDate ? fDate(contract.endDate) : ''} />
              </Grid>
            </Grid>
            <Card variant="outlined" sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle2" mb={1}>
                Proposal, SOW & renewal
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Proposal" value={contract.resourceCalculationId} />
                  <InfoRow label="SOW number" value={contract.sowNumber} />
                  <InfoRow
                    label="SOW received"
                    value={contract.sowReceivedDate ? fDate(contract.sowReceivedDate) : ''}
                  />
                  <InfoRow
                    label="Signed & returned"
                    value={contract.sowSignedDate ? fDate(contract.sowSignedDate) : ''}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow
                    label="Term"
                    value={contract.termMonths ? `${contract.termMonths} months` : ''}
                  />
                  <InfoRow
                    label="Renewal due"
                    value={contract.renewalDate ? fDate(contract.renewalDate) : ''}
                  />
                  <InfoRow
                    label="Renewed from"
                    value={
                      contract.renewedFromContractId
                        ? `Contract #${contract.renewedFromContractId}`
                        : ''
                    }
                  />
                  <Stack direction="row" spacing={1} sx={{ mb: 0.75 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ minWidth: 170, flexShrink: 0 }}
                    >
                      Signed SOW
                    </Typography>
                    {contract.sowDocumentUrl ? (
                      <Typography variant="body2" fontWeight={500}>
                        <a href={contract.sowDocumentUrl} target="_blank" rel="noreferrer">
                          {contract.sowDocumentName || 'Open document'}
                        </a>
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="warning.main">
                        Not attached — add it under Edit
                      </Typography>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </Card>
            {contract.notes && (
              <Typography variant="body2" color="text.secondary" mt={2}>
                {contract.notes}
              </Typography>
            )}
          </Card>

          <Card sx={{ mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2 }}>
              <Typography variant="h6">Employees & rate cards</Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<Iconify icon="eva:person-add-fill" />}
                disabled={!canAddLine}
                onClick={() => {
                  setEditingLine(null);
                  lineDialog.onTrue();
                }}
              >
                Add employee
              </Button>
            </Stack>
            {!canAddLine && (
              <Alert severity="info" sx={{ mx: 2, mb: 2 }}>
                A single-employee contract holds one employee. Switch the type to Managed services
                to bundle more.
              </Alert>
            )}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell align="right">Salary</TableCell>
                  <TableCell align="right">GOSI</TableCell>
                  <TableCell align="right">Monthly rate</TableCell>
                  <TableCell>Window</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ py: 2, textAlign: 'center' }}
                      >
                        No employees yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {lines.map((l) => {
                  const gosi = (l.lineItems || []).find((it) => it.code === 'gosi');
                  return (
                    <TableRow key={l.id} sx={{ opacity: l.isActive ? 1 : 0.55 }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {l.employeeName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {[
                            l.employeeCode,
                            l.designation,
                            l.nationality,
                            l.familyStatus ? `family +${l.dependentsCount}` : 'single',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {fCurrency(l.baseSalary, { currencyCode: currency })}
                      </TableCell>
                      <TableCell align="right">
                        {gosi ? fCurrency(gosi.monthly, { currencyCode: currency }) : '—'}
                        <Typography variant="caption" color="text.secondary" display="block">
                          {(Number(l.gosiRate) * 100).toFixed(2)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <strong>
                          {fCurrency(l.rateOverride ?? l.monthlyRate, { currencyCode: currency })}
                        </strong>
                        {l.rateOverride != null && (
                          <Typography variant="caption" color="warning.main" display="block">
                            override (card {fCurrency(l.monthlyRate, { currencyCode: currency })})
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {fDate(l.startDate)} → {l.endDate ? fDate(l.endDate) : 'open'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Label variant="soft" color={l.isActive ? 'success' : 'default'}>
                          {l.isActive ? 'Active' : 'Inactive'}
                        </Label>
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingLine(l);
                            lineDialog.onTrue();
                          }}
                        >
                          <Iconify icon="eva:edit-fill" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setDeletingLine(l);
                            confirmDelete.onTrue();
                          }}
                        >
                          <Iconify icon="eva:trash-2-outline" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {lines.length > 0 && (
                  <>
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        Monthly total (ex-VAT), {activeLines.length} active
                      </TableCell>
                      <TableCell align="right">
                        <strong>{fCurrency(monthlyTotal, { currencyCode: currency })}</strong>
                      </TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        VAT {contract.vatRate}%
                      </TableCell>
                      <TableCell align="right">
                        {fCurrency(vat, { currencyCode: currency })}
                      </TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        <strong>Monthly invoice</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{fCurrency(monthlyTotal + vat, { currencyCode: currency })}</strong>
                      </TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2 }}>
              <Typography variant="h6">Invoices</Typography>
              <Button
                size="small"
                onClick={() => router.push(paths.dashboard.hr.employeeBilling.root)}
              >
                Collections
              </Button>
            </Stack>
            {invoices.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
                Nothing raised yet. Use “Generate Monthly Invoices” on the Collections page.
              </Typography>
            ) : (
              <Table size="small">
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow
                      key={inv.invoiceId}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(paths.dashboard.invoice.details(inv.invoiceId))}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {periodLabel(inv.period)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {inv.invoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {fCurrency(inv.total, { currencyCode: inv.currencyCode })}
                      </TableCell>
                      <TableCell align="right">
                        <StageLabel stage={inv.effectiveStage} short />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </Grid>
      </Grid>

      <ContractLineDialog
        open={lineDialog.value}
        onClose={lineDialog.onFalse}
        contract={contract}
        line={editingLine}
        employees={employeeList}
        onSaved={() => mutate()}
      />

      <ConfirmDialog
        open={confirmDelete.value}
        onClose={confirmDelete.onFalse}
        title="Remove employee from contract?"
        content={`${deletingLine?.employeeName || 'This employee'} will no longer be billed from the next run. Invoices already raised are unaffected.`}
        action={
          <Button variant="contained" color="error" onClick={handleDeleteLine}>
            Remove
          </Button>
        }
      />
    </DashboardContent>
  );
}
