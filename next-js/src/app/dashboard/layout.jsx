import * as Sentry from '@sentry/nextjs';

import { CONFIG } from 'src/global-config';
import { DashboardLayout } from 'src/layouts/dashboard';

import { AuthGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Layout({ children }) {
  if (CONFIG.auth.skip) {
    Sentry.logger.info('User triggered test log', { log_source: 'sentry_test' });
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  return (
    <AuthGuard>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthGuard>
  );
}
