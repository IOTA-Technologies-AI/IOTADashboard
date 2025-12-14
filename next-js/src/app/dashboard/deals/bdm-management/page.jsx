import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

export const metadata = { title: `BDM Management | Dashboard - ${CONFIG.appName}` };

export default async function Page() {
  redirect(paths.dashboard.bdm.root);
}
