import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { fToNow } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const ACTION_ICON = {
  sign_nda: 'solar:pen-bold',
  sign_offer: 'solar:pen-bold',
  approve_offer: 'solar:check-circle-bold',
  decide_nda_exception: 'solar:shield-check-bold',
  decide_vetting: 'solar:user-id-bold',
};

/** What is waiting for the signed-in user — signatures and decisions. */
export function DashboardActions({ actions = [], sx }) {
  return (
    <Card sx={sx}>
      <CardHeader
        title="Waiting for you"
        subheader={
          actions.length ? `${actions.length} item${actions.length === 1 ? '' : 's'}` : 'All clear'
        }
      />
      <Stack spacing={0.5} sx={{ p: 2 }}>
        {actions.length ? (
          actions.slice(0, 8).map((a) => (
            <Stack
              key={`${a.kind}-${a.href}`}
              component={RouterLink}
              href={a.href}
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{
                p: 1.25,
                borderRadius: 1,
                color: 'inherit',
                textDecoration: 'none',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Iconify
                icon={ACTION_ICON[a.kind] || 'solar:bell-bing-bold'}
                sx={{ color: 'primary.main' }}
              />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap>
                  {a.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {a.detail}
                  {a.since ? ` · ${fToNow(a.since)}` : ''}
                </Typography>
              </Box>
            </Stack>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1, pb: 1 }}>
            Nothing needs your signature or decision right now.
          </Typography>
        )}
      </Stack>
    </Card>
  );
}
