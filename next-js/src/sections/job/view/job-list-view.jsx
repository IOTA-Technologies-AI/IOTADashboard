'use client';

import { orderBy } from 'es-toolkit';
import { useState, useEffect, useCallback } from 'react';
import { useBoolean, useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  getJobs,
  JOB_TYPE_OPTIONS,
  DEPARTMENT_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
} from 'src/actions/jobs';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { JobList } from '../job-list';
import { JobSort } from '../job-sort';
import { JobSearch } from '../job-search';
import { JobFilters } from '../job-filters';
import { JobFiltersResult } from '../job-filters-result';

// ----------------------------------------------------------------------

const JOB_SORT_OPTIONS = [
  { label: 'Latest', value: 'latest' },
  { label: 'Popular', value: 'popular' },
  { label: 'Oldest', value: 'oldest' },
];

// ----------------------------------------------------------------------

export function JobListView() {
  const openFilters = useBoolean();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [sortBy, setSortBy] = useState('latest');

  const filters = useSetState({
    roles: [],
    locations: [],
    benefits: [],
    experience: 'all',
    employmentTypes: [],
  });
  const { state: currentFilters } = filters;

  // Fetch jobs from API
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getJobs();
      // Transform API data to match expected format
      const transformedJobs = (data || []).map((job) => ({
        ...job,
        // Map fields to expected structure
        role: job.department || 'General',
        employmentTypes: job.jobType ? [job.jobType] : [],
        locations: job.location ? [job.location] : [],
        benefits: job.benefits ? job.benefits.split('\n').filter(Boolean) : [],
        experience: job.experienceLevel || 'all',
        createdAt: job.postedDate || job.createdAt,
        totalViews: job.viewCount || 0,
        publish: job.status === 'published' ? 'published' : 'draft',
        company: {
          name: job.companyName || 'IOTA Technologies',
          logo: job.companyLogoUrl || '/logo/logo-single.svg',
          phoneNumber: '',
          fullAddress: job.location || '',
        },
        salary: {
          type: job.salaryPeriod || 'yearly',
          price: job.salaryMax || 0,
          negotiable: !job.showSalary,
        },
        content: job.roleDescription || '',
        candidates: [],
        skills: job.skills || [],
      }));
      setJobs(transformedJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const dataFiltered = applyFilter({
    inputData: jobs,
    filters: currentFilters,
    sortBy,
  });

  const canReset =
    currentFilters.roles.length > 0 ||
    currentFilters.locations.length > 0 ||
    currentFilters.benefits.length > 0 ||
    currentFilters.employmentTypes.length > 0 ||
    currentFilters.experience !== 'all';

  const notFound = !dataFiltered.length && canReset;

  const handleSortBy = useCallback((newValue) => {
    setSortBy(newValue);
  }, []);

  const renderFilters = () => {
    // Extract unique values for filters from loaded jobs
    const uniqueRoles = [...new Set(jobs.map((job) => job.role).filter(Boolean))];
    const uniqueLocations = [...new Set(jobs.flatMap((job) => job.locations || []))];
    const uniqueBenefits = [...new Set(jobs.flatMap((job) => job.benefits || []))];

    return (
      <Box
        sx={{
          gap: 3,
          display: 'flex',
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-end', sm: 'center' },
        }}
      >
        <JobSearch jobs={jobs} redirectPath={(id) => paths.dashboard.job.details(id)} />

        <Box sx={{ gap: 1, flexShrink: 0, display: 'flex' }}>
          <JobFilters
            filters={filters}
            canReset={canReset}
            open={openFilters.value}
            onOpen={openFilters.onTrue}
            onClose={openFilters.onFalse}
            options={{
              roles: uniqueRoles.length > 0 ? uniqueRoles : DEPARTMENT_OPTIONS.map((o) => o.label),
              benefits: uniqueBenefits.length > 0 ? uniqueBenefits : [],
              employmentTypes: JOB_TYPE_OPTIONS.map((option) => option.label),
              experiences: ['all', ...EXPERIENCE_LEVEL_OPTIONS.map((option) => option.label)],
            }}
          />

          <JobSort sort={sortBy} onSort={handleSortBy} sortOptions={JOB_SORT_OPTIONS} />
        </Box>
      </Box>
    );
  };

  const renderResults = () => (
    <JobFiltersResult filters={filters} totalResults={dataFiltered.length} />
  );

  if (loading) {
    return (
      <DashboardContent>
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}
        >
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Jobs"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Job', href: paths.dashboard.job.root },
          { name: 'List' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.job.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            Add job
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={2.5} sx={{ mb: { xs: 3, md: 5 } }}>
        {renderFilters()}
        {canReset && renderResults()}
      </Stack>

      {notFound && <EmptyContent filled sx={{ py: 10 }} />}

      {!notFound && jobs.length === 0 && (
        <EmptyContent
          filled
          title="No Jobs Found"
          description="Start by creating your first job posting"
          sx={{ py: 10 }}
        />
      )}

      {jobs.length > 0 && <JobList jobs={dataFiltered} />}
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, filters, sortBy }) {
  const { employmentTypes, experience, roles, locations, benefits } = filters;

  // Sort by
  if (sortBy === 'latest') {
    inputData = orderBy(inputData, ['createdAt'], ['desc']);
  }

  if (sortBy === 'oldest') {
    inputData = orderBy(inputData, ['createdAt'], ['asc']);
  }

  if (sortBy === 'popular') {
    inputData = orderBy(inputData, ['totalViews'], ['desc']);
  }

  // Filters
  if (employmentTypes.length) {
    inputData = inputData.filter((job) =>
      job.employmentTypes?.some((item) => employmentTypes.includes(item))
    );
  }

  if (experience !== 'all') {
    inputData = inputData.filter((job) => job.experience === experience);
  }

  if (roles.length) {
    inputData = inputData.filter((job) => roles.includes(job.role));
  }

  if (locations.length) {
    inputData = inputData.filter((job) => job.locations?.some((item) => locations.includes(item)));
  }

  if (benefits.length) {
    inputData = inputData.filter((job) => job.benefits?.some((item) => benefits.includes(item)));
  }

  return inputData;
}
