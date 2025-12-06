import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import { Iconify } from 'src/components/iconify';

export function DealTableFiltersResult({ filters, totalResults, onResetPage, sx }) {
  const handleRemoveStatus = () => {
    onResetPage();
    filters.setState({ status: 'all' });
  };

  const handleRemoveRegion = () => {
    onResetPage();
    filters.setState({ region: 'all' });
  };

  const handleReset = () => {
    onResetPage();
    filters.onResetState();
  };

  return (
    <Stack spacing={1.5} sx={{ ...sx }}>
      <Box sx={{ typography: 'body2' }}>
        <strong>{totalResults}</strong>
        <Box component="span" sx={{ color: 'text.secondary', ml: 0.25 }}>
          results found
        </Box>
      </Box>

      <Stack flexGrow={1} spacing={1} direction="row" flexWrap="wrap" alignItems="center">
        {filters.state.status !== 'all' && (
          <Block label="Status:">
            <Chip size="small" label={filters.state.status} onDelete={handleRemoveStatus} />
          </Block>
        )}

        {filters.state.region !== 'all' && (
          <Block label="Region:">
            <Chip size="small" label={filters.state.region} onDelete={handleRemoveRegion} />
          </Block>
        )}

        <Button
          color="error"
          onClick={handleReset}
          startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
        >
          Clear
        </Button>
      </Stack>
    </Stack>
  );
}

function Block({ label, children, sx, ...other }) {
  return (
    <Stack
      component={Paper}
      variant="outlined"
      spacing={1}
      direction="row"
      sx={{ p: 1, borderRadius: 1, overflow: 'hidden', borderStyle: 'dashed', ...sx }}
      {...other}
    >
      <Box component="span" sx={{ typography: 'subtitle2' }}>
        {label}
      </Box>

      <Stack spacing={1} direction="row" flexWrap="wrap">
        {children}
      </Stack>
    </Stack>
  );
}
