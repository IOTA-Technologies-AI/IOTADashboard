import { CONFIG } from 'src/global-config';

import { JobCreateView } from 'src/sections/job/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Create a new job` };

export default function Page() {
  return <JobCreateView />;
}
