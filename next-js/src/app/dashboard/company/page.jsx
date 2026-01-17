import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { CompanyPerformanceView } from 'src/sections/company/company-performance-view';

export const metadata = { title: `Company Performance` };

export default function Page() {
  return (
    <DashboardContent maxWidth="xl">
      <CompanyPerformanceView />
    </DashboardContent>
  );
}
