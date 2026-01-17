// /Users/jaffar/Desktop/Desktop - Jaffar's MacBook Pro 14/IOTA Git/IOTA Dashboard/next-js/src/app/dashboard/finance/page.jsx

import { CONFIG } from 'src/global-config';

import { OverviewFinanceView } from 'src/sections/overview/finance/view/overview-finance-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Finance` };

export default function Page() {
  return <OverviewFinanceView />;
}
