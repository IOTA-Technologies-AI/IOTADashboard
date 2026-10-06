import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

// "HR" is a group in the navigation and the first crumb on every HR page, so
// the address needs somewhere to land. The employee list is the HR home.
export default function Page() {
  redirect(paths.dashboard.hr.employee.root);
}
