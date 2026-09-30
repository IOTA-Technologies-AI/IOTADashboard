'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Timeline from '@mui/lab/Timeline';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TimelineDot from '@mui/lab/TimelineDot';
import TextField from '@mui/material/TextField';
import TimelineItem from '@mui/lab/TimelineItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import TimelineContent from '@mui/lab/TimelineContent';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fDate, fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  getOnboardingSubmission,
  applyOnboardingSubmission,
} from 'src/actions/employee-onboarding';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

const AUDIT_LABELS = {
  token_created: { label: 'Link sent', color: 'primary' },
  token_viewed: { label: 'Link opened', color: 'grey' },
  token_revoked: { label: 'Link revoked', color: 'error' },
  otp_requested: { label: 'Code requested', color: 'info' },
  otp_verified: { label: 'Identity verified', color: 'success' },
  otp_failed: { label: 'Code failed', color: 'warning' },
  form_submitted: { label: 'Form submitted', color: 'success' },
  submission_viewed: { label: 'Viewed by HR', color: 'grey' },
  submission_applied: { label: 'Applied to employee record', color: 'success' },
};

function SectionCard({ title, icon, children }) {
  return (
    <Card sx={{ mb: 3 }}>
      <Box
        sx={{
          px: 3,
          py: 2,
          bgcolor: 'primary.darker',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {icon && <Iconify icon={icon} sx={{ color: 'white' }} />}
        <Typography variant="subtitle1" sx={{ color: 'white' }} fontWeight={700}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ p: 3 }}>{children}</Box>
    </Card>
  );
}

