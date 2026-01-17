import * as z from 'zod';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import ButtonBase from '@mui/material/ButtonBase';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useAuthContext } from 'src/auth/hooks';

import {
  createJob,
  updateJob,
  syncJobToWebflow,
  JOB_TYPE_OPTIONS,
  DEPARTMENT_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  REMOTE_TYPE_OPTIONS,
  TECHNOLOGY_AREA_OPTIONS,
} from 'src/actions/jobs';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field, schemaUtils } from 'src/components/hook-form';

// ----------------------------------------------------------------------

// Skill options for job postings
const JOB_SKILL_OPTIONS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Node.js',
  'Python',
  'Java',
  'Go',
  'Rust',
  'AWS',
  'Azure',
  'GCP',
  'Docker',
  'Kubernetes',
  'PostgreSQL',
  'MongoDB',
  'Redis',
  'GraphQL',
  'REST APIs',
  'Git',
];

// Working schedule options
const JOB_WORKING_SCHEDULE_OPTIONS = [
  'Sunday to Thursday',
  'Monday to Friday',
  'Flexible hours',
  'Shift work',
  'Rotational shifts',
];

// Benefit options for job postings (Middle East focused)
const JOB_BENEFIT_OPTIONS = [
  { label: 'Health Insurance', value: 'health-insurance' },
  { label: 'Family Status', value: 'family-status' },
  { label: 'Yearly Return Air Ticket', value: 'yearly-air-ticket' },
  { label: 'Professional Development', value: 'professional-development' },
  { label: 'Remote Work', value: 'remote-work' },
  { label: 'Paid Time Off / Vacation Salary', value: 'paid-time-off' },
  { label: 'Housing Allowance', value: 'housing-allowance' },
  { label: 'Transportation Allowance', value: 'transportation-allowance' },
  { label: 'End of Service Benefits', value: 'end-of-service' },
  { label: 'Annual Bonus', value: 'annual-bonus' },
];

// Salary currency options
const SALARY_CURRENCY_OPTIONS = [
  { label: 'SAR - Saudi Riyal', value: 'SAR' },
  { label: 'AED - UAE Dirham', value: 'AED' },
  { label: 'QAR - Qatari Riyal', value: 'QAR' },
  { label: 'USD - US Dollar', value: 'USD' },
  { label: 'INR - Indian Rupee', value: 'INR' },
];

export const JobCreateSchema = z.object({
  title: z.string().min(1, { error: 'Title is required!' }),
  content: schemaUtils.editor().min(100, { error: 'Content must be at least 100 characters' }),
  employmentTypes: z.string().array().min(1, { error: 'Choose at least one option!' }),
  role: schemaUtils.nullableInput(z.string().min(1, { error: 'Role is required!' }), {
    error: 'Role is required!',
  }),
  skills: z.string().array().min(1, { error: 'Choose at least one option!' }),
  workingSchedule: z.string().array().min(1, { error: 'Choose at least one option!' }),
  locations: z.string().array().min(1, { error: 'Choose at least one option!' }),
  expiredDate: schemaUtils.date({ error: { required: 'Expired date is required!' } }),
  salary: z.object({
    price: schemaUtils.nullableInput(z.coerce.number().min(1, { error: 'Price is required!' }), {
      error: 'Price is required!',
    }),
    // Not required
    type: z.string(),
    currency: z.string(),
    negotiable: z.boolean(),
  }),
  benefits: z.string().array().min(1, { error: 'Choose at least one option!' }),
  // Not required
  experience: z.string(),
  remoteType: z.string().optional(),
  technologyArea: z.string().optional(),
});

// ----------------------------------------------------------------------

