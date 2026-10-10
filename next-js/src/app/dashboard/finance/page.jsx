import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

// The template's finance overview (sample figures) was removed; the home
// dashboard shows IOTA's real finance figures. This opens Payments.
export default function Page() {
  redirect(paths.dashboard.finance.payments.root);
}
