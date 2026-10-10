import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

// IOTA ERP is an internal app: the root opens the dashboard, and the
// dashboard's AuthGuard sends anyone not signed in to sign-in.
export default function Page() {
  redirect(paths.dashboard.root);
}
