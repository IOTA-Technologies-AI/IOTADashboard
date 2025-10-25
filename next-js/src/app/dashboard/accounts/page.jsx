'use client';

import Container from '@mui/material/Container';

import OverviewAccountsView from 'src/sections/overview/accounts/view/overview-accounts-view';

export default function AccountsPage() {
  return (
    <Container maxWidth="xl" sx={{ mt: 3 }}>
      <OverviewAccountsView />
    </Container>
  );
}