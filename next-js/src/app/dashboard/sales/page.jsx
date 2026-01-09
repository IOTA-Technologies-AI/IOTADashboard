import { redirect } from 'next/navigation';

import { CONFIG } from 'src/global-config';

import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

export const metadata = { title: `Sales | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  redirect(paths.dashboard.todo);
  return null;
}
