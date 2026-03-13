'use client';

import { use, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useAuthContext } from 'src/auth/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { getOffer, approveOffer, rejectOffer, commentOnOffer } from 'src/utils/apiHelper';

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  draft: 'default',
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'error',
};

const STAGE_LABEL = {
  manager: 'Manager',
  admin: 'Admin',
  superAdmin: 'Super Admin',
};

const APPROVAL_CHAIN = ['manager', 'admin', 'superAdmin'];

function DetailRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 180 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} textAlign="right">
        {value ?? '—'}
      </Typography>
    </Box>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function OfferManagementDetailsPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthContext();

  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog state
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);

  const [approveComment, setApproveComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [reviewComment, setReviewComment] = useState('');

  const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'superAdmin';

  // User can act only when the offer is pending and it's their role's turn in the chain
  const canAct =
    offer?.status === 'pending_approval' &&
    offer?.currentApprovalStage &&
    offer.currentApprovalStage === user?.role;

  // Fetch offer
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getOffer(id);
        setOffer(data);
      } catch (err) {
        console.error('Failed to fetch offer:', err);
        toast.error('Failed to load offer');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleApprove = useCallback(async () => {
    try {
      setActionLoading(true);
      const updated = await approveOffer(id, user?.displayName || user?.email, approveComment);
      setOffer(updated);
      setApproveOpen(false);
      setApproveComment('');
      const stage = offer?.currentApprovalStage;
      if (stage === 'superAdmin') {
        toast.success('Offer fully approved! Offer letter has been sent to the candidate.');
      } else if (stage === 'admin') {
        toast.success('Approved! Forwarded to Super Admin for final approval.');
      } else {
        toast.success('Approved! Forwarded to Admin for next review.');
      }
    } catch (err) {
      toast.error('Failed to approve offer');
    } finally {
      setActionLoading(false);
    }
  }, [id, user, approveComment, offer?.currentApprovalStage]);

  const handleReject = useCallback(async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      setActionLoading(true);
      const updated = await rejectOffer(id, user?.displayName || user?.email, rejectReason);
      setOffer(updated);
      setRejectOpen(false);
      setRejectReason('');
      toast.success('Offer rejected.');
    } catch (err) {
      toast.error('Failed to reject offer');
    } finally {
      setActionLoading(false);
    }
  }, [id, user, rejectReason]);

  const handleComment = useCallback(async () => {
    if (!reviewComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    try {
      setActionLoading(true);
      const updated = await commentOnOffer(id, user?.displayName || user?.email, reviewComment);
      setOffer(updated);
      setCommentOpen(false);
      setReviewComment('');
      toast.success('Comment saved.');
    } catch (err) {
      toast.error('Failed to save comment');
    } finally {
      setActionLoading(false);
    }
  }, [id, user, reviewComment]);

  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (!offer) {
    return (
      <DashboardContent>
        <Alert severity="error">Offer not found.</Alert>
      </DashboardContent>
    );
  }

  const statusLabel = (offer.status || 'draft')
    .replace('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Offer Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Offer Management', href: paths.dashboard.hr.offerManagement.root },
          { name: `${offer.candidateName}` },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            {canAct && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Iconify icon="eva:checkmark-circle-2-fill" />}
                  onClick={() => setApproveOpen(true)}
                >
                  Approve
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<Iconify icon="eva:message-circle-fill" />}
                  onClick={() => setCommentOpen(true)}
                >
                  Comment
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Iconify icon="eva:close-circle-fill" />}
                  onClick={() => setRejectOpen(true)}
                >
                  Reject
                </Button>
              </>
            )}
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        {/* Left: Offer details */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            {/* Status banner */}
            <Alert
              severity={
                offer.status === 'approved'
                  ? 'success'
                  : offer.status === 'rejected'
                    ? 'error'
                    : offer.status === 'pending_approval'
                      ? 'warning'
                      : 'info'
              }
              icon={false}
              sx={{ alignItems: 'center' }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip
                  size="small"
                  label={statusLabel}
                  color={STATUS_COLOR[offer.status] || 'default'}
                />
                {offer.status === 'approved' && offer.approvedBy && (
                  <Typography variant="body2">
                    Approved by <strong>{offer.approvedBy}</strong>
                    {offer.approvedAt
                      ? ` on ${new Date(offer.approvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                      : ''}
                  </Typography>
                )}
                {offer.status === 'rejected' && offer.rejectedBy && (
                  <Typography variant="body2">
                    Rejected by <strong>{offer.rejectedBy}</strong>
                    {offer.rejectedAt
                      ? ` on ${new Date(offer.rejectedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                      : ''}
                  </Typography>
                )}
              </Stack>
            </Alert>

            {/* Candidate Information */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Candidate Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <DetailRow label="Full Name" value={offer.candidateName} />
              <DetailRow label="Email" value={offer.candidateEmail} />
              <DetailRow label="Passport Number" value={offer.passportNumber} />
              <DetailRow label="Date of Birth" value={offer.dateOfBirth} />
              <DetailRow label="Nationality" value={offer.nationality} />
            </Card>

            {/* Role & Contract */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Position &amp; Contract
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <DetailRow label="Position" value={offer.position} />
              <DetailRow label="Department" value={offer.department} />
              <DetailRow label="Contract Number" value={offer.contractNumber} />
              <DetailRow label="Contract Type" value={offer.contractType} />
              <DetailRow label="Start Date" value={offer.startDate} />
              <DetailRow
                label="Contract Duration"
                value={offer.contractDuration ? `${offer.contractDuration} months` : null}
              />
              <DetailRow
                label="Probation Period"
                value={offer.probationPeriod ? `${offer.probationPeriod} months` : null}
              />
            </Card>

            {/* Employment Terms */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Employment Terms
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <DetailRow
                label="Working Hours"
                value={offer.workingHours ? `${offer.workingHours} hrs/day` : null}
              />
              <DetailRow
                label="Annual Leave"
                value={offer.annualLeaveDays ? `${offer.annualLeaveDays} days/year` : null}
              />
              <DetailRow
                label="Notice Period"
                value={offer.noticePeriod ? `${offer.noticePeriod} days` : null}
              />
            </Card>

            {/* Comments / Rejection reason */}
            {(offer.approvalComments || offer.rejectionReason) && (
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Review Notes
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {offer.approvalComments && (
                  <DetailRow label="Comments" value={offer.approvalComments} />
                )}
                {offer.rejectionReason && (
                  <DetailRow label="Rejection Reason" value={offer.rejectionReason} />
                )}
              </Card>
            )}
          </Stack>
        </Grid>

        {/* Right: Salary summary */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Salary Package
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Basic Salary
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  SAR {Number(offer.basicSalary || 0).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Housing Allowance
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  SAR {Number(offer.housingAllowance || 0).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Transportation
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  SAR {Number(offer.transportationAllowance || 0).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Other Allowances
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  SAR {Number(offer.otherAllowances || 0).toLocaleString()}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1">Total Package</Typography>
                <Typography variant="subtitle1" color="primary" fontWeight={700}>
                  SAR {Number(offer.totalSalary || 0).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Card>

          {/* Meta info */}
          <Card sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Offer Info
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <DetailRow label="Created By" value={offer.createdBy} />
            <DetailRow
              label="Created At"
              value={
                offer.createdAt
                  ? new Date(offer.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : null
              }
            />
          </Card>

          {/* Approval chain progress */}
          <Card sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Approval Chain
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              {APPROVAL_CHAIN.map((stage, idx) => {
                const isCurrent =
                  offer.status === 'pending_approval' && offer.currentApprovalStage === stage;
                const isRejected = offer.status === 'rejected';

                // Determine done state
                let isDone = false;
                let doneBy = null;
                let doneAt = null;

                if (stage === 'manager' && offer.managerApprovedBy) {
                  isDone = true;
                  doneBy = offer.managerApprovedBy;
                  doneAt = offer.managerApprovedAt;
                } else if (stage === 'admin' && offer.adminApprovedBy) {
                  isDone = true;
                  doneBy = offer.adminApprovedBy;
                  doneAt = offer.adminApprovedAt;
                } else if (stage === 'superAdmin' && offer.approvedBy) {
                  isDone = true;
                  doneBy = offer.approvedBy;
                  doneAt = offer.approvedAt;
                }

                // Pending but not yet reached
                const isPending =
                  !isDone && !isCurrent && offer.status !== 'approved' && !isRejected;

                return (
                  <Box
                    key={stage}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      opacity: isPending ? 0.4 : 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: isDone
                          ? 'success.main'
                          : isCurrent
                            ? 'warning.main'
                            : 'action.disabledBackground',
                        color: isDone || isCurrent ? 'common.white' : 'text.disabled',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {isDone ? '✓' : idx + 1}
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={
                          isCurrent ? 'warning.main' : isDone ? 'success.main' : 'text.primary'
                        }
                      >
                        {STAGE_LABEL[stage]}
                        {isCurrent && (
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ ml: 1, color: 'warning.main' }}
                          >
                            (Awaiting)
                          </Typography>
                        )}
                      </Typography>
                      {isDone && doneBy && (
                        <Typography variant="caption" color="text.secondary">
                          {doneBy}
                          {doneAt
                            ? ` · ${new Date(doneAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                            : ''}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* ── Approve Dialog ───────────────────────────────────── */}
      <Dialog open={approveOpen} onClose={() => setApproveOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Offer Letter</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {offer.currentApprovalStage === 'superAdmin'
              ? `This is the final approval step. Approving will mark the offer as fully approved and send the offer letter to ${offer.candidateEmail}.`
              : offer.currentApprovalStage === 'admin'
                ? `Approving will forward this offer to Super Admin for final approval.`
                : `Approving will forward this offer to Admin for the next review step.`}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Approval Comments (optional)"
            value={approveComment}
            onChange={(e) => setApproveComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveOpen(false)}>Cancel</Button>
          <LoadingButton
            variant="contained"
            color="success"
            loading={actionLoading}
            onClick={handleApprove}
          >
            Confirm Approval
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* ── Reject Dialog ────────────────────────────────────── */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Offer Letter</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide a reason for rejecting this offer so the HR team can make the necessary
            changes.
          </Typography>
          <TextField
            fullWidth
            required
            multiline
            rows={3}
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          <LoadingButton
            variant="contained"
            color="error"
            loading={actionLoading}
            onClick={handleReject}
          >
            Confirm Rejection
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* ── Comment Dialog ───────────────────────────────────── */}
      <Dialog open={commentOpen} onClose={() => setCommentOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Modification</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add a comment requesting changes to this offer letter before it is approved.
          </Typography>
          <TextField
            fullWidth
            required
            multiline
            rows={3}
            label="Your Comments"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentOpen(false)}>Cancel</Button>
          <LoadingButton variant="contained" loading={actionLoading} onClick={handleComment}>
            Save Comment
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
