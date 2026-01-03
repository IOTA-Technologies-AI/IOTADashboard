import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

const normalizeOrganization = (user) => {
  const organizationSource =
    user?.user_metadata?.organization ||
    user?.app_metadata?.organization ||
    user?.organization ||
    user?.user_metadata?.company ||
    user?.user_metadata?.companyName;

  if (typeof organizationSource === 'string') {
    return { name: organizationSource };
  }

  return organizationSource || {};
};

const buildOrgEntries = (user, organization) => {
  const fallbackOrgName =
    user?.user_metadata?.organizationName ||
    user?.user_metadata?.company ||
    user?.user_metadata?.companyName;

  return [
    {
      label: 'Organization',
      value: organization.name || organization.title || organization.company || fallbackOrgName,
    },
    {
      label: 'Role',
      value:
        organization.role ||
        organization.title ||
        organization.position ||
        user?.user_metadata?.role ||
        user?.role,
    },
    { label: 'Team', value: organization.team || organization.department },
    {
      label: 'Location',
      value: organization.location || organization.city || organization.country,
    },
    {
      label: 'Email',
      value:
        organization.email || organization.contactEmail || user?.user_metadata?.organizationEmail,
    },
    { label: 'Website', value: organization.domain || organization.website },
    { label: 'Plan', value: organization.plan || organization.tier },
    {
      label: 'Org ID',
      value: organization.id || organization.orgId || organization.organizationId,
    },
  ].filter((item) => item.value);
};

export function OrganizationSummary({ user, dense = false }) {
  const organization = normalizeOrganization(user);
  const entries = buildOrgEntries(user, organization);

  if (!entries.length) {
    return null;
  }

  return (
    <Box
      sx={{
        p: dense ? 2 : 2.5,
        borderRadius: 2,
        border: (theme) => `1px dashed ${theme.vars.palette.divider}`,
        bgcolor: (theme) => (dense ? theme.vars.palette.background.default : 'background.neutral'),
        mt: dense ? 0.5 : 1.5,
      }}
    >
      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0.5 }}>
        Organization
      </Typography>

      <Stack spacing={0.75} sx={{ mt: 1 }}>
        {entries.map(({ label, value }) => (
          <Stack key={label} direction="row" spacing={0.75} sx={{ alignItems: 'baseline' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 90 }}>
              {label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
