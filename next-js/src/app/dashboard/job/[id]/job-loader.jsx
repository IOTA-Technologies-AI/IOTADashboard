'use client';

import useSWR from 'swr';

import Alert from '@mui/material/Alert';

import { getJob } from 'src/actions/jobs';

import { LoadingScreen } from 'src/components/loading-screen';

import { JobEditView, JobDetailsView } from 'src/sections/job/view';

import { PageGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

// Fetched client-side: the API needs the signed-in user's bearer token, which only
// exists in the browser session — a server component has none and gets 401.
export default function JobLoader({ id, mode = 'details' }) {
  const { data, isLoading, error } = useSWR(id ? ['job', id] : null, () => getJob(id), {
    revalidateOnFocus: false,
  });

  let content = null;
  if (isLoading) {
    content = <LoadingScreen />;
  } else if (error || !data) {
    content = (
      <Alert severity={error ? 'error' : 'warning'} sx={{ m: 3 }}>
        {error?.message || 'Job not found.'}
      </Alert>
    );
  } else {
    content = mode === 'edit' ? <JobEditView job={data} /> : <JobDetailsView job={data} />;
  }

  return <PageGuard>{content}</PageGuard>;
}
