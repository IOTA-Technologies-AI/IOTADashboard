import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

export function AccountsCheckInWidgets({ chart, sx }) {
  return (
    <Card sx={sx}>
      <CardHeader title="Check-in Status" />
      <CardContent>
        {chart?.series?.map((item, idx) => (
          <Box key={idx} sx={{ mb: 1 }}>
            <Typography variant="subtitle2">{item.label}</Typography>
            <Typography variant="body2">
              {item.percent}% ({item.total})
            </Typography>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}

export default AccountsCheckInWidgets;
