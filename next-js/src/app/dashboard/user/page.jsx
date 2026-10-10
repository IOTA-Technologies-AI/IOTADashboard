import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

// The template's sample profile page was removed; users are managed in the list.
export default function Page() {
  redirect(paths.dashboard.user.list);
}
