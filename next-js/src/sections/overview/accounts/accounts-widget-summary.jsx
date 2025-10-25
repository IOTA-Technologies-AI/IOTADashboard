import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

export function AccountsWidgetSummary({ title, total, percent, icon }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box>{icon}</Box>
        <Box>
          <Typography variant="subtitle2">{title}</Typography>
          <Typography variant="h5">{total}</Typography>
          <Typography variant="caption" color={percent > 0 ? 'success.main' : 'error.main'}>
            {percent > 0 ? '+' : ''}{percent}%
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default AccountsWidgetSummary;
