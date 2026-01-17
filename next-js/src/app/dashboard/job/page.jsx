import { CONFIG } from 'src/global-config';

import { JobListView } from 'src/sections/job/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Jobs` };

export default function Page() {
  return <JobListView />;
}
