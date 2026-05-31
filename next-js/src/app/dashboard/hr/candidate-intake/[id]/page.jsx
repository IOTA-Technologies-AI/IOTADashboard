'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { getCandidateIntakeSubmission } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { toast } from 'src/components/snackbar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
        <Typography variant="subtitle1" color="white" fontWeight={700}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ p: 3 }}>{children}</Box>
    </Card>
  );
}

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 220, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {String(value)}
      </Typography>
    </Stack>
  );
}

const AUDIT_ACTION_LABELS = {
  token_created: { label: 'Link Generated', color: 'primary', icon: 'eva:link-fill' },
  token_viewed: { label: 'Link Opened', color: 'info', icon: 'eva:eye-fill' },
  token_revoked: { label: 'Link Revoked', color: 'error', icon: 'eva:slash-fill' },
  otp_requested: { label: 'OTP Requested', color: 'warning', icon: 'eva:email-fill' },
  otp_verified: { label: 'OTP Verified', color: 'success', icon: 'eva:checkmark-circle-fill' },
  otp_failed: { label: 'OTP Failed', color: 'error', icon: 'eva:alert-triangle-fill' },
  form_submitted: { label: 'Form Submitted', color: 'success', icon: 'eva:checkmark-square-fill' },
  submission_viewed: { label: 'Submission Viewed', color: 'default', icon: 'eva:eye-outline' },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CandidateSubmissionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getCandidateIntakeSubmission(id)
      .then(setData)
      .catch((e) => toast.error(e?.message || 'Failed to load submission'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (!data) return null;

  const { submission: s, token: t, auditLog } = data;
  const numDeps = parseInt(s.numberOfDependents || 0, 10);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={s.candidateName}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Candidate Intake', href: paths.dashboard.hr.candidateIntake.root },
          { name: s.candidateName },
        ]}
        action={
          <Button
            variant="outlined"
            startIcon={<Iconify icon="eva:arrow-back-fill" />}
            onClick={() => router.push(paths.dashboard.hr.candidateIntake.root)}
          >
            Back to List
          </Button>
        }
        sx={{ mb: 3 }}
      />

      {/* Header summary */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="flex-start">
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" fontWeight={700}>
              {s.candidateName}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {s.candidateEmail}
            </Typography>
            {s.positionTitle && (
              <Typography variant="body2" color="primary.main" fontWeight={600} mt={0.5}>
                {s.positionTitle}
              </Typography>
            )}
          </Box>
          <Stack spacing={1} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
            <Chip
              label={s.jobType === 'new_joiner' ? 'New Joiner' : 'Interview Candidate'}
              color={s.jobType === 'new_joiner' ? 'primary' : 'info'}
            />
            <Chip
              label={s.status}
              color={
                s.status === 'submitted'
                  ? 'warning'
                  : s.status === 'reviewed'
                    ? 'success'
                    : 'default'
              }
            />
            {s.submittedAt && (
              <Typography variant="caption" color="text.secondary">
                Submitted {new Date(s.submittedAt).toLocaleString('en-GB')}
              </Typography>
            )}
          </Stack>
        </Stack>
      </Card>

      <Grid container spacing={3}>
        {/* Left column */}
        <Grid item xs={12} md={8}>
          <SectionCard title="Personal Details" icon="eva:person-fill">
            <InfoRow
              label="Full Name (English)"
              value={[s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ')}
            />
            <InfoRow label="Full Name (Arabic)" value={s.nameArabic} />
            <InfoRow label="Date of Birth" value={s.dateOfBirth} />
            <InfoRow label="Gender" value={s.gender} />
            <InfoRow label="Nationality" value={s.nationality} />
            <InfoRow label="Marital Status" value={s.maritalStatus} />
            <Divider sx={{ my: 1.5 }} />
            <InfoRow label="Phone" value={s.phone} />
            <InfoRow label="Alternate Phone" value={s.alternatePhone} />
            <InfoRow label="Personal Email" value={s.personalEmail} />
          </SectionCard>

          <SectionCard title="Residency & Documents" icon="eva:globe-fill">
            <InfoRow label="Country of Residence" value={s.countryOfResidence} />
            <InfoRow label="City" value={s.cityOfResidence} />
            <Divider sx={{ my: 1.5 }} />
            <InfoRow label="National ID" value={s.nationalId} />
            <InfoRow label="Iqama Number" value={s.iqamaNumber} />
            <InfoRow label="Iqama Expiry" value={s.iqamaExpiryDate} />
            <InfoRow label="Passport Number" value={s.passportNumber} />
            <InfoRow label="Passport Expiry" value={s.passportExpiryDate} />
            <InfoRow label="Visa Type" value={s.visaType} />
            <InfoRow label="Visa Expiry" value={s.visaExpiryDate} />
            <Divider sx={{ my: 1.5 }} />
            <InfoRow label="Current Employer" value={s.currentEmployer} />
            <InfoRow label="Notice Period" value={s.noticePeriod} />
          </SectionCard>

          <SectionCard title="Family & Dependents" icon="eva:people-fill">
            <InfoRow label="Spouse Name" value={s.spouseName} />
            <InfoRow label="Spouse Nationality" value={s.spouseNationality} />
            <InfoRow label="Spouse National ID" value={s.spouseNationalId} />
            <InfoRow label="Number of Dependents" value={numDeps} />
            {numDeps > 0 && Array.isArray(s.dependents) && (
              <Box mt={2}>
                {s.dependents.map((d, i) => (
                  <Card key={i} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={700} mb={1}>
                      Dependent {i + 1} — {d.relationship}
                    </Typography>
                    <InfoRow label="Name" value={d.name} />
                    <InfoRow label="Date of Birth" value={d.dateOfBirth} />
                    <InfoRow label="Nationality" value={d.nationality} />
                    <InfoRow label="Passport" value={d.passportNumber} />
                    <InfoRow label="National ID / Iqama" value={d.nationalIdOrIqama} />
                  </Card>
                ))}
              </Box>
            )}
          </SectionCard>

          <SectionCard title="Insurance" icon="eva:shield-fill">
            <InfoRow label="Preferred Insurance Class" value={s.insuranceClass} />
            <InfoRow label="Current Insurer" value={s.currentInsurer} />
            <InfoRow label="Current Policy Number" value={s.currentInsurancePolicyNumber} />
            <InfoRow label="Notes" value={s.insuranceNotes} />
          </SectionCard>

          <SectionCard title="Salary Expectations" icon="eva:bar-chart-fill">
            <InfoRow label="Currency" value={s.currencyCode} />
            <InfoRow
              label="Expected Basic Salary"
              value={
                s.expectedBasicSalary
                  ? `${s.currencyCode} ${Number(s.expectedBasicSalary).toLocaleString()}`
                  : undefined
              }
            />
            <InfoRow
              label="Housing Allowance"
              value={
                s.expectedHousingAllowance
                  ? `${s.currencyCode} ${Number(s.expectedHousingAllowance).toLocaleString()}`
                  : undefined
              }
            />
            <InfoRow
              label="Transport Allowance"
              value={
                s.expectedTransportAllowance
                  ? `${s.currencyCode} ${Number(s.expectedTransportAllowance).toLocaleString()}`
                  : undefined
              }
            />
            <InfoRow
              label="Other Allowances"
              value={
                s.expectedOtherAllowances
                  ? `${s.currencyCode} ${Number(s.expectedOtherAllowances).toLocaleString()}`
                  : undefined
              }
            />
            <Divider sx={{ my: 1.5 }} />
            <InfoRow
              label="Expected Total Package"
              value={
                s.expectedTotalPackage
                  ? `${s.currencyCode} ${Number(s.expectedTotalPackage).toLocaleString()}`
                  : undefined
              }
            />
            <InfoRow label="Desired Start Date" value={s.desiredStartDate} />
            <InfoRow label="Work Arrangement" value={s.workArrangement} />
            {s.additionalRemarks && (
              <Box mt={1.5}>
                <Typography variant="body2" color="text.secondary" mb={0.5}>
                  Additional Remarks
                </Typography>
                <Typography variant="body2">{s.additionalRemarks}</Typography>
              </Box>
            )}
          </SectionCard>
        </Grid>

        {/* Right column */}
        <Grid item xs={12} md={4}>
          {/* Token info */}
          <SectionCard title="Intake Link" icon="eva:link-fill">
            <InfoRow label="Candidate Email" value={t?.candidateEmail} />
            <InfoRow label="Created By" value={t?.createdBy} />
            <InfoRow
              label="Expires"
              value={t?.expiresAt ? new Date(t.expiresAt).toLocaleString('en-GB') : undefined}
            />
            <InfoRow
              label="Used At"
              value={t?.usedAt ? new Date(t.usedAt).toLocaleString('en-GB') : undefined}
            />
            {t?.notes && (
              <Box mt={1.5}>
                <Typography variant="caption" color="text.secondary">
                  Internal Notes
                </Typography>
                <Typography variant="body2">{t.notes}</Typography>
              </Box>
            )}
          </SectionCard>

          {/* Audit Timeline */}
          <SectionCard title="Audit Trail" icon="eva:activity-fill">
            {!auditLog || auditLog.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No audit events recorded.
              </Typography>
            ) : (
              <Timeline sx={{ p: 0, m: 0 }}>
                {auditLog.map((entry, i) => {
                  const meta = AUDIT_ACTION_LABELS[entry.action] || {
                    label: entry.action,
                    color: 'grey',
                  };
                  return (
                    <TimelineItem key={entry.id || i} sx={{ '&:before': { display: 'none' } }}>
                      <TimelineSeparator>
                        <TimelineDot color={meta.color} variant="outlined" sx={{ p: 0.5 }} />
                        {i < auditLog.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent sx={{ pb: 2 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {meta.label}
                        </Typography>
                        {entry.actorEmail && (
                          <Typography variant="caption" color="text.secondary">
                            {entry.actorEmail}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.disabled" display="block">
                          {new Date(entry.occurredAt).toLocaleString('en-GB')}
                        </Typography>
                        {entry.metadata?.reason && (
                          <Alert severity="warning" sx={{ mt: 0.5, py: 0 }}>
                            {entry.metadata.reason}
                          </Alert>
                        )}
                      </TimelineContent>
                    </TimelineItem>
                  );
                })}
              </Timeline>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
