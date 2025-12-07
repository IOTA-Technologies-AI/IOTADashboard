import PropTypes from 'prop-types';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';

export function BDMCard({ bdm }) {
  return (
    <Card
      component={RouterLink}
      href={paths.dashboard.bdm.details(bdm.id)}
      sx={{ p: 3, height: '100%', textDecoration: 'none' }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar alt={bdm.name} sx={{ width: 48, height: 48 }}>
            {bdm.name?.charAt(0)}
          </Avatar>
          <Stack spacing={0.5}>
            <Typography variant="subtitle1">{bdm.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {bdm.email}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Chip size="small" label={`${bdm.activeDeals || 0} active`} color="info" variant="soft" />
          <Chip size="small" label={`${bdm.dealsCount || 0} deals`} variant="outlined" />
        </Stack>

        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            Pending Commission
          </Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" color="warning.main">
              {fCurrency(bdm.pendingCommission || 0, {
                currency: 'SAR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
            <Label color={bdm.pendingCommission > 0 ? 'warning' : 'success'}>
              {bdm.pendingCommission > 0 ? 'Pending' : 'All Paid'}
            </Label>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}

BDMCard.propTypes = {
  bdm: PropTypes.object,
};
