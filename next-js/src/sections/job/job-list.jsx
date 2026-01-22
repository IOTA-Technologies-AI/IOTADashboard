import { useState, useCallback, useMemo } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Pagination, { paginationClasses } from '@mui/material/Pagination';

import { paths } from 'src/routes/paths';

import { useAuthContext } from 'src/auth/hooks';

import { deleteJob, approveJob, rejectJob } from 'src/actions/jobs';
import { publishToWebflow } from 'src/actions/webflow';

import { toast } from 'src/components/snackbar';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { JobItem } from './job-item';

// ----------------------------------------------------------------------

export function JobList({ jobs: initialJobs }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [deleteId, setDeleteId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [approveId, setApproveId] = useState(null);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [publishLoading, setPublishLoading] = useState(false);

  const { user } = useAuthContext();

  // Check if user is admin or superAdmin (roleId 3 or 4)
  const isAdmin = useMemo(() => {
    const roleId = user?.roleId;
    const role = user?.role;
    return roleId === 3 || roleId === 4 || role === 'admin' || role === 'superAdmin';
  }, [user?.roleId, user?.role]);

  const handleDeleteClick = useCallback((id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    try {
      await deleteJob(deleteId);
      setJobs((prev) => prev.filter((job) => job.id !== deleteId));
      toast.success('Job deleted successfully');
    } catch (error) {
      console.error('Failed to delete job:', error);
      toast.error('Failed to delete job');
    } finally {
      setConfirmOpen(false);
      setDeleteId(null);
    }
  }, [deleteId]);

  const handleApproveClick = useCallback((id) => {
    setApproveId(id);
    setApproveConfirmOpen(true);
  }, []);

  const handleConfirmApprove = useCallback(async () => {
    try {
      await approveJob(approveId, user?.email || user?.displayName);
      setJobs((prev) =>
        prev.map((job) => (job.id === approveId ? { ...job, status: 'published' } : job))
      );
      toast.success('Job approved and published to Webflow!');
    } catch (error) {
      console.error('Failed to approve job:', error);
      toast.error('Failed to approve job');
    } finally {
      setApproveConfirmOpen(false);
      setApproveId(null);
    }
  }, [approveId, user?.email, user?.displayName]);

  const handleRejectClick = useCallback((id) => {
    setRejectId(id);
    setRejectionReason('');
    setRejectDialogOpen(true);
  }, []);

  const handleConfirmReject = useCallback(async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await rejectJob(rejectId, user?.email || user?.displayName, rejectionReason);
      setJobs((prev) =>
        prev.map((job) => (job.id === rejectId ? { ...job, status: 'rejected' } : job))
      );
      toast.success('Job rejected');
    } catch (error) {
      console.error('Failed to reject job:', error);
      toast.error('Failed to reject job');
    } finally {
      setRejectDialogOpen(false);
      setRejectId(null);
      setRejectionReason('');
    }
  }, [rejectId, rejectionReason, user?.email, user?.displayName]);
const handlePublishToWebflow = useCallback(async () => {
    setPublishLoading(true);
    try {
      await publishToWebflow();
      toast.success('All staged items published to Webflow successfully!');
    } catch (error) {
      console.error('Failed to publish to Webflow:', error);
      toast.error(error.message || 'Failed to publish to Webflow');
    } finally {
      setPublishLoading(false);
    }
  }, []);

  return (
    <>
      {isAdmin && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handlePublishToWebflow}
            disabled={publishLoading}
            sx={{ minWidth: 200 }}
          >
            {publishLoading ? 'Publishing...' : 'Publish All to Webflow'}
          </Button>
        </Box>
      )}
rn (
    <>
      <Box
        sx={{
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        }}
      >
        {jobs.map((job) => (
          <JobItem
            key={job.id}
            job={job}
            editHref={paths.dashboard.job.edit(job.id)}
            detailsHref={paths.dashboard.job.details(job.id)}
            onDelete={() => handleDeleteClick(job.id)}
            onApprove={() => handleApproveClick(job.id)}
            onReject={() => handleRejectClick(job.id)}
            isAdmin={isAdmin}
          />
        ))}
      </Box>

      {jobs.length > 8 && (
        <Pagination
          count={8}
          sx={{
            mt: { xs: 8, md: 8 },
            [`& .${paginationClasses.ul}`]: { justifyContent: 'center' },
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete Job"
        content="Are you sure you want to delete this job? This action cannot be undone."
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        }
      />

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        open={approveConfirmOpen}
        onClose={() => setApproveConfirmOpen(false)}
        title="Approve Job"
        content="Are you sure you want to approve this job? It will be published to Webflow immediately."
        action={
          <Button variant="contained" color="success" onClick={handleConfirmApprove}>
            Approve & Publish
          </Button>
        }
      />

      {/* Reject Dialog with Reason Input */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject Job</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Please provide a reason for rejecting this job posting..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmReject} variant="contained" color="warning">
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
