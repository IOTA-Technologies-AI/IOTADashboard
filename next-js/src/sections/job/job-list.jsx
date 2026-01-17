import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Pagination, { paginationClasses } from '@mui/material/Pagination';

import { paths } from 'src/routes/paths';

import { deleteJob } from 'src/actions/jobs';

import { toast } from 'src/components/snackbar';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { JobItem } from './job-item';

// ----------------------------------------------------------------------

export function JobList({ jobs: initialJobs }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [deleteId, setDeleteId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  return (
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
    </>
  );
}
