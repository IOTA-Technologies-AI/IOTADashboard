import { redirect } from 'next/navigation';

import { CONFIG } from 'src/global-config';
import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

export const metadata = { title: `BDM Management | Dashboard - ${CONFIG.appName}` };

export default async function Page() {
  redirect(paths.dashboard.bdm.root);
}
