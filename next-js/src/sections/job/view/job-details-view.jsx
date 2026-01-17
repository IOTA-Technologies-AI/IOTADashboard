'use client';

import { useState, useCallback } from 'react';
import { useTabs, useBoolean } from 'minimal-shared/hooks';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { syncJobToWebflow, updateJob } from 'src/actions/jobs';

import { JobApplyDialog } from '../job-apply-dialog';
import { JobDetailsToolbar } from '../job-details-toolbar';
import { JobDetailsContent } from '../job-details-content';
import { JobDetailsCandidates } from '../job-details-candidates';

// ----------------------------------------------------------------------

const JOB_DETAILS_TABS = [
  { value: 'content', label: 'Job content' },
  { value: 'candidates', label: 'Candidates' },
];

const JOB_PUBLISH_OPTIONS = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
];

export function JobDetailsView({ job: apiJob }) {
  const tabs = useTabs('content');
  const applyDialog = useBoolean(false);

  // Transform API job to display format
  const job = apiJob
    ? {
        ...apiJob,
        publish: apiJob.status === 'published' ? 'published' : 'draft',
        candidates: [],
        company: {
          name: apiJob.companyName || 'IOTA Technologies',
          logo: apiJob.companyLogoUrl || '/logo/logo-single.svg',
          phoneNumber: '',
          fullAddress: apiJob.location || '',
        },
        salary: {
          type: apiJob.salaryPeriod || 'yearly',
          price: apiJob.salaryMax || 0,
          negotiable: !apiJob.showSalary,
        },
        content: apiJob.roleDescription || '',
        employmentTypes: apiJob.jobType ? [apiJob.jobType] : [],
        locations: apiJob.location ? [apiJob.location] : [],
        experience: apiJob.experienceLevel || '',
        benefits: apiJob.benefits ? apiJob.benefits.split('\n').filter(Boolean) : [],
        role: apiJob.department || '',
      }
    : null;

  const [publish, setPublish] = useState(job?.publish);
  const [syncing, setSyncing] = useState(false);

  const handleChangePublish = useCallback(
    async (newValue) => {
      setPublish(newValue);
      // Update job status in database
      if (apiJob?.id) {
        try {
          await updateJob(apiJob.id, { status: newValue });
          toast.success(`Job ${newValue === 'published' ? 'published' : 'saved as draft'}`);
        } catch (error) {
          console.error('Failed to update job status:', error);
          toast.error('Failed to update job status');
        }
      }
    },
    [apiJob?.id]
  );

  const handleSyncToWebflow = useCallback(async () => {
    if (!apiJob?.id) return;

    setSyncing(true);
    try {
      await syncJobToWebflow(apiJob.id, true);
      toast.success('Job synced to Webflow successfully!');
    } catch (error) {
      console.error('Failed to sync to Webflow:', error);
      toast.error(error.message || 'Failed to sync to Webflow');
    } finally {
      setSyncing(false);
    }
  }, [apiJob?.id]);

  const renderToolbar = () => (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
      <JobDetailsToolbar
        backHref={paths.dashboard.job.root}
        editHref={paths.dashboard.job.edit(`${job?.id}`)}
        liveHref={job?.webflowItemId ? `https://iota-career-site.webflow.io/jobs/${job.slug}` : '#'}
        publish={publish || ''}
        onChangePublish={handleChangePublish}
        publishOptions={JOB_PUBLISH_OPTIONS}
      />

      <Stack direction="row" spacing={2}>
        <Button
          variant="outlined"
          color="success"
          startIcon={<Iconify icon="solar:document-add-bold" />}
          onClick={applyDialog.onTrue}
        >
          Apply Now
        </Button>

        <Button
          variant="contained"
          color="primary"
          startIcon={<Iconify icon="mdi:web" />}
          onClick={handleSyncToWebflow}
          loading={syncing}
          disabled={!apiJob?.id}
        >
          Sync to Webflow
        </Button>
      </Stack>
    </Stack>
  );

  const renderTabs = () => (
    <Tabs value={tabs.value} onChange={tabs.onChange} sx={{ mb: { xs: 3, md: 5 } }}>
      {JOB_DETAILS_TABS.map((tab) => (
        <Tab
          key={tab.value}
          iconPosition="end"
          value={tab.value}
          label={tab.label}
          icon={
            tab.value === 'candidates' ? (
              <Label variant="filled">{job?.candidates?.length || 0}</Label>
            ) : (
              ''
            )
          }
        />
      ))}
    </Tabs>
  );

  return (
    <DashboardContent>
      {renderToolbar()}

      {renderTabs()}
      {tabs.value === 'content' && <JobDetailsContent job={job} />}
      {tabs.value === 'candidates' && <JobDetailsCandidates candidates={job?.candidates ?? []} />}

      <JobApplyDialog open={applyDialog.value} onClose={applyDialog.onFalse} job={apiJob} />
    </DashboardContent>
  );
}
