import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

function MockChart({ chart }) {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {chart?.categories?.join(', ')}
      </Typography>
      <Box>
        {chart?.series?.map((s, i) => (
          <Typography key={i} variant="body2">
            Data: {s.data.join(', ')}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

export function AccountsTotalIncomes({ title = 'Total Incomes', total, percent, chart }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardContent>
        <Typography variant="h4">{total}</Typography>
        <Typography variant="body2" color={percent > 0 ? 'success.main' : 'error.main'}>
          {percent > 0 ? '+' : ''}{percent}% from last period
        </Typography>
        <MockChart chart={chart} />
      </CardContent>
    </Card>
  );
}

export default AccountsTotalIncomes;
