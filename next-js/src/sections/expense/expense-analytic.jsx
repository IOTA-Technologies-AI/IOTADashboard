import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { fNumber, fShortenNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function ExpenseAnalytic({ title, total, icon, color, percent, price }) {
  return (
    <Box
      sx={{
        p: { xs: 2.5, md: 3 },
        width: 1,
        gap: 2.5,
        minWidth: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Iconify icon={icon} width={32} sx={{ color, position: 'absolute' }} />

        <CircularProgress
          size={56}
          thickness={2}
          value={percent}
          variant="determinate"
          sx={{ color, opacity: 0.48 }}
        />

        <CircularProgress
          size={56}
          value={100}
          thickness={3}
          variant="determinate"
          sx={[
            (theme) => ({
              top: 0,
              left: 0,
              opacity: 0.48,
              position: 'absolute',
              color: varAlpha(theme.vars.palette.grey['500Channel'], 0.16),
            }),
          ]}
        />
      </Box>

      <Box sx={{ gap: 0.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2">{title}</Typography>

        <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center', typography: 'body2' }}>
          {fShortenNumber(total)}
          <Box component="span" sx={{ color: 'text.secondary' }}>
            expenses
          </Box>
        </Box>

        <Typography variant="subtitle2">{`SAR ${fNumber(price)}`}</Typography>
      </Box>
    </Box>
  );
}
