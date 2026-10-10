import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

function Stat({ label, value, href }) {
  return (
    <Box
      component={href ? RouterLink : 'div'}
      href={href}
      sx={{ flex: 1, textAlign: 'center', color: 'inherit', textDecoration: 'none' }}
    >
      <Typography variant="h4">{value}</Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

/** Headcount, onboarding and vetting queues, and documents about to expire. */
export function DashboardHr({ hr, sx }) {
  const docs = hr?.expiringDocuments ?? [];
  return (
    <Card sx={sx}>
      <CardHeader title="HR & compliance" />
      <Stack
        direction="row"
        divider={<Divider orientation="vertical" flexItem />}
        sx={{ px: 2, py: 2.5 }}
      >
        <Stat
          label="Active employees"
          value={hr?.headcount ?? 0}
          href={paths.dashboard.hr.employee.root}
        />
        <Stat
          label="Onboarding to review"
          value={hr?.onboardingAwaitingReview ?? 0}
          href={paths.dashboard.hr.employeeOnboarding.root}
        />
        <Stat
          label="Vetting to decide"
          value={hr?.vettingAwaitingDecision ?? 0}
          href={paths.dashboard.hr.employeeVetting.root}
        />
      </Stack>
      <Divider sx={{ borderStyle: 'dashed' }} />
      <Box sx={{ p: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Documents expiring within 60 days
        </Typography>
        {docs.length ? (
          <Stack spacing={1.25}>
            {docs.map((d) => (
              <Stack
                key={`${d.employeeId}-${d.document}`}
                direction="row"
                alignItems="center"
                spacing={1}
              >
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {d.employeeName} — {d.document}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {fDate(d.expiresOn)}
                  </Typography>
                </Box>
                <Label
                  variant="soft"
                  color={d.daysLeft < 0 ? 'error' : d.daysLeft <= 30 ? 'warning' : 'info'}
                >
                  {d.daysLeft < 0 ? `expired ${-d.daysLeft}d ago` : `${d.daysLeft}d left`}
                </Label>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Nothing expires in the next 60 days.
          </Typography>
        )}
      </Box>
    </Card>
  );
}
