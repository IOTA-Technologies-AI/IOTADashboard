import Card from '@mui/material/Card';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import ListItemText from '@mui/material/ListItemText';

export function AccountsCustomerReviews({ title = 'Customer Reviews', subheader, list = [] }) {
  return (
    <Card>
      <CardHeader title={title} subheader={subheader} />
      <CardContent>
        <List>
          {list.length === 0 && (
            <ListItem>
              <ListItemText primary="No reviews yet." />
            </ListItem>
          )}
          {list.map((review, idx) => (
            <ListItem key={idx} alignItems="flex-start">
              <ListItemText
                primary={review.name || `User ${idx + 1}`}
                secondary={review.comment || 'No comment.'}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}

export default AccountsCustomerReviews;
