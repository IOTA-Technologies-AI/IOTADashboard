import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/**
 * Who the candidate is, for IOTA's own screens: the full name and email from
 * the original resume, so two candidates who share a first name ("John" and
 * "John") can be told apart. The formatted resume and client share links
 * carry only `displayName`; the tooltip says so.
 */
export function CandidateIdentity({ resume, variant = 'subtitle2' }) {
  const fullName = resume?.candidateFullName?.trim();
  const email = resume?.candidateEmail?.trim();

  return (
    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
      <Tooltip
        title={
          fullName
            ? `Internal only — printed and shared as "${resume.displayName}"`
            : 'The full name was not found on this resume'
        }
        placement="top-start"
      >
        <Typography variant={variant} noWrap sx={{ width: 'fit-content', maxWidth: 1 }}>
          {fullName || resume?.displayName}
        </Typography>
      </Tooltip>
      {email ? (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Iconify
            icon="solar:letter-bold"
            width={14}
            sx={{ color: 'text.disabled', flexShrink: 0 }}
          />
          <Typography variant="caption" color="text.secondary" noWrap>
            {email}
          </Typography>
        </Stack>
      ) : null}
    </Stack>
  );
}