function InfoRow({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  const shown = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 220, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {shown}
      </Typography>
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function OnboardingDetailsView({ id }) {
  const router = useRouter();
  const confirm = useBoolean();
  const createDialog = useBoolean();
  const [applying, setApplying] = useState(false);
  // What only HR knows about a new joiner, needed to create the employee record
  const [newEmployee, setNewEmployee] = useState({
    employeeCode: '',
    employeeType: 'Permanent',
    joiningDate: '',
    designation: '',
    department: '',
    currencyCode: 'SAR',
    workEmail: '',
  });
  const setNewField = (key) => (e) =>
    setNewEmployee((prev) => ({ ...prev, [key]: e.target.value }));

  const { data, isLoading, mutate } = useSWR(id ? `employee-onboarding/${id}` : null, () =>
    getOnboardingSubmission(id)
  );

  const handleApply = async (payload = {}) => {
    setApplying(true);
    try {
      const res = await applyOnboardingSubmission(id, payload);
      toast.success(
        res.created
          ? 'Employee record created from the onboarding form'
          : `Applied ${res.appliedFields?.length || 0} fields to the employee record`
      );
      confirm.onFalse();
      createDialog.onFalse();
      mutate();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to apply submission');
    } finally {
      setApplying(false);
    }
  };

  if (isLoading || !data) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  const { submission: s, token: t, auditLog = [] } = data;
  const deps = Array.isArray(s.dependents) ? s.dependents : [];
  const fullName =
    [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ') || s.employeeName;
  const isApplied = s.status === 'applied';
  // A new joiner has no HR record until this submission is accepted
  const isNewJoiner = !s.employeeId;

  const openApply = () => {
    if (!isNewJoiner) {
      confirm.onTrue();
      return;
    }
    setNewEmployee((prev) => ({
      ...prev,
      joiningDate: prev.joiningDate || (t?.joiningDate ? String(t.joiningDate).slice(0, 10) : ''),
      designation: prev.designation || t?.designation || '',
      department: prev.department || t?.department || '',
    }));
    createDialog.onTrue();
  };

  const handleCreateEmployee = () => {
    if (!newEmployee.employeeCode.trim() || !newEmployee.joiningDate) {
      toast.error('Employee code and joining date are required.');
      return;
    }
    handleApply({
      employeeCode: newEmployee.employeeCode.trim(),
      employeeType: newEmployee.employeeType,
      joiningDate: newEmployee.joiningDate,
      currencyCode: newEmployee.currencyCode,
      ...(newEmployee.designation ? { designation: newEmployee.designation.trim() } : {}),
      ...(newEmployee.department ? { department: newEmployee.department.trim() } : {}),
      ...(newEmployee.workEmail ? { workEmail: newEmployee.workEmail.trim() } : {}),
    });
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={fullName}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employee Onboarding', href: paths.dashboard.hr.employeeOnboarding.root },
          { name: fullName },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            {!isNewJoiner && (
              <Button
                variant="outlined"
                startIcon={<Iconify icon="eva:person-fill" />}
                onClick={() => router.push(paths.dashboard.hr.employee.edit(s.employeeId))}
              >
                Employee Record
              </Button>
            )}
            {!isApplied && (
              <Button
                variant="contained"
                color="success"
                startIcon={
                  <Iconify
                    icon={isNewJoiner ? 'eva:person-add-fill' : 'eva:checkmark-circle-2-fill'}
                  />
                }
                onClick={openApply}
              >
                {isNewJoiner ? 'Create Employee Record' : 'Apply to Employee Record'}
              </Button>
            )}
          </Stack>
        }
        sx={{ mb: 3 }}
      />

      {isApplied ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          Applied to the employee record by {s.appliedBy} on {fDateTime(s.appliedAt)}.
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Submitted {fDateTime(s.submittedAt)} — not yet applied.{' '}
          {isNewJoiner
            ? 'This is a new joiner with no HR record yet. Review the details, then create the employee record from them; the company email can be added afterwards.'
            : 'Review the details below, then apply them so payroll, GOSI, insurance and billing use the confirmed data.'}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <SectionCard title="Employee" icon="eva:briefcase-fill">
            <InfoRow
              label="HR record"
              value={isNewJoiner ? 'New joiner — not created yet' : s.employeeCode}
            />
            <InfoRow label="Link sent to" value={s.employeeEmail} />
            <InfoRow label="Designation" value={t?.designation} />
            <InfoRow label="Department" value={t?.department} />
            <InfoRow label="Joining date" value={t?.joiningDate ? fDate(t.joiningDate) : ''} />
            <InfoRow label="Submission status" value={s.status} />
          </SectionCard>

          <SectionCard title="Personal Details" icon="eva:person-fill">
            <InfoRow label="Full name" value={fullName} />
            <InfoRow label="Name (Arabic)" value={s.nameArabic} />
            <InfoRow label="Date of birth" value={s.dateOfBirth ? fDate(s.dateOfBirth) : ''} />
            <InfoRow label="Gender" value={s.gender} />
            <InfoRow label="Marital status" value={s.maritalStatus} />
            <InfoRow label="Nationality" value={s.nationality} />
            <InfoRow label="Religion" value={s.religion} />
            <InfoRow label="Blood group" value={s.bloodGroup} />
            <InfoRow label="Highest qualification" value={s.highestQualification} />
            <InfoRow label="Specialization" value={s.specialization} />
          </SectionCard>

          <SectionCard title="Contact & Emergency" icon="eva:phone-fill">
            <InfoRow label="Mobile" value={s.phone} />
            <InfoRow label="Alternate phone" value={s.alternatePhone} />
            <InfoRow label="Personal email" value={s.personalEmail} />
            <InfoRow label="Current address" value={s.currentAddress} />
            <InfoRow label="Permanent address" value={s.permanentAddress} />
            <InfoRow label="City" value={s.cityOfResidence} />
            <InfoRow label="Country" value={s.countryOfResidence} />
            <InfoRow label="Emergency contact" value={s.emergencyContactName} />
            <InfoRow label="Relationship" value={s.emergencyContactRelationship} />
            <InfoRow label="Emergency phone" value={s.emergencyContactPhone} />
          </SectionCard>

          <SectionCard title="Identity Documents" icon="eva:file-text-fill">
            <InfoRow label="National ID" value={s.nationalId} />
            <InfoRow label="Iqama number" value={s.iqamaNumber} />
            <InfoRow label="Iqama issue" value={s.iqamaIssueDate ? fDate(s.iqamaIssueDate) : ''} />
            <InfoRow
              label="Iqama expiry"
              value={s.iqamaExpiryDate ? fDate(s.iqamaExpiryDate) : ''}
            />
            <InfoRow label="Passport number" value={s.passportNumber} />
            <InfoRow
              label="Passport issue"
              value={s.passportIssueDate ? fDate(s.passportIssueDate) : ''}
            />
            <InfoRow
              label="Passport expiry"
              value={s.passportExpiryDate ? fDate(s.passportExpiryDate) : ''}
            />
            <InfoRow label="Visa type" value={s.visaType} />
            <InfoRow label="Visa number" value={s.visaNumber} />
            <InfoRow label="Visa expiry" value={s.visaExpiryDate ? fDate(s.visaExpiryDate) : ''} />
          </SectionCard>

          <SectionCard title="Family & Dependants" icon="eva:people-fill">
            <InfoRow label="Spouse name" value={s.spouseName} />
            <InfoRow label="Spouse nationality" value={s.spouseNationality} />
            <InfoRow label="Spouse ID / Iqama" value={s.spouseNationalId} />
            <InfoRow
              label="Spouse date of birth"
              value={s.spouseDateOfBirth ? fDate(s.spouseDateOfBirth) : ''}
            />
            <InfoRow label="Number of dependants" value={deps.length} />
            {deps.map((d, i) => (
              <Box key={i} sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'divider', mt: 1.5 }}>
                <Typography variant="body2" fontWeight={600} mb={0.5}>
                  Dependant {i + 1}
                </Typography>
                <InfoRow label="Name" value={d.name} />
                <InfoRow label="Relationship" value={d.relationship} />
                <InfoRow label="Date of birth" value={d.dateOfBirth ? fDate(d.dateOfBirth) : ''} />
                <InfoRow label="Nationality" value={d.nationality} />
                <InfoRow label="Passport" value={d.passportNumber} />
                <InfoRow label="ID / Iqama" value={d.nationalIdOrIqama} />
                <InfoRow label="In insurance" value={d.includeInInsurance !== false} />
              </Box>
            ))}
          </SectionCard>

          <SectionCard title="Bank & GOSI" icon="eva:credit-card-fill">
            <InfoRow label="Bank" value={s.bankName} />
            <InfoRow label="Account number" value={s.bankAccountNumber} />
            <InfoRow label="IBAN" value={s.iban} />
            <InfoRow label="GOSI number" value={s.gosiNumber} />
            <InfoRow
              label="Previously registered with GOSI"
              value={!!s.previouslyRegisteredWithGosi}
            />
          </SectionCard>

          <SectionCard title="Insurance" icon="eva:shield-fill">
            <InfoRow label="Preferred class" value={s.insuranceClass} />
            <InfoRow label="Cover dependants" value={!!s.includeDependentsInInsurance} />
            <InfoRow label="Current insurer" value={s.currentInsurer} />
            <InfoRow label="Current policy" value={s.currentInsurancePolicyNumber} />
            <InfoRow label="Notes" value={s.insuranceNotes} />
          </SectionCard>

          {(s.additionalRemarks || s.declarationAcceptedAt) && (
            <SectionCard title="Declaration & Remarks" icon="eva:edit-2-fill">
              <InfoRow
                label="Declaration accepted"
                value={s.declarationAcceptedAt ? fDateTime(s.declarationAcceptedAt) : ''}
              />
              <InfoRow label="Remarks" value={s.additionalRemarks} />
            </SectionCard>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Onboarding Link
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Label variant="soft" color={t?.status === 'used' ? 'success' : 'default'}>
                  {t?.status}
                </Label>
              </Stack>
              <InfoRow label="Sent by" value={t?.createdBy} />
              <InfoRow label="Sent on" value={t?.createdAt ? fDateTime(t.createdAt) : ''} />
              <InfoRow label="Used on" value={t?.usedAt ? fDateTime(t.usedAt) : ''} />
              <InfoRow label="HR notes" value={t?.notes} />
            </Stack>
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              Activity
            </Typography>
            <Timeline
              sx={{ p: 0, m: 0, '& .MuiTimelineItem-root:before': { flex: 0, padding: 0 } }}
            >
              {auditLog.map((entry, idx) => {
                const meta = AUDIT_LABELS[entry.action] || { label: entry.action, color: 'grey' };
                return (
                  <TimelineItem key={entry.id || idx}>
                    <TimelineSeparator>
                      <TimelineDot color={meta.color} />
                      {idx < auditLog.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant="body2" fontWeight={600}>
                        {meta.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {fDateTime(entry.occurredAt)}
                        {entry.actorEmail ? ` · ${entry.actorEmail}` : ''}
                        {entry.metadata?.reason ? ` · ${entry.metadata.reason}` : ''}
                      </Typography>
                    </TimelineContent>
                  </TimelineItem>
                );
              })}
            </Timeline>
          </Card>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Apply to employee record?"
        content="The confirmed details (personal, contact, documents, family and dependants, bank, GOSI, insurance) will overwrite the matching fields on the employee record. Empty answers are left untouched."
        action={
          <LoadingButton
            variant="contained"
            color="success"
            loading={applying}
            onClick={() => handleApply()}
          >
            Apply
          </LoadingButton>
        }
      />

      <Dialog
        open={createDialog.value}
        onClose={applying ? undefined : createDialog.onFalse}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create employee record</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              <strong>{fullName}</strong> has no HR record yet. It is created now from the
              onboarding form, with the employment details below. The personal email is kept on the
              record; leave the work email blank until the company mailbox exists.
            </Alert>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Employee code *"
                value={newEmployee.employeeCode}
                onChange={setNewField('employeeCode')}
              />
              <TextField
                fullWidth
                select
                label="Employee type"
                value={newEmployee.employeeType}
                onChange={setNewField('employeeType')}
              >
                <MenuItem value="Permanent">Permanent</MenuItem>
                <MenuItem value="Temporary">Temporary</MenuItem>
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Joining date *"
                type="date"
                value={newEmployee.joiningDate}
                onChange={setNewField('joiningDate')}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                select
                label="Salary currency"
                value={newEmployee.currencyCode}
                onChange={setNewField('currencyCode')}
              >
                {['SAR', 'AED', 'INR', 'GBP', 'USD'].map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Designation"
                value={newEmployee.designation}
                onChange={setNewField('designation')}
              />
              <TextField
                fullWidth
                label="Department"
                value={newEmployee.department}
                onChange={setNewField('department')}
              />
            </Stack>
            <TextField
              label="Work email (optional)"
              type="email"
              value={newEmployee.workEmail}
              onChange={setNewField('workEmail')}
              helperText={`Personal email on record: ${s.personalEmail || s.employeeEmail || '—'}. Add the company address here later from HR > Employees.`}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={createDialog.onFalse} disabled={applying}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            color="success"
            loading={applying}
            onClick={handleCreateEmployee}
          >
            Create employee
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
