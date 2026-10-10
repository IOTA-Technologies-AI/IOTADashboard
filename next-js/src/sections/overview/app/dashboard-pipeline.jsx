import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STAGE_LABEL = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};
const STAGE_COLOR = {
  lead: 'grey.500',
  qualified: 'info.main',
  proposal: 'primary.main',
  negotiation: 'warning.main',
  won: 'success.main',
  lost: 'error.main',
};

/** Open pipeline value and deals by stage, in SAR. */
export function DashboardPipeline({ sales, sx }) {
  const stages = sales?.byStage ?? [];
  const maxCount = Math.max(1, ...stages.map((s) => s.count));
  return (
    <Card sx={sx}>
      <CardHeader title="Sales pipeline" subheader={`${sales?.openDeals ?? 0} open deals`} />
      <Stack
        direction="row"
        divider={<Divider orientation="vertical" flexItem />}
        sx={{ px: 3, pt: 2 }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Open pipeline
          </Typography>
          <Typography variant="h5">SAR {fNumber(sales?.openPipeline ?? 0)}</Typography>
        </Box>
        <Box sx={{ flex: 1, pl: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Weighted by probability
          </Typography>
          <Typography variant="h5">SAR {fNumber(sales?.weightedPipeline ?? 0)}</Typography>
        </Box>
      </Stack>
      <Stack spacing={1.25} sx={{ p: 3 }}>
        {stages.map((s) => (
          <Stack key={s.stage} direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="body2" sx={{ width: 96, flexShrink: 0 }}>
              {STAGE_LABEL[s.stage] || s.stage}
            </Typography>
            <Box sx={{ flexGrow: 1, height: 10, borderRadius: 1, bgcolor: 'background.neutral' }}>
              <Box
                sx={{
                  height: 1,
                  borderRadius: 1,
                  width: `${(s.count / maxCount) * 100}%`,
                  bgcolor: STAGE_COLOR[s.stage] || 'primary.main',
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ width: 28, textAlign: 'right' }}>
              {s.count}
            </Typography>
          </Stack>
        ))}
      </Stack>
      <Button
        component={RouterLink}
        href={paths.dashboard.sales.pipeline}
        size="small"
        color="inherit"
        endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ ml: -0.5 }} />}
        sx={{ mx: 2, mb: 2, float: 'right' }}
      >
        Open pipeline
      </Button>
    </Card>
  );
}
