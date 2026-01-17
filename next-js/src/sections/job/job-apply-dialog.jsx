'use client';

import * as z from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { submitJobApplication } from 'src/actions/jobs';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const JobApplicationSchema = z.object({
  candidateName: z.string().min(1, { message: 'Full name is required' }),
  candidateEmail: z.string().email({ message: 'Valid email is required' }),
  candidatePhone: z.string().optional(),
  candidateLinkedIn: z.string().optional(),
  candidatePortfolio: z.string().optional(),
  coverLetter: z.string().optional(),
});

// ----------------------------------------------------------------------

export function JobApplyDialog({ open, onClose, job }) {
  const [resumeFile, setResumeFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues = {
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    candidateLinkedIn: '',
    candidatePortfolio: '',
    coverLetter: '',
  };

  const methods = useForm({
    resolver: zodResolver(JobApplicationSchema),
    defaultValues,
  });

  const { reset, handleSubmit } = methods;

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF and Word documents are allowed');
        return;
      }
      setResumeFile(file);
    }
  };

  const convertFileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove the data:*/*;base64, prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      let resumeBase64 = null;
      let resumeFileName = null;

      if (resumeFile) {
        resumeBase64 = await convertFileToBase64(resumeFile);
        resumeFileName = resumeFile.name;
      }

      const applicationData = {
        ...data,
        resumeBase64,
        resumeFileName,
      };

      const result = await submitJobApplication(job.id, applicationData);

      if (result.success) {
        toast.success(
          'Application submitted successfully! We will review your application and get back to you.'
        );
        reset();
        setResumeFile(null);
        onClose();
      } else {
        toast.error(result.message || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleClose = () => {
    reset();
    setResumeFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:document-add-bold" width={28} />
          <Box>
            <Typography variant="h6">Apply for {job?.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {job?.department} • {job?.location}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <Form methods={methods} onSubmit={onSubmit}>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Please fill out the form below. Fields marked with * are required.
            </Typography>

            <Field.Text
              name="candidateName"
              label="Full Name *"
              placeholder="Enter your full name"
            />

            <Field.Text
              name="candidateEmail"
              label="Email Address *"
              placeholder="your.email@example.com"
              type="email"
            />

            <Field.Text name="candidatePhone" label="Phone Number" placeholder="+966 5X XXX XXXX" />

            <Field.Text
              name="candidateLinkedIn"
              label="LinkedIn Profile"
              placeholder="https://linkedin.com/in/yourprofile"
            />

            <Field.Text
              name="candidatePortfolio"
              label="Portfolio / Website"
              placeholder="https://yourportfolio.com"
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Resume / CV
              </Typography>
              <Box
                sx={{
                  p: 3,
                  border: '2px dashed',
                  borderColor: resumeFile ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  bgcolor: resumeFile ? 'primary.lighter' : 'background.neutral',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.lighter',
                  },
                }}
                component="label"
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                {resumeFile ? (
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                    <Iconify icon="solar:document-bold" width={24} color="primary.main" />
                    <Typography variant="body2" fontWeight={600}>
                      {resumeFile.name}
                    </Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.preventDefault();
                        setResumeFile(null);
                      }}
                    >
                      Remove
                    </Button>
                  </Stack>
                ) : (
                  <Stack alignItems="center" spacing={1}>
                    <Iconify icon="solar:upload-bold" width={40} color="text.secondary" />
                    <Typography variant="body2" color="text.secondary">
                      Drop your resume here or click to upload
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      PDF, DOC, DOCX (Max 5MB)
                    </Typography>
                  </Stack>
                )}
              </Box>
            </Box>

            <Field.Text
              name="coverLetter"
              label="Cover Letter / Message"
              placeholder="Tell us why you're interested in this role and what makes you a great fit..."
              multiline
              rows={4}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="outlined" color="inherit" onClick={handleClose}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={isSubmitting}
            startIcon={<Iconify icon="solar:send-bold" />}
          >
            Submit Application
          </LoadingButton>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
