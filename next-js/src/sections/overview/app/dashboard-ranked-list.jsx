import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { fNumber } from 'src/utils/format-number';

// ----------------------------------------------------------------------

/**
 * A short ranked list with a bar per row relative to the top value, e.g. top
 * customers by billing. `items`: [{ key, label, secondary, value }].
 */
export function DashboardRankedList({ title, subheader, items = [], unit = 'SAR', empty, sx }) {
  const max = Math.max(1, ...items.map((i) => i.value || 0));
  return (
    <Card sx={sx}>
      <CardHeader title={title} subheader={subheader} />
      <Stack spacing={2.5} sx={{ p: 3 }}>
        {items.length ? (
          items.map((item, idx) => (
            <Box key={item.key ?? item.label}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
                spacing={1}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>
                    {idx + 1}. {item.label}
                  </Typography>
                  {item.secondary ? (
                    <Typography variant="caption" color="text.secondary">
                      {item.secondary}
                    </Typography>
                  ) : null}
                </Box>
                <Typography variant="subtitle2" sx={{ flexShrink: 0 }}>
                  {unit ? `${unit} ` : ''}
                  {fNumber(item.value)}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={((item.value || 0) / max) * 100}
                sx={{ mt: 0.75, height: 6, borderRadius: 1 }}
              />
            </Box>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            {empty || 'Nothing to show yet.'}
          </Typography>
        )}
      </Stack>
    </Card>
  );
}
