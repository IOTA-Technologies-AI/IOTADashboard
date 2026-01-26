'use client';

import Container from '@mui/material/Container';

import { PageGuard } from 'src/auth/guard';
import OverviewAccountsView from 'src/sections/overview/accounts/view/overview-accounts-view';

export default function AccountsListWrapper() {
  return (
    <PageGuard>
      <Container maxWidth="xl" sx={{ mt: 3 }}>
        <OverviewAccountsView />
      </Container>
    </PageGuard>
  );
}