export function JobCreateEditForm({ currentJob }) {
  const router = useRouter();
  const { user } = useAuthContext();

  const openDetails = useBoolean(true);
  const openProperties = useBoolean(true);

  const defaultValues = {
    title: '',
    content: '',
    employmentTypes: [],
    experience: EXPERIENCE_LEVEL_OPTIONS[0]?.label || '1 year exp',
    role: DEPARTMENT_OPTIONS[0]?.label || 'Engineering',
    skills: [],
    workingSchedule: [],
    locations: [],
    expiredDate: null,
    salary: { type: 'Yearly', currency: 'SAR', price: null, negotiable: false },
    benefits: [],
    remoteType: REMOTE_TYPE_OPTIONS[0]?.value || 'onsite',
    technologyArea: TECHNOLOGY_AREA_OPTIONS[0]?.value || 'fullstack',
  };

  // Transform currentJob to form values if editing
  const getFormValues = () => {
    if (!currentJob) return defaultValues;
    return {
      title: currentJob.title || '',
      content: currentJob.roleDescription || currentJob.content || '',
      employmentTypes: currentJob.jobType ? [currentJob.jobType] : [],
      experience: currentJob.experienceLevel || defaultValues.experience,
      role: currentJob.department || defaultValues.role,
      skills: currentJob.skills || [],
      workingSchedule: currentJob.workingSchedule || [],
      locations: currentJob.location ? [currentJob.location] : [],
      expiredDate: currentJob.expiryDate ? new Date(currentJob.expiryDate) : null,
      salary: {
        type: currentJob.salaryPeriod || 'Yearly',
        currency: currentJob.salaryCurrency || 'SAR',
        price: currentJob.salaryMax || null,
        negotiable: !currentJob.showSalary,
      },
      benefits: currentJob.benefits ? currentJob.benefits.split('\n').filter(Boolean) : [],
      remoteType: currentJob.remoteType || defaultValues.remoteType,
      technologyArea: currentJob.technologyArea || currentJob.area || defaultValues.technologyArea,
    };
  };

  const methods = useForm({
    mode: 'all',
    resolver: zodResolver(JobCreateSchema),
    defaultValues,
    values: currentJob ? getFormValues() : defaultValues,
  });

  const {
    reset,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      // Transform form data to API format
      const jobData = {
        title: data.title,
        roleDescription: data.content,
        department: data.role,
        jobType: data.employmentTypes[0] || 'full-time',
        experienceLevel: data.experience,
        location: data.locations[0] || '',
        remoteType: data.remoteType || 'onsite',
        salaryMin: Number(data.salary.price) || 0,
        salaryMax: Number(data.salary.price) || 0,
        salaryCurrency: data.salary.currency || 'SAR',
        salaryPeriod: data.salary.type?.toLowerCase() || 'yearly',
        showSalary: !data.salary.negotiable,
        skills: data.skills,
        workingSchedule: data.workingSchedule,
        benefits: data.benefits.join('\n'),
        technologyArea: data.technologyArea || 'fullstack',
        expiryDate: data.expiredDate
          ? (data.expiredDate instanceof Date
              ? data.expiredDate
              : new Date(data.expiredDate)
            ).toISOString()
          : null,
        status: 'draft',
        companyName: 'IOTA Technologies',
        createdBy: user?.displayName || user?.email || 'Unknown',
        createdByEmail: user?.email || '',
      };

      if (currentJob?.id) {
        await updateJob(currentJob.id, jobData);
        toast.success('Job updated successfully!');
      } else {
        await createJob(jobData);
        toast.success('Job created successfully!');
      }

      reset();
      router.push(paths.dashboard.job.root);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to save job');
    }
  });

  const handleSaveAndPublish = async () => {
    const data = methods.getValues();
    const isValid = await methods.trigger();
    if (!isValid) return;

    try {
      // Transform form data to API format
      const jobData = {
        title: data.title,
        roleDescription: data.content,
        department: data.role,
        jobType: data.employmentTypes[0] || 'full-time',
        experienceLevel: data.experience,
        location: data.locations[0] || '',
        remoteType: data.remoteType || 'onsite',
        salaryMin: Number(data.salary.price) || 0,
        salaryMax: Number(data.salary.price) || 0,
        salaryCurrency: data.salary.currency || 'SAR',
        salaryPeriod: data.salary.type?.toLowerCase() || 'yearly',
        showSalary: !data.salary.negotiable,
        skills: data.skills,
        workingSchedule: data.workingSchedule,
        benefits: data.benefits.join('\n'),
        technologyArea: data.technologyArea || 'fullstack',
        expiryDate: data.expiredDate
          ? (data.expiredDate instanceof Date
              ? data.expiredDate
              : new Date(data.expiredDate)
            ).toISOString()
          : null,
        status: 'pending_approval',
        companyName: 'IOTA Technologies',
        createdBy: user?.displayName || user?.email || 'Unknown',
        createdByEmail: user?.email || '',
      };

      let jobId = currentJob?.id;
      if (jobId) {
        await updateJob(jobId, jobData);
      } else {
        const result = await createJob(jobData);
        jobId = result.id;
      }

      // Job is now pending approval - admins will be notified via email
      toast.success('Job submitted for approval! Admins have been notified.');

      reset();
      router.push(paths.dashboard.job.root);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to publish job');
    }
  };

  const renderCollapseButton = (value, onToggle) => (
    <IconButton onClick={onToggle}>
      <Iconify icon={value ? 'eva:arrow-ios-downward-fill' : 'eva:arrow-ios-forward-fill'} />
    </IconButton>
  );

  const renderDetails = () => (
    <Card>
      <CardHeader
        title="Details"
        subheader="Title, short description, image..."
        action={renderCollapseButton(openDetails.value, openDetails.onToggle)}
        sx={{ mb: 3 }}
      />

      <Collapse in={openDetails.value}>
        <Divider />

        <Stack spacing={3} sx={{ p: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Title</Typography>
            <Field.Text name="title" placeholder="Ex: Software engineer..." />
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Content</Typography>
            <Field.Editor name="content" sx={{ maxHeight: 480 }} />
          </Stack>
        </Stack>
      </Collapse>
    </Card>
  );

  const renderProperties = () => (
    <Card>
      <CardHeader
        title="Properties"
        subheader="Additional functions and attributes..."
        action={renderCollapseButton(openProperties.value, openProperties.onToggle)}
        sx={{ mb: 3 }}
      />

      <Collapse in={openProperties.value}>
        <Divider />

        <Stack spacing={3} sx={{ p: 3 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2">Employment type</Typography>
            <Field.MultiCheckbox
              row
              name="employmentTypes"
              options={JOB_TYPE_OPTIONS}
              sx={{ gap: 4 }}
            />
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2">Experience</Typography>
            <Field.RadioGroup
              row
              name="experience"
              options={EXPERIENCE_LEVEL_OPTIONS}
              sx={{ gap: 4 }}
            />
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Department</Typography>
            <Field.Autocomplete
              name="role"
              autoHighlight
              options={DEPARTMENT_OPTIONS.map((option) => option.label)}
              getOptionLabel={(option) => option}
            />
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Remote Type</Typography>
            <Field.RadioGroup row name="remoteType" options={REMOTE_TYPE_OPTIONS} sx={{ gap: 4 }} />
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Technology Area</Typography>
            <Field.Autocomplete
              name="technologyArea"
              autoHighlight
              freeSolo
              options={TECHNOLOGY_AREA_OPTIONS.map((option) => option.value)}
              getOptionLabel={(option) =>
                TECHNOLOGY_AREA_OPTIONS.find((o) => o.value === option)?.label || option
              }
              helperText="Select from list or type a custom area"
            />
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Skills</Typography>
            <Field.Autocomplete
              name="skills"
              placeholder="+ Skills (type and press Enter to add)"
              multiple
              freeSolo
              disableCloseOnSelect
              options={JOB_SKILL_OPTIONS.map((option) => option)}
              getOptionLabel={(option) => option}
              slotProps={{
                chip: { color: 'info' },
              }}
              helperText="Select from list or type custom skills"
            />
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Working schedule</Typography>
            <Field.Autocomplete
              name="workingSchedule"
              placeholder="+ Schedule"
              multiple
              disableCloseOnSelect
              options={JOB_WORKING_SCHEDULE_OPTIONS.map((option) => option)}
              getOptionLabel={(option) => option}
              slotProps={{
                chip: { color: 'info' },
              }}
            />
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Locations</Typography>
            <Field.CountrySelect
              multiple
              name="locations"
              placeholder="+ Locations"
              slotProps={{
                chip: { color: 'info' },
              }}
            />
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Expired</Typography>

            <Field.DatePicker name="expiredDate" />
          </Stack>

          <Stack spacing={2}>
            <Typography variant="subtitle2">Salary</Typography>

            <Controller
              name="salary.type"
              control={control}
              render={({ field }) => (
                <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {[
                    {
                      label: 'Hourly',
                      icon: <Iconify icon="solar:clock-circle-bold" width={32} sx={{ mb: 2 }} />,
                    },
                    {
                      label: 'Yearly',
                      icon: <Iconify icon="solar:calendar-bold" width={32} sx={{ mb: 2 }} />,
                    },
                    {
                      label: 'Custom',
                      icon: <Iconify icon="solar:wad-of-money-bold" width={32} sx={{ mb: 2 }} />,
                    },
                  ].map((item) => (
                    <Paper
                      component={ButtonBase}
                      variant="outlined"
                      key={item.label}
                      onClick={() => field.onChange(item.label)}
                      sx={{
                        p: 2.5,
                        borderRadius: 1,
                        typography: 'subtitle2',
                        flexDirection: 'column',
                        ...(item.label === field.value && {
                          borderWidth: 2,
                          borderColor: 'text.primary',
                        }),
                      }}
                    >
                      {item.icon}
                      {item.label}
                    </Paper>
                  ))}
                </Box>
              )}
            />

            <Stack direction="row" spacing={2}>
              <Field.Autocomplete
                name="salary.currency"
                label="Currency"
                options={SALARY_CURRENCY_OPTIONS.map((option) => option.value)}
                getOptionLabel={(option) => {
                  const found = SALARY_CURRENCY_OPTIONS.find((o) => o.value === option);
                  return found ? found.label : option;
                }}
                sx={{ flex: 1 }}
              />

              <Field.Text
                name="salary.price"
                label="Amount"
                placeholder="0.00"
                type="number"
                sx={{ flex: 1 }}
              />
            </Stack>

            <Field.Switch name="salary.negotiable" label="Salary is negotiable" />
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2">Benefits</Typography>
            <Field.MultiCheckbox
              name="benefits"
              options={JOB_BENEFIT_OPTIONS}
              sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}
            />
          </Stack>
        </Stack>
      </Collapse>
    </Card>
  );

  const renderActions = () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
      <Box sx={{ flexGrow: 1 }} />

      <Button type="submit" variant="outlined" size="large" loading={isSubmitting}>
        {!currentJob ? 'Save as draft' : 'Save changes'}
      </Button>

      <Button
        type="button"
        variant="contained"
        size="large"
        color="primary"
        onClick={handleSaveAndPublish}
        startIcon={<Iconify icon="mdi:send" />}
      >
        Submit for Approval
      </Button>
    </Box>
  );

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Stack spacing={{ xs: 3, md: 5 }} sx={{ mx: 'auto', maxWidth: { xs: 720, xl: 880 } }}>
        {renderDetails()}
        {renderProperties()}
        {renderActions()}
      </Stack>
    </Form>
  );
}
